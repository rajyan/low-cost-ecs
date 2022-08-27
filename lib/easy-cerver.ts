import * as path from "path";
import * as lib from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { FileSystem } from "aws-cdk-lib/aws-efs";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { SfnStateMachine } from "aws-cdk-lib/aws-events-targets";
import { Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { Subscription, SubscriptionProtocol, Topic } from "aws-cdk-lib/aws-sns";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sfn_tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

export type EasyCerverProps = lib.StackProps & {
  hostedZoneDomain: string;
  recordDomainName?: string;
  email: string;
  certbotDockerTag?: string;
  certbotScheduleInterval?: number;
  hostInstanceType?: string;
  hostInstanceSpotPrice?: string;
  awsCliDockerTag?: string;
};

export class EasyCerver extends lib.Stack {
  constructor(scope: Construct, id: string, props: EasyCerverProps) {
    super(scope, id, props);

    const defaultProps = {
      recordDomainName: props.hostedZoneDomain,
      certbotDockerTag: "v1.29.0",
      certbotScheduleInterval: 60,
      hostInstanceType: "t2.micro",
      awsCliDockerTag: "latest",
    };
    const conf: EasyCerverProps & typeof defaultProps = {
      ...defaultProps,
      ...props,
    };

    const logGroup = new LogGroup(this, "LogGroup", {
      retention: RetentionDays.TWO_YEARS,
      removalPolicy: lib.RemovalPolicy.DESTROY,
    });

    /**
     * Vpc, Cluster, Container Host EC2 ASG
     * Container host instance with SSM agent connection enabled
     */
    const vpc = new ec2.Vpc(this, "Vpc", {
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "PublicSubnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: vpc,
      containerInsights: true,
    });

    const hostAutoScalingGroup = cluster.addCapacity("HostInstanceCapacity", {
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(
        ecs.AmiHardwareType.STANDARD,
        {
          cachedInContext: true,
        }
      ),
      instanceType: new ec2.InstanceType(conf.hostInstanceType),
      spotPrice: conf.hostInstanceSpotPrice,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      associatePublicIpAddress: true,
      minCapacity: 1,
      maxCapacity: 1,
    });
    hostAutoScalingGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(80));
    hostAutoScalingGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(443));
    hostAutoScalingGroup.connections.allowFrom(
      ec2.Peer.anyIpv6(),
      ec2.Port.tcp(80)
    );
    hostAutoScalingGroup.connections.allowFrom(
      ec2.Peer.anyIpv6(),
      ec2.Port.tcp(443)
    );

    hostAutoScalingGroup.role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );
    hostAutoScalingGroup.role.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ec2:DescribeAddresses", "ec2:AssociateAddress"],
        resources: ["*"],
      })
    );

    const hostInstanceIp = new ec2.CfnEIP(this, "HostInstanceIp");
    const tagUniqueId = lib.Names.uniqueId(hostInstanceIp);
    hostInstanceIp.tags.setTag("Name", tagUniqueId);

    hostAutoScalingGroup.addUserData(
      "INSTANCE_ID=$(curl --silent http://169.254.169.254/latest/meta-data/instance-id)",
      `ALLOCATION_ID=$(docker run --net=host amazon/aws-cli:${conf.awsCliDockerTag} ec2 describe-addresses --region ${hostAutoScalingGroup.env.region} --filter Name=tag:Name,Values=${tagUniqueId} --query 'Addresses[].AllocationId' --output text | head)`,
      `docker run --net=host amazon/aws-cli:${conf.awsCliDockerTag} ec2 associate-address --region ${hostAutoScalingGroup.env.region} --instance-id "$INSTANCE_ID" --allocation-id "$ALLOCATION_ID" --allow-reassociation`
    );

    const certFileSystem = new FileSystem(this, "FileSystem", {
      vpc: vpc,
      encrypted: true,
      securityGroup: new ec2.SecurityGroup(this, "FileSystemSecurityGroup", {
        vpc: vpc,
        allowAllOutbound: false,
      }),
      removalPolicy: lib.RemovalPolicy.DESTROY,
    });
    certFileSystem.connections.allowDefaultPortTo(hostAutoScalingGroup);
    certFileSystem.connections.allowDefaultPortFrom(hostAutoScalingGroup);

    /**
     * ARecord to Elastic ip
     */
    const hostedZone = HostedZone.fromLookup(this, "HostedZone", {
      domainName: conf.hostedZoneDomain,
    });
    new ARecord(this, "ARecord", {
      zone: hostedZone,
      recordName: conf.recordDomainName,
      deleteExisting: true,
      target: RecordTarget.fromIpAddresses(hostInstanceIp.ref),
    });

    /**
     * Certbot Task Definition
     * Mounts generated certificate to host instance
     */
    const certbotTaskDefinition = new ecs.Ec2TaskDefinition(
      this,
      "CertbotTaskDefinition"
    );
    certbotTaskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["route53:ListHostedZones", "route53:GetChange"],
        resources: ["*"],
      })
    );
    certbotTaskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["route53:ChangeResourceRecordSets"],
        resources: [hostedZone.hostedZoneArn],
      })
    );

    const certbotContainer = certbotTaskDefinition.addContainer(
      "CertbotContainer",
      {
        image: ecs.ContainerImage.fromRegistry(
          `certbot/dns-route53:${conf.certbotDockerTag}`
        ),
        containerName: "certbot",
        memoryReservationMiB: 64,
        command: [
          "certonly",
          "--verbose",
          "--preferred-challenges=dns-01",
          "--dns-route53",
          "--dns-route53-propagation-seconds=300",
          "--non-interactive",
          "--agree-tos",
          "--expand",
          "-m",
          conf.email,
          "-d",
          conf.recordDomainName,
        ],
        logging: ecs.LogDriver.awsLogs({
          logGroup: logGroup,
          streamPrefix: conf.certbotDockerTag,
        }),
      }
    );

    certFileSystem.grant(
      certbotTaskDefinition.taskRole,
      "elasticfilesystem:ClientWrite"
    );
    certbotTaskDefinition.addVolume({
      name: "certVolume",
      efsVolumeConfiguration: {
        fileSystemId: certFileSystem.fileSystemId,
      },
    });
    certbotContainer.addMountPoints({
      sourceVolume: "certVolume",
      containerPath: "/etc/letsencrypt",
      readOnly: false,
    });

    /**
     * Schedule Certbot certificate create/renew on Step Functions
     * Sends email notification on certbot failure
     */
    const topic = new Topic(this, "Topic");
    new Subscription(this, "EmailSubscription", {
      topic: topic,
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: conf.email,
    });

    const certbotRunTask = new sfn_tasks.EcsRunTask(this, "CreateCertificate", {
      cluster: cluster,
      taskDefinition: certbotTaskDefinition,
      launchTarget: new sfn_tasks.EcsEc2LaunchTarget(),
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
    });
    certbotRunTask.addCatch(
      new sfn_tasks.SnsPublish(this, "SendEmailOnFailure", {
        topic: topic,
        message: sfn.TaskInput.fromJsonPathAt("$"),
      }).next(new sfn.Fail(this, "Fail"))
    );
    certbotRunTask.addRetry({
      interval: lib.Duration.seconds(20),
    });
    const certbotStateMachine = new sfn.StateMachine(this, "StateMachine", {
      definition: certbotRunTask,
    });

    new Rule(this, "CertbotScheduleRule", {
      schedule: Schedule.rate(lib.Duration.days(conf.certbotScheduleInterval)),
      targets: [new SfnStateMachine(certbotStateMachine)],
    });

    /**
     * Nginx proxy server task definition
     */
    const nginxTaskDefinition = new ecs.Ec2TaskDefinition(
      this,
      "NginxTaskDefinition"
    );
    const nginxContainer = nginxTaskDefinition.addContainer("NginxContainer", {
      image: ecs.ContainerImage.fromAsset(
        path.join(__dirname, "../containers/nginx-proxy")
      ),
      containerName: "nginx",
      memoryReservationMiB: 64,
      essential: true,
      environment: {
        SERVER_NAME: conf.recordDomainName,
      },
      logging: ecs.LogDrivers.awsLogs({
        logGroup: logGroup,
        streamPrefix: "nginx-proxy",
      }),
    });

    certFileSystem.grant(
      nginxTaskDefinition.taskRole,
      "elasticfilesystem:ClientMount"
    );
    nginxTaskDefinition.addVolume({
      name: "certVolume",
      efsVolumeConfiguration: {
        fileSystemId: certFileSystem.fileSystemId,
      },
    });
    nginxContainer.addMountPoints({
      sourceVolume: "certVolume",
      containerPath: "/etc/letsencrypt",
      readOnly: true,
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
      }
    );

    nginxContainer.addContainerDependencies({
      container: nginxTaskDefinition.addContainer("AwsCliContainer", {
        image: ecs.ContainerImage.fromRegistry(
          `amazon/aws-cli:${conf.awsCliDockerTag}`
        ),
        containerName: "aws-cli",
        memoryReservationMiB: 64,
        entryPoint: ["/bin/bash", "-c"],
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
          streamPrefix: conf.awsCliDockerTag,
        }),
      }),
      condition: ecs.ContainerDependencyCondition.COMPLETE,
    });
    certbotStateMachine.grantExecution(
      nginxTaskDefinition.taskRole,
      "states:DescribeExecution"
    );
    certbotStateMachine.grantStartExecution(nginxTaskDefinition.taskRole);

    new ecs.Ec2Service(this, "nginxService", {
      cluster: cluster,
      taskDefinition: nginxTaskDefinition,
      desiredCount: 1,
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      circuitBreaker: {
        rollback: true,
      },
      enableExecuteCommand: true,
    });
  }
}
