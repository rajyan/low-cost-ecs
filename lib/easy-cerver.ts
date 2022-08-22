import { Construct } from "constructs";
import { Duration, Names, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  AmiHardwareType,
  Cluster,
  ContainerDependencyCondition,
  ContainerImage,
  Ec2Service,
  Ec2TaskDefinition,
  EcsOptimizedImage,
  LogDriver,
  LogDrivers,
  Protocol,
} from "aws-cdk-lib/aws-ecs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  CfnEIP,
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import {
  EcsEc2LaunchTarget,
  EcsRunTask,
  SnsPublish,
} from "aws-cdk-lib/aws-stepfunctions-tasks";
import {
  Fail,
  IntegrationPattern,
  StateMachine,
  TaskInput,
} from "aws-cdk-lib/aws-stepfunctions";
import { Subscription, SubscriptionProtocol, Topic } from "aws-cdk-lib/aws-sns";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { SfnStateMachine } from "aws-cdk-lib/aws-events-targets";
import * as path from "path";
import { FileSystem } from "aws-cdk-lib/aws-efs";

export type EasyCerverProps = StackProps & {
  hostedZoneDomain: string;
  recordDomainName?: string;
  email: string;
  certbotDockerTag?: string;
  certbotScheduleInterval?: number;
  hostInstanceType?: string;
  hostInstanceSpotPrice?: string;
  awsCliDockerTag?: string;
};

export class EasyCerver extends Stack {
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

    /**
     * Vpc, Cluster, Container Host EC2 ASG
     * Container host instance with SSM agent connection enabled
     */
    const vpc = new Vpc(this, "Vpc", { natGateways: 0 });

    const cluster = new Cluster(this, "Cluster", {
      vpc: vpc,
      executeCommandConfiguration: {},
      containerInsights: true,
    });

    const hostAutoScalingGroup = cluster.addCapacity("HostInstanceCapacity", {
      machineImage: EcsOptimizedImage.amazonLinux2(AmiHardwareType.STANDARD, {
        cachedInContext: true,
      }),
      instanceType: new InstanceType(conf.hostInstanceType),
      spotPrice: conf.hostInstanceSpotPrice,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      associatePublicIpAddress: true,
      minCapacity: 1,
      maxCapacity: 1,
    });
    hostAutoScalingGroup.connections.allowFromAnyIpv4(Port.tcp(80));
    hostAutoScalingGroup.connections.allowFromAnyIpv4(Port.tcp(443));
    hostAutoScalingGroup.connections.allowFrom(Peer.anyIpv6(), Port.tcp(80));
    hostAutoScalingGroup.connections.allowFrom(Peer.anyIpv6(), Port.tcp(443));

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

    const hostInstanceIp = new CfnEIP(this, "HostInstanceIp");
    const tagUniqueId = Names.uniqueId(hostInstanceIp);
    hostInstanceIp.tags.setTag("Name", tagUniqueId);

    hostAutoScalingGroup.addUserData(
      "INSTANCE_ID=$(curl --silent http://169.254.169.254/latest/meta-data/instance-id)",
      `ALLOCATION_ID=$(docker run amazon/aws-cli:${conf.awsCliDockerTag} ec2 describe-addresses --filter Name=tag:Name,Values=${tagUniqueId} --query 'Addresses[].AllocationId' --output text | head)`,
      `docker run amazon/aws-cli:${conf.awsCliDockerTag} ec2 associate-address --instance-id "$INSTANCE_ID" --allocation-id "$ALLOCATION_ID" --allow-reassociation`
    );

    const certificateFileSystem = new FileSystem(this, "FileSystem", {
      vpc: vpc,
      encrypted: true,
      securityGroup: new SecurityGroup(this, "FileSystemSecurityGroup", {
        vpc: vpc,
        allowAllOutbound: false,
      }),
      removalPolicy: RemovalPolicy.DESTROY,
    });
    certificateFileSystem.connections.allowDefaultPortTo(hostAutoScalingGroup);
    certificateFileSystem.connections.allowDefaultPortFrom(
      hostAutoScalingGroup
    );

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
    const certbotTaskDefinition = new Ec2TaskDefinition(
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
        image: ContainerImage.fromRegistry(
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
        logging: LogDriver.awsLogs({
          streamPrefix: conf.certbotDockerTag,
          logRetention: RetentionDays.TWO_YEARS,
        }),
      }
    );

    certificateFileSystem.grant(
      certbotTaskDefinition.taskRole,
      "elasticfilesystem:ClientWrite"
    );
    certbotTaskDefinition.addVolume({
      name: "certVolume",
      efsVolumeConfiguration: {
        fileSystemId: certificateFileSystem.fileSystemId,
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

    const certbotRunTask = new EcsRunTask(this, "CreateCertificate", {
      cluster: cluster,
      taskDefinition: certbotTaskDefinition,
      launchTarget: new EcsEc2LaunchTarget(),
      integrationPattern: IntegrationPattern.RUN_JOB,
    });
    certbotRunTask.addCatch(
      new SnsPublish(this, "SendEmailOnFailure", {
        topic: topic,
        message: TaskInput.fromJsonPathAt("$"),
      }).next(new Fail(this, "Fail"))
    );
    certbotRunTask.addRetry({
      interval: Duration.seconds(20),
    });
    const certbotStateMachine = new StateMachine(this, "StateMachine", {
      definition: certbotRunTask,
    });

    new Rule(this, "CertbotScheduleRule", {
      schedule: Schedule.rate(Duration.days(conf.certbotScheduleInterval)),
      targets: [new SfnStateMachine(certbotStateMachine)],
    });

    /**
     * Nginx proxy server task definition
     */
    const nginxTaskDefinition = new Ec2TaskDefinition(
      this,
      "NginxTaskDefinition"
    );
    const nginxContainer = nginxTaskDefinition.addContainer("NginxContainer", {
      image: ContainerImage.fromAsset(
        path.join(__dirname, "../containers/nginx-proxy")
      ),
      containerName: "nginx",
      memoryReservationMiB: 64,
      essential: true,
      environment: {
        SERVER_NAME: conf.recordDomainName,
      },
      logging: LogDrivers.awsLogs({
        streamPrefix: "nginx-proxy",
        logRetention: RetentionDays.TWO_YEARS,
      }),
    });

    certificateFileSystem.grant(
      nginxTaskDefinition.taskRole,
      "elasticfilesystem:ClientMount"
    );
    nginxTaskDefinition.addVolume({
      name: "certVolume",
      efsVolumeConfiguration: {
        fileSystemId: certificateFileSystem.fileSystemId,
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
        protocol: Protocol.TCP,
      },
      {
        hostPort: 443,
        containerPort: 443,
        protocol: Protocol.TCP,
      }
    );

    nginxContainer.addContainerDependencies({
      container: nginxTaskDefinition.addContainer("AwsCliContainer", {
        image: ContainerImage.fromRegistry(
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
        logging: LogDriver.awsLogs({
          streamPrefix: conf.awsCliDockerTag,
          logRetention: RetentionDays.TWO_YEARS,
        }),
      }),
      condition: ContainerDependencyCondition.COMPLETE,
    });
    certbotStateMachine.grantExecution(
      nginxTaskDefinition.taskRole,
      "states:DescribeExecution"
    );
    certbotStateMachine.grantStartExecution(nginxTaskDefinition.taskRole);

    new Ec2Service(this, "nginxService", {
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
