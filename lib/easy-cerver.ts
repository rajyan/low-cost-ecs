import { Construct } from "constructs";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  Cluster,
  ContainerImage,
  Ec2Service,
  Ec2TaskDefinition,
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
import { HostedZone } from "aws-cdk-lib/aws-route53";
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

export type EasyCerverProps = StackProps & {
  hostedZoneDomain: string;
  email: string;
  certificateDomains?: string[];
  certbotDockerTag?: string;
  certbotScheduleInterval?: number;
  hostInstanceType?: string;
  hostInstanceSpotPrice?: string;
};

const defaultProps = {
  certbotDockerTag: "v1.29.0",
  certbotScheduleInterval: 60,
  hostInstanceType: "t2.micro",
  hostInstanceSpotPrice: "0.0050",
};

export class EasyCerver extends Stack {
  constructor(scope: Construct, id: string, props: EasyCerverProps) {
    super(scope, id, props);

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
    });

    const hostAutoScalingGroup = cluster.addCapacity("HostInstanceCapacity", {
      instanceType: new InstanceType(conf.hostInstanceType),
      spotPrice: conf.hostInstanceSpotPrice,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      associatePublicIpAddress: true,
      minCapacity: 1,
      maxCapacity: 1,
    });
    const tcpSecurityGroup = new SecurityGroup(this, "HostSecurityGroup", {
      vpc: vpc,
    });
    tcpSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
    tcpSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(80));
    tcpSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
    tcpSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(443));
    hostAutoScalingGroup.addSecurityGroup(tcpSecurityGroup);
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
    const hostInstanceIp = new CfnEIP(this, "HostInstanceIp", {
      tags: [
        {
          key: "Name",
          value: "easy-cerver-ip",
        },
      ],
    });
    hostAutoScalingGroup.addUserData(
      ...`
        yum install -y unzip jq
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        ./aws/install
        INSTANCE_ID=$(curl --silent http://169.254.169.254/latest/meta-data/instance-id)
        ALLOCATION_ID=$(aws ec2 describe-addresses --filter Name=tag:Name,Values=easy-cerver-ip \\
          | grep AllocationId \\
          | sed -E 's/\\s+"AllocationId":\\s+"(.+)",/\\1/' \\
          | head
        )
        aws ec2 associate-address --instance-id "$INSTANCE_ID" --allocation-id "$ALLOCATION_ID" --allow-reassociation
        `.split("\n")
    );

    /**
     * Certbot Task Definition
     * Mounts generated certificate to host instance
     */
    const hostedZone = HostedZone.fromLookup(this, "HostedZone", {
      domainName: conf.hostedZoneDomain,
    });

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
          ...(
            conf.certificateDomains ?? [
              conf.hostedZoneDomain,
              `*.${conf.hostedZoneDomain}`,
            ]
          ).flatMap((domain) => ["-d", domain]),
        ],
        logging: LogDriver.awsLogs({
          streamPrefix: conf.certbotDockerTag,
          logRetention: RetentionDays.TWO_YEARS,
        }),
      }
    );

    certbotTaskDefinition.addVolume({
      host: { sourcePath: "/etc/letsencrypt" },
      name: "certVolume",
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
        SERVER_NAME: hostedZone.zoneName,
      },
      logging: LogDrivers.awsLogs({
        streamPrefix: "nginx-proxy",
        logRetention: RetentionDays.TWO_YEARS,
      }),
    });

    nginxTaskDefinition.addVolume({
      host: { sourcePath: "/etc/letsencrypt" },
      name: "certVolume",
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
