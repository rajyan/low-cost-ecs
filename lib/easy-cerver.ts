import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import { Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  Cluster,
  ContainerImage,
  Ec2TaskDefinition,
  LogDriver,
} from "aws-cdk-lib/aws-ecs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { HostedZone } from "aws-cdk-lib/aws-route53";

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
    hostAutoScalingGroup.role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );
    const tcpSecurityGroup = new SecurityGroup(this, "HostSecurityGroup", {
      vpc: vpc,
    });
    tcpSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
    tcpSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(80));
    tcpSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
    tcpSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(443));
    hostAutoScalingGroup.addSecurityGroup(tcpSecurityGroup);

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
  }
}
