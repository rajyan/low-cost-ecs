import * as path from 'path';
import * as lib from 'aws-cdk-lib';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { FileSystem } from 'aws-cdk-lib/aws-efs';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { Effect, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { ILogGroup, LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Subscription, SubscriptionProtocol, Topic } from 'aws-cdk-lib/aws-sns';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfn_tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export interface LowCostECSProps extends lib.StackProps {
  /**
   * Domain name of the hosted zone.
   */
  readonly hostedZoneDomain: string;

  /**
   * Email for expiration emails to register to your let's encrypt account.
   *
   * @link https://letsencrypt.org/docs/expiration-emails/
   *
   * Also registered as a subscriber of the sns topic, notified on certbot task failure.
   * Subscription confirmation email would be sent on stack creation.
   *
   * @link https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html
   */
  readonly email: string;

  /**
   * Domain names for A records to elastic ip of ECS host instance.
   *
   * @default - [ props.hostedZone.zoneName ]
   */
  readonly recordDomainNames?: string[];

  /**
   * Vpc of the ECS host instance and cluster.
   *
   * @default - Creates vpc with only public subnets and no NAT gateways.
   */
  readonly vpc?: ec2.IVpc;

  /**
   * Security group of the ECS host instance
   *
   * @default - Creates security group with allowAllOutbound and ingress rule (ipv4, ipv6) => (tcp 80, 443).
   */
  readonly securityGroup?: ec2.ISecurityGroup;

  /**
   * Instance type of the ECS host instance.
   *
   * @default - t2.micro
   */
  readonly hostInstanceType?: string;

  /**
   * The maximum hourly price (in USD) to be paid for any Spot Instance launched to fulfill the request.
   * Host instance asg would use spot instances if hostInstanceSpotPrice is set.
   *
   * @link https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.AddCapacityOptions.html#spotprice
   * @default - undefined
   */
  readonly hostInstanceSpotPrice?: string;

  /**
   * Log group of the certbot task and the aws-cli task.
   *
   * @default - Creates default cdk log group
   */
  readonly logGroup?: ILogGroup;

  /**
   * Docker image tag of certbot/dns-route53 to create certificates.
   *
   * @link https://hub.docker.com/r/certbot/dns-route53/tags
   * @default - v1.29.0
   */
  readonly certbotDockerTag?: string;

  /**
   * Certbot task schedule interval in days to renew the certificate.
   *
   * @default - 60
   */
  readonly certbotScheduleInterval?: number;

  /**
   * Docker image tag of amazon/aws-cli.
   * This image is used to associate elastic ip on host instance startup, and run certbot cfn on ecs container startup.
   *
   * @default - latest
   */
  readonly awsCliDockerTag?: string;

  /**
   * Enable container insights or not
   *
   * @default - undefined (container insights disabled)
   */
  readonly containerInsights?: boolean;

  /**
   * Removal policy for the file system and log group (if using default).
   *
   * @default - RemovalPolicy.DESTROY
   */
  readonly removalPolicy?: lib.RemovalPolicy;

  /**
   * Task definition for the server ecs task.
   *
   * @default - Nginx server task definition defined in createSampleTaskDefinition()
   */
  readonly serverTaskDefinition?: TaskDefinitionOptions;
}

interface TaskDefinitionOptions extends lib.StackProps {
  taskDefinition?: ecs.Ec2TaskDefinitionProps;
  containers: (ecs.ContainerDefinitionOptions & {
    containerName: string;
    portMappings?: ecs.PortMapping[];
    mountPoints?: ecs.MountPoint[];
  })[];
  volumes?: ecs.Volume[];
}

export class LowCostECS extends lib.Stack {
  readonly vpc: ec2.IVpc;
  readonly hostAutoScalingGroup: AutoScalingGroup;
  readonly certFileSystem: FileSystem;
  readonly cluster: ecs.Cluster;
  readonly service: ecs.Ec2Service;

  constructor(scope: Construct, id: string, props: LowCostECSProps) {
    super(scope, id, props);

    this.vpc =
      props.vpc ??
      new ec2.Vpc(this, 'Vpc', {
        natGateways: 0,
        subnetConfiguration: [
          {
            name: 'PublicSubnet',
            subnetType: ec2.SubnetType.PUBLIC,
          },
        ],
      });

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: this.vpc,
      containerInsights: props.containerInsights,
    });

    this.hostAutoScalingGroup = this.cluster.addCapacity('HostInstanceCapacity', {
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(
        ecs.AmiHardwareType.STANDARD,
        {
          cachedInContext: true,
        },
      ),
      instanceType: new ec2.InstanceType(props.hostInstanceType ?? 't2.micro'),
      spotPrice: props.hostInstanceSpotPrice,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      associatePublicIpAddress: true,
      minCapacity: 1,
      maxCapacity: 1,
    });

    if (props.securityGroup) {
      this.hostAutoScalingGroup.addSecurityGroup(props.securityGroup);
    } else {
      this.hostAutoScalingGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(80));
      this.hostAutoScalingGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(443));
      this.hostAutoScalingGroup.connections.allowFrom(
        ec2.Peer.anyIpv6(),
        ec2.Port.tcp(80),
      );
      this.hostAutoScalingGroup.connections.allowFrom(
        ec2.Peer.anyIpv6(),
        ec2.Port.tcp(443),
      );
    }

    /**
     * Add managed policy to allow ssh through ssm manager
     */
    this.hostAutoScalingGroup.role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
    );
    /**
     * Add policy to associate elastic ip on startup
     */
    this.hostAutoScalingGroup.role.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ec2:DescribeAddresses', 'ec2:AssociateAddress'],
        resources: ['*'],
      }),
    );

    const hostInstanceIp = new ec2.CfnEIP(this, 'HostInstanceIp');
    const tagUniqueId = lib.Names.uniqueId(hostInstanceIp);
    hostInstanceIp.tags.setTag('Name', tagUniqueId);

    const awsCliTag = props.awsCliDockerTag ?? 'latest';
    this.hostAutoScalingGroup.addUserData(
      'INSTANCE_ID=$(curl --silent http://169.254.169.254/latest/meta-data/instance-id)',
      `ALLOCATION_ID=$(docker run --net=host amazon/aws-cli:${awsCliTag} ec2 describe-addresses --region ${this.hostAutoScalingGroup.env.region} --filter Name=tag:Name,Values=${tagUniqueId} --query 'Addresses[].AllocationId' --output text | head)`,
      `docker run --net=host amazon/aws-cli:${awsCliTag} ec2 associate-address --region ${this.hostAutoScalingGroup.env.region} --instance-id "$INSTANCE_ID" --allocation-id "$ALLOCATION_ID" --allow-reassociation`,
    );

    this.certFileSystem = new FileSystem(this, 'FileSystem', {
      vpc: this.vpc,
      encrypted: true,
      securityGroup: new ec2.SecurityGroup(this, 'FileSystemSecurityGroup', {
        vpc: this.vpc,
        allowAllOutbound: false,
      }),
      removalPolicy: props.removalPolicy ?? lib.RemovalPolicy.DESTROY,
    });
    this.certFileSystem.connections.allowDefaultPortTo(this.hostAutoScalingGroup);
    this.certFileSystem.connections.allowDefaultPortFrom(this.hostAutoScalingGroup);

    /**
     * ARecord to Elastic ip
     */
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.hostedZoneDomain,
    });
    const records = props.recordDomainNames ?? [hostedZone.zoneName];
    records.forEach(
      (record) =>
        new route53.ARecord(this, `ARecord${record}`, {
          zone: hostedZone,
          recordName: record,
          target: route53.RecordTarget.fromIpAddresses(hostInstanceIp.ref),
        }),
    );

    /**
     * Certbot Task Definition
     * Mounts generated certificate to EFS
     */
    const logGroup =
      props.logGroup ??
      new LogGroup(this, 'LogGroup', {
        retention: RetentionDays.TWO_YEARS,
        removalPolicy: props.removalPolicy ?? lib.RemovalPolicy.DESTROY,
      });

    const certbotTaskDefinition = new ecs.Ec2TaskDefinition(
      this,
      'CertbotTaskDefinition',
    );
    certbotTaskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['route53:ListHostedZones', 'route53:GetChange'],
        resources: ['*'],
      }),
    );
    certbotTaskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['route53:ChangeResourceRecordSets'],
        resources: [hostedZone.hostedZoneArn],
      }),
    );

    const certbotTag = props.certbotDockerTag ?? 'v1.29.0';
    const certbotContainer = certbotTaskDefinition.addContainer(
      'CertbotContainer',
      {
        image: ecs.ContainerImage.fromRegistry(
          `certbot/dns-route53:${certbotTag}`,
        ),
        containerName: 'certbot',
        memoryReservationMiB: 64,
        command: [
          'certonly',
          '--verbose',
          '--preferred-challenges=dns-01',
          '--dns-route53',
          '--dns-route53-propagation-seconds=300',
          '--non-interactive',
          '--agree-tos',
          '--expand',
          '-m',
          props.email,
          '--cert-name',
          records[0],
          ...records.flatMap((domain) => ['-d', domain]),
        ],
        logging: ecs.LogDriver.awsLogs({
          logGroup,
          streamPrefix: certbotTag,
        }),
      },
    );

    this.certFileSystem.grant(
      certbotTaskDefinition.taskRole,
      'elasticfilesystem:ClientWrite',
    );
    certbotTaskDefinition.addVolume({
      name: 'certVolume',
      efsVolumeConfiguration: {
        fileSystemId: this.certFileSystem.fileSystemId,
      },
    });
    certbotContainer.addMountPoints({
      sourceVolume: 'certVolume',
      containerPath: '/etc/letsencrypt',
      readOnly: false,
    });

    /**
     * Schedule Certbot certificate create/renew on Step Functions
     * Sends email notification on certbot failure
     */
    const topic = new Topic(this, 'Topic');
    new Subscription(this, 'EmailSubscription', {
      topic: topic,
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: props.email,
    });

    const certbotRunTask = new sfn_tasks.EcsRunTask(this, 'CreateCertificate', {
      cluster: this.cluster,
      taskDefinition: certbotTaskDefinition,
      launchTarget: new sfn_tasks.EcsEc2LaunchTarget(),
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
    });
    certbotRunTask.addCatch(
      new sfn_tasks.SnsPublish(this, 'SendEmailOnFailure', {
        topic: topic,
        message: sfn.TaskInput.fromJsonPathAt('$'),
      }).next(new sfn.Fail(this, 'Fail')),
    );
    certbotRunTask.addRetry({
      interval: lib.Duration.seconds(20),
    });
    const certbotStateMachine = new sfn.StateMachine(this, 'StateMachine', {
      definition: certbotRunTask,
    });

    new Rule(this, 'CertbotScheduleRule', {
      schedule: Schedule.rate(
        lib.Duration.days(props.certbotScheduleInterval ?? 60),
      ),
      targets: [new SfnStateMachine(certbotStateMachine)],
    });

    /**
     * Server ECS task
     */
    const serverTaskDefinition = props.serverTaskDefinition
      ? this.createTaskDefinition(props.serverTaskDefinition)
      : this.createSampleTaskDefinition(records, logGroup);

    this.certFileSystem.grant(
      serverTaskDefinition.taskRole,
      'elasticfilesystem:ClientMount',
    );
    serverTaskDefinition.addVolume({
      name: 'certVolume',
      efsVolumeConfiguration: {
        fileSystemId: this.certFileSystem.fileSystemId,
      },
    });
    serverTaskDefinition.defaultContainer?.addMountPoints({
      sourceVolume: 'certVolume',
      containerPath: '/etc/letsencrypt',
      readOnly: true,
    });

    /**
     * AWS cli container to execute certbot sfn before the default container startup.
     */
    serverTaskDefinition.defaultContainer?.addContainerDependencies({
      container: serverTaskDefinition.addContainer('AWSCliContainer', {
        image: ecs.ContainerImage.fromRegistry(`amazon/aws-cli:${awsCliTag}`),
        containerName: 'aws-cli',
        memoryReservationMiB: 64,
        entryPoint: ['/bin/bash', '-c'],
        command: [
          `set -eux
          aws configure set region ${certbotStateMachine.env.region} && \\
          aws configure set output text && \\
          EXECUTION_ARN=$(aws stepfunctions start-execution --state-machine-arn ${certbotStateMachine.stateMachineArn} --query executionArn) && \\
          until [ $(aws stepfunctions describe-execution --execution-arn "$EXECUTION_ARN" --query status) != RUNNING ];
          do
            echo "Waiting for $EXECUTION_ARN"
            sleep 10
          done`,
        ],
        essential: false,
        logging: ecs.LogDriver.awsLogs({
          logGroup: logGroup,
          streamPrefix: awsCliTag,
        }),
      }),
      condition: ecs.ContainerDependencyCondition.COMPLETE,
    });
    certbotStateMachine.grantExecution(
      serverTaskDefinition.taskRole,
      'states:DescribeExecution',
    );
    certbotStateMachine.grantStartExecution(serverTaskDefinition.taskRole);

    this.service = new ecs.Ec2Service(this, 'Service', {
      cluster: this.cluster,
      taskDefinition: serverTaskDefinition,
      desiredCount: 1,
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      circuitBreaker: {
        rollback: true,
      },
      enableExecuteCommand: true,
    });

    new lib.CfnOutput(this, 'PublicIpAddress', { value: hostInstanceIp.ref });
    new lib.CfnOutput(this, 'certbotStateMachineName', { value: certbotStateMachine.stateMachineName });
    new lib.CfnOutput(this, 'ClusterName', { value: this.cluster.clusterName });
    new lib.CfnOutput(this, 'ServiceName', { value: this.service.serviceName });
  }

  private createTaskDefinition(taskDefinitionOptions: TaskDefinitionOptions) : ecs.Ec2TaskDefinition {
    const serverTaskDefinition = new ecs.Ec2TaskDefinition(
      this,
      'ServerTaskDefinition',
      taskDefinitionOptions.taskDefinition,
    );
    taskDefinitionOptions.containers?.forEach((props) => {
      const container = serverTaskDefinition.addContainer(props.containerName, props);
      container.addPortMappings(...(props.portMappings ?? []));
      container.addMountPoints(...(props.mountPoints ?? []));
    });
    taskDefinitionOptions.volumes?.forEach((props) => serverTaskDefinition.addVolume(props));
    return serverTaskDefinition;
  }

  private createSampleTaskDefinition(
    records: string[],
    logGroup: ILogGroup,
  ): ecs.Ec2TaskDefinition {
    const nginxTaskDefinition = new ecs.Ec2TaskDefinition(
      this,
      'NginxTaskDefinition',
    );
    const nginxContainer = nginxTaskDefinition.addContainer('NginxContainer', {
      image: ecs.ContainerImage.fromAsset(
        path.join(__dirname, '../examples/containers/nginx'),
      ),
      containerName: 'nginx',
      memoryReservationMiB: 64,
      essential: true,
      environment: {
        SERVER_NAME: records.join(' '),
        CERT_NAME: records[0],
      },
      logging: ecs.LogDrivers.awsLogs({
        logGroup: logGroup,
        streamPrefix: 'nginx-proxy',
      }),
    });

    nginxContainer.addPortMappings(
      {
        hostPort: 80,
        containerPort: 80,
        protocol: ecs.Protocol.TCP,
      },
      {
        hostPort: 443,
        containerPort: 443,
        protocol: ecs.Protocol.TCP,
      },
    );

    return nginxTaskDefinition;
  }
}
