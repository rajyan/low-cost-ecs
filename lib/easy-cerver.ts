import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { Cluster } from "aws-cdk-lib/aws-ecs";
import {
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";

export type EasyCerverProps = StackProps & {
  hostInstanceType?: string;
  hostInstanceSpotPrice?: string;
};

const defaultProps = {
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
  }
}
