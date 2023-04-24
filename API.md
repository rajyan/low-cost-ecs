[![NPM version](https://img.shields.io/npm/v/low-cost-ecs?color=brightgreen)](https://www.npmjs.com/package/low-cost-ecs)
[![PyPI version](https://img.shields.io/pypi/v/low-cost-ecs?color=brightgreen)](https://pypi.org/project/low-cost-ecs)
[![Release](https://github.com/rajyan/low-cost-ecs/workflows/release/badge.svg)](https://github.com/rajyan/low-cost-ecs/actions/workflows/release.yml)
[<img src="https://constructs.dev/badge?package=low-cost-ecs" width="150">](https://constructs.dev/packages/low-cost-ecs)

# Low-Cost ECS

A CDK construct that provides an easy and [low-cost](#cost) ECS on EC2 server setup without a load balancer.

# Why

ECS may often seem expensive when used for personal development purposes, due to the cost of the load balancer.
The application load balancer is a great service that is easy to set up managed ACM certificates, easy scaling, and has dynamic port mappings..., but it is over-featured for running 1 ECS task.

However, to run an ECS server without a load balancer, you need to associate an Elastic IP to the host instance and install your certificate to your service every time you start up the server.
This construct aims to automate these works and make it easy to deploy resources to run a low-cost ECS server.

# Try it out!

The easiest way to try the construct is to clone this repository and deploy the sample Nginx server.
Edit settings in `examples/minimum.ts` and deploy the cdk construct. [Public hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html) is required.

```
git clone https://github.com/rajyan/low-cost-ecs.git
yarn install
# edit settings in bin/low-cost-ecs.ts
cdk deploy
```

Access the configured `recordDomainNames` and see that the sample Nginx server has been deployed.

# Installation

To use this construct in your cdk stack as a library,

```
npm install low-cost-ecs
```

```ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LowCostECS } from 'low-cost-ecs';

class SampleStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const vpc = { /** Your VPC */ };
        const securityGroup = { /** Your security group */ };
        const serverTaskDefinition = { /** Your task definition */ };

        new LowCostECS(this, 'LowCostECS', {
            hostedZoneDomain: "example.com",
            email: "test@example.com",
            vpc: vpc,
            securityGroup: securityGroup,
            serverTaskDefinition: serverTaskDefinition
        });
    }
}
```

The required fields are `hostedZoneDomain` and `email`.
You can configure your server task definition and other props. Read [`LowCostECSProps` documentation](https://github.com/rajyan/low-cost-ecs/blob/main/API.md#low-cost-ecs.LowCostECSProps) for details.

# Overview

Resources generated in this stack

* Route53 A record
  * Forwarding to host instance Elastic IP
* Certificate State Machine
  * Install and renew certificates to EFS using [certbot-dns-route53](https://certbot-dns-route53.readthedocs.io/en/stable/)
  * Scheduled automated renewal every 60 days
  * Email notification on certbot task failure
* ECS on EC2 host instance
  * ECS-optimized Amazon Linux 2 AMI instance auto-scaling group
  * Automatically associated with Elastic IP on instance initialization
* ECS Service
  * TLS/SSL certificate installation before default container startup
  * Certificate EFS mounted on default container as `/etc/letsencrypt`
* Others
  * VPC with only public subnets (no NAT Gateways to decrease cost)
  * Security groups with minimum inbounds
  * IAM roles with minimum privileges

# Cost

All resources except Route53 HostedZone should be included in [AWS Free Tier](https://docs.aws.amazon.com/whitepapers/latest/how-aws-pricing-works/get-started-with-the-aws-free-tier.html)
***if you are in the 12 Months Free period***.
After your 12 Months Free period, setting [`hostInstanceSpotPrice`](https://github.com/rajyan/low-cost-ecs/blob/main/API.md#low-cost-ecs.LowCostECSProps.property.hostInstanceSpotPrice) to use spot instances is recommended.

* EC2
  * t2.micro 750 instance hours (12 Months Free Tier)
  * 30GB EBS volume (12 Months Free Tier)
* ECS
  * No additional charge because using ECS on EC2
* EFS
  * Usage is very small, it should be free
* Cloud Watch
  * Usage is very small, and it should be included in the free tier
  * Enabling [`containerInsights`](https://github.com/rajyan/low-cost-ecs/blob/main/API.md#low-cost-ecs.LowCostECSProps.property.containerInsights) will charge for custom metrics

# Debugging

* SSM Session Manager

SSM manager is pre-installed in the host instance (by ECS-optimized Amazon Linux 2 AMI) and `AmazonSSMManagedInstanceCore` is added to the host instance role to access and debug in your host instance.

```
aws ssm start-session --target $INSTANCE_ID
```

* ECS Exec

Service ECS Exec is enabled, so execute commands can be used to debug your server task container.

```
aws ecs execute-command \
--cluster $CLUSTER_ID \
--task $TASK_ID \
--container nginx \
--command bash \
--interactive
```

# Limitations

Because the ECS service occupies a host port, only one task can be executed at a time.
The old task must be terminated before the new task launches, and this causes downtime on release.

Also, if you make changes that require recreating the service, you may need to manually terminate the task of the old service.

# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### LowCostECS <a name="LowCostECS" id="low-cost-ecs.LowCostECS"></a>

#### Initializers <a name="Initializers" id="low-cost-ecs.LowCostECS.Initializer"></a>

```typescript
import { LowCostECS } from 'low-cost-ecs'

new LowCostECS(scope: Construct, id: string, props: LowCostECSProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#low-cost-ecs.LowCostECS.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#low-cost-ecs.LowCostECS.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#low-cost-ecs.LowCostECS.Initializer.parameter.props">props</a></code> | <code><a href="#low-cost-ecs.LowCostECSProps">LowCostECSProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="low-cost-ecs.LowCostECS.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="low-cost-ecs.LowCostECS.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="low-cost-ecs.LowCostECS.Initializer.parameter.props"></a>

- *Type:* <a href="#low-cost-ecs.LowCostECSProps">LowCostECSProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#low-cost-ecs.LowCostECS.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="low-cost-ecs.LowCostECS.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#low-cost-ecs.LowCostECS.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="low-cost-ecs.LowCostECS.isConstruct"></a>

```typescript
import { LowCostECS } from 'low-cost-ecs'

LowCostECS.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="low-cost-ecs.LowCostECS.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#low-cost-ecs.LowCostECS.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#low-cost-ecs.LowCostECS.property.certFileSystem">certFileSystem</a></code> | <code>aws-cdk-lib.aws_efs.FileSystem</code> | EFS file system that the SSL/TLS certificates are installed. |
| <code><a href="#low-cost-ecs.LowCostECS.property.cluster">cluster</a></code> | <code>aws-cdk-lib.aws_ecs.Cluster</code> | ECS cluster created in configured VPC. |
| <code><a href="#low-cost-ecs.LowCostECS.property.hostAutoScalingGroup">hostAutoScalingGroup</a></code> | <code>aws-cdk-lib.aws_autoscaling.AutoScalingGroup</code> | ECS on EC2 service host instance autoscaling group. |
| <code><a href="#low-cost-ecs.LowCostECS.property.serverTaskDefinition">serverTaskDefinition</a></code> | <code>aws-cdk-lib.aws_ecs.Ec2TaskDefinition</code> | Server task definition generated from LowCostECSTaskDefinitionOptions. |
| <code><a href="#low-cost-ecs.LowCostECS.property.service">service</a></code> | <code>aws-cdk-lib.aws_ecs.Ec2Service</code> | ECS service of the server with desiredCount: 1, minHealthyPercent: 0, maxHealthyPercent: 100. |
| <code><a href="#low-cost-ecs.LowCostECS.property.topic">topic</a></code> | <code>aws-cdk-lib.aws_sns.Topic</code> | SNS topic used to notify certbot renewal failure. |

---

##### `node`<sup>Required</sup> <a name="node" id="low-cost-ecs.LowCostECS.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `certFileSystem`<sup>Required</sup> <a name="certFileSystem" id="low-cost-ecs.LowCostECS.property.certFileSystem"></a>

```typescript
public readonly certFileSystem: FileSystem;
```

- *Type:* aws-cdk-lib.aws_efs.FileSystem

EFS file system that the SSL/TLS certificates are installed.

---

##### `cluster`<sup>Required</sup> <a name="cluster" id="low-cost-ecs.LowCostECS.property.cluster"></a>

```typescript
public readonly cluster: Cluster;
```

- *Type:* aws-cdk-lib.aws_ecs.Cluster

ECS cluster created in configured VPC.

---

##### `hostAutoScalingGroup`<sup>Required</sup> <a name="hostAutoScalingGroup" id="low-cost-ecs.LowCostECS.property.hostAutoScalingGroup"></a>

```typescript
public readonly hostAutoScalingGroup: AutoScalingGroup;
```

- *Type:* aws-cdk-lib.aws_autoscaling.AutoScalingGroup

ECS on EC2 service host instance autoscaling group.

---

##### `serverTaskDefinition`<sup>Required</sup> <a name="serverTaskDefinition" id="low-cost-ecs.LowCostECS.property.serverTaskDefinition"></a>

```typescript
public readonly serverTaskDefinition: Ec2TaskDefinition;
```

- *Type:* aws-cdk-lib.aws_ecs.Ec2TaskDefinition

Server task definition generated from LowCostECSTaskDefinitionOptions.

---

##### `service`<sup>Required</sup> <a name="service" id="low-cost-ecs.LowCostECS.property.service"></a>

```typescript
public readonly service: Ec2Service;
```

- *Type:* aws-cdk-lib.aws_ecs.Ec2Service

ECS service of the server with desiredCount: 1, minHealthyPercent: 0, maxHealthyPercent: 100.

> [https://github.com/rajyan/low-cost-ecs#limitations](https://github.com/rajyan/low-cost-ecs#limitations)

---

##### `topic`<sup>Required</sup> <a name="topic" id="low-cost-ecs.LowCostECS.property.topic"></a>

```typescript
public readonly topic: Topic;
```

- *Type:* aws-cdk-lib.aws_sns.Topic

SNS topic used to notify certbot renewal failure.

---


## Structs <a name="Structs" id="Structs"></a>

### LowCostECSProps <a name="LowCostECSProps" id="low-cost-ecs.LowCostECSProps"></a>

#### Initializer <a name="Initializer" id="low-cost-ecs.LowCostECSProps.Initializer"></a>

```typescript
import { LowCostECSProps } from 'low-cost-ecs'

const lowCostECSProps: LowCostECSProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.email">email</a></code> | <code>string</code> | Email for expiration emails to register to your let's encrypt account. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.hostedZoneDomain">hostedZoneDomain</a></code> | <code>string</code> | Domain name of the hosted zone. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.awsCliDockerTag">awsCliDockerTag</a></code> | <code>string</code> | Docker image tag of amazon/aws-cli. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.certbotDockerTag">certbotDockerTag</a></code> | <code>string</code> | Docker image tag of certbot/dns-route53 to create certificates. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.certbotScheduleInterval">certbotScheduleInterval</a></code> | <code>number</code> | Certbot task schedule interval in days to renew the certificate. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.containerInsights">containerInsights</a></code> | <code>boolean</code> | Enable container insights or not. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.hostInstanceSpotPrice">hostInstanceSpotPrice</a></code> | <code>string</code> | The maximum hourly price (in USD) to be paid for any Spot Instance launched to fulfill the request. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.hostInstanceType">hostInstanceType</a></code> | <code>string</code> | Instance type of the ECS host instance. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.logGroup">logGroup</a></code> | <code>aws-cdk-lib.aws_logs.ILogGroup</code> | Log group of the certbot task and the aws-cli task. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.recordDomainNames">recordDomainNames</a></code> | <code>string[]</code> | Domain names for A records to elastic ip of ECS host instance. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | Removal policy for the file system and log group (if using default). |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.securityGroups">securityGroups</a></code> | <code>aws-cdk-lib.aws_ec2.ISecurityGroup[]</code> | Security group of the ECS host instance. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.serverTaskDefinition">serverTaskDefinition</a></code> | <code><a href="#low-cost-ecs.LowCostECSTaskDefinitionOptions">LowCostECSTaskDefinitionOptions</a></code> | Task definition for the server ecs task. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | VPC of the ECS cluster and EFS file system. |

---

##### `email`<sup>Required</sup> <a name="email" id="low-cost-ecs.LowCostECSProps.property.email"></a>

```typescript
public readonly email: string;
```

- *Type:* string

Email for expiration emails to register to your let's encrypt account.

> [https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html](https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html)

---

##### `hostedZoneDomain`<sup>Required</sup> <a name="hostedZoneDomain" id="low-cost-ecs.LowCostECSProps.property.hostedZoneDomain"></a>

```typescript
public readonly hostedZoneDomain: string;
```

- *Type:* string

Domain name of the hosted zone.

---

##### `awsCliDockerTag`<sup>Optional</sup> <a name="awsCliDockerTag" id="low-cost-ecs.LowCostECSProps.property.awsCliDockerTag"></a>

```typescript
public readonly awsCliDockerTag: string;
```

- *Type:* string
- *Default:* latest

Docker image tag of amazon/aws-cli.

This image is used to associate elastic ip on host instance startup, and run certbot cfn on ecs container startup.

---

##### `certbotDockerTag`<sup>Optional</sup> <a name="certbotDockerTag" id="low-cost-ecs.LowCostECSProps.property.certbotDockerTag"></a>

```typescript
public readonly certbotDockerTag: string;
```

- *Type:* string
- *Default:* v1.29.0

Docker image tag of certbot/dns-route53 to create certificates.

> [https://hub.docker.com/r/certbot/dns-route53/tags](https://hub.docker.com/r/certbot/dns-route53/tags)

---

##### `certbotScheduleInterval`<sup>Optional</sup> <a name="certbotScheduleInterval" id="low-cost-ecs.LowCostECSProps.property.certbotScheduleInterval"></a>

```typescript
public readonly certbotScheduleInterval: number;
```

- *Type:* number
- *Default:* 60

Certbot task schedule interval in days to renew the certificate.

---

##### `containerInsights`<sup>Optional</sup> <a name="containerInsights" id="low-cost-ecs.LowCostECSProps.property.containerInsights"></a>

```typescript
public readonly containerInsights: boolean;
```

- *Type:* boolean
- *Default:* undefined (container insights disabled)

Enable container insights or not.

---

##### `hostInstanceSpotPrice`<sup>Optional</sup> <a name="hostInstanceSpotPrice" id="low-cost-ecs.LowCostECSProps.property.hostInstanceSpotPrice"></a>

```typescript
public readonly hostInstanceSpotPrice: string;
```

- *Type:* string
- *Default:* undefined

The maximum hourly price (in USD) to be paid for any Spot Instance launched to fulfill the request.

Host instance asg would use spot instances if hostInstanceSpotPrice is set.

> [https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.AddCapacityOptions.html#spotprice](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.AddCapacityOptions.html#spotprice)

---

##### `hostInstanceType`<sup>Optional</sup> <a name="hostInstanceType" id="low-cost-ecs.LowCostECSProps.property.hostInstanceType"></a>

```typescript
public readonly hostInstanceType: string;
```

- *Type:* string
- *Default:* t2.micro

Instance type of the ECS host instance.

---

##### `logGroup`<sup>Optional</sup> <a name="logGroup" id="low-cost-ecs.LowCostECSProps.property.logGroup"></a>

```typescript
public readonly logGroup: ILogGroup;
```

- *Type:* aws-cdk-lib.aws_logs.ILogGroup
- *Default:* Creates default cdk log group

Log group of the certbot task and the aws-cli task.

---

##### `recordDomainNames`<sup>Optional</sup> <a name="recordDomainNames" id="low-cost-ecs.LowCostECSProps.property.recordDomainNames"></a>

```typescript
public readonly recordDomainNames: string[];
```

- *Type:* string[]
- *Default:* [ props.hostedZone.zoneName ]

Domain names for A records to elastic ip of ECS host instance.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="low-cost-ecs.LowCostECSProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* RemovalPolicy.DESTROY

Removal policy for the file system and log group (if using default).

---

##### `securityGroups`<sup>Optional</sup> <a name="securityGroups" id="low-cost-ecs.LowCostECSProps.property.securityGroups"></a>

```typescript
public readonly securityGroups: ISecurityGroup[];
```

- *Type:* aws-cdk-lib.aws_ec2.ISecurityGroup[]
- *Default:* Creates security group with allowAllOutbound and ingress rule (ipv4, ipv6) => (tcp 80, 443).

Security group of the ECS host instance.

---

##### `serverTaskDefinition`<sup>Optional</sup> <a name="serverTaskDefinition" id="low-cost-ecs.LowCostECSProps.property.serverTaskDefinition"></a>

```typescript
public readonly serverTaskDefinition: LowCostECSTaskDefinitionOptions;
```

- *Type:* <a href="#low-cost-ecs.LowCostECSTaskDefinitionOptions">LowCostECSTaskDefinitionOptions</a>
- *Default:* Nginx server task definition defined in sampleTaskDefinition()

Task definition for the server ecs task.

> [sampleTaskDefinition](sampleTaskDefinition)

---

##### `vpc`<sup>Optional</sup> <a name="vpc" id="low-cost-ecs.LowCostECSProps.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc
- *Default:* Creates vpc with only public subnets and no NAT gateways.

VPC of the ECS cluster and EFS file system.

---

### LowCostECSTaskDefinitionOptions <a name="LowCostECSTaskDefinitionOptions" id="low-cost-ecs.LowCostECSTaskDefinitionOptions"></a>

#### Initializer <a name="Initializer" id="low-cost-ecs.LowCostECSTaskDefinitionOptions.Initializer"></a>

```typescript
import { LowCostECSTaskDefinitionOptions } from 'low-cost-ecs'

const lowCostECSTaskDefinitionOptions: LowCostECSTaskDefinitionOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#low-cost-ecs.LowCostECSTaskDefinitionOptions.property.containers">containers</a></code> | <code>aws-cdk-lib.aws_ecs.ContainerDefinitionOptions[]</code> | *No description.* |
| <code><a href="#low-cost-ecs.LowCostECSTaskDefinitionOptions.property.taskDefinition">taskDefinition</a></code> | <code>aws-cdk-lib.aws_ecs.Ec2TaskDefinitionProps</code> | *No description.* |
| <code><a href="#low-cost-ecs.LowCostECSTaskDefinitionOptions.property.volumes">volumes</a></code> | <code>aws-cdk-lib.aws_ecs.Volume[]</code> | *No description.* |

---

##### `containers`<sup>Required</sup> <a name="containers" id="low-cost-ecs.LowCostECSTaskDefinitionOptions.property.containers"></a>

```typescript
public readonly containers: ContainerDefinitionOptions[];
```

- *Type:* aws-cdk-lib.aws_ecs.ContainerDefinitionOptions[]

---

##### `taskDefinition`<sup>Optional</sup> <a name="taskDefinition" id="low-cost-ecs.LowCostECSTaskDefinitionOptions.property.taskDefinition"></a>

```typescript
public readonly taskDefinition: Ec2TaskDefinitionProps;
```

- *Type:* aws-cdk-lib.aws_ecs.Ec2TaskDefinitionProps

---

##### `volumes`<sup>Optional</sup> <a name="volumes" id="low-cost-ecs.LowCostECSTaskDefinitionOptions.property.volumes"></a>

```typescript
public readonly volumes: Volume[];
```

- *Type:* aws-cdk-lib.aws_ecs.Volume[]

---



