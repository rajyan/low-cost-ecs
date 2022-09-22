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
| <code><a href="#low-cost-ecs.LowCostECS.property.certFileSystem">certFileSystem</a></code> | <code>aws-cdk-lib.aws_efs.FileSystem</code> | *No description.* |
| <code><a href="#low-cost-ecs.LowCostECS.property.cluster">cluster</a></code> | <code>aws-cdk-lib.aws_ecs.Cluster</code> | *No description.* |
| <code><a href="#low-cost-ecs.LowCostECS.property.hostAutoScalingGroup">hostAutoScalingGroup</a></code> | <code>aws-cdk-lib.aws_autoscaling.AutoScalingGroup</code> | *No description.* |
| <code><a href="#low-cost-ecs.LowCostECS.property.serverTaskDefinition">serverTaskDefinition</a></code> | <code>aws-cdk-lib.aws_ecs.Ec2TaskDefinition</code> | *No description.* |
| <code><a href="#low-cost-ecs.LowCostECS.property.service">service</a></code> | <code>aws-cdk-lib.aws_ecs.Ec2Service</code> | *No description.* |
| <code><a href="#low-cost-ecs.LowCostECS.property.topic">topic</a></code> | <code>aws-cdk-lib.aws_sns.Topic</code> | *No description.* |
| <code><a href="#low-cost-ecs.LowCostECS.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | *No description.* |

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

---

##### `cluster`<sup>Required</sup> <a name="cluster" id="low-cost-ecs.LowCostECS.property.cluster"></a>

```typescript
public readonly cluster: Cluster;
```

- *Type:* aws-cdk-lib.aws_ecs.Cluster

---

##### `hostAutoScalingGroup`<sup>Required</sup> <a name="hostAutoScalingGroup" id="low-cost-ecs.LowCostECS.property.hostAutoScalingGroup"></a>

```typescript
public readonly hostAutoScalingGroup: AutoScalingGroup;
```

- *Type:* aws-cdk-lib.aws_autoscaling.AutoScalingGroup

---

##### `serverTaskDefinition`<sup>Required</sup> <a name="serverTaskDefinition" id="low-cost-ecs.LowCostECS.property.serverTaskDefinition"></a>

```typescript
public readonly serverTaskDefinition: Ec2TaskDefinition;
```

- *Type:* aws-cdk-lib.aws_ecs.Ec2TaskDefinition

---

##### `service`<sup>Required</sup> <a name="service" id="low-cost-ecs.LowCostECS.property.service"></a>

```typescript
public readonly service: Ec2Service;
```

- *Type:* aws-cdk-lib.aws_ecs.Ec2Service

---

##### `topic`<sup>Required</sup> <a name="topic" id="low-cost-ecs.LowCostECS.property.topic"></a>

```typescript
public readonly topic: Topic;
```

- *Type:* aws-cdk-lib.aws_sns.Topic

---

##### `vpc`<sup>Required</sup> <a name="vpc" id="low-cost-ecs.LowCostECS.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc

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
| <code><a href="#low-cost-ecs.LowCostECSProps.property.securityGroup">securityGroup</a></code> | <code>aws-cdk-lib.aws_ec2.ISecurityGroup</code> | Security group of the ECS host instance. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.serverTaskDefinition">serverTaskDefinition</a></code> | <code><a href="#low-cost-ecs.LowCostECSTaskDefinitionOptions">LowCostECSTaskDefinitionOptions</a></code> | Task definition for the server ecs task. |
| <code><a href="#low-cost-ecs.LowCostECSProps.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | Vpc of the ECS host instance and cluster. |

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

##### `securityGroup`<sup>Optional</sup> <a name="securityGroup" id="low-cost-ecs.LowCostECSProps.property.securityGroup"></a>

```typescript
public readonly securityGroup: ISecurityGroup;
```

- *Type:* aws-cdk-lib.aws_ec2.ISecurityGroup
- *Default:* Creates security group with allowAllOutbound and ingress rule (ipv4, ipv6) => (tcp 80, 443).

Security group of the ECS host instance.

---

##### `serverTaskDefinition`<sup>Optional</sup> <a name="serverTaskDefinition" id="low-cost-ecs.LowCostECSProps.property.serverTaskDefinition"></a>

```typescript
public readonly serverTaskDefinition: LowCostECSTaskDefinitionOptions;
```

- *Type:* <a href="#low-cost-ecs.LowCostECSTaskDefinitionOptions">LowCostECSTaskDefinitionOptions</a>
- *Default:* Nginx server task definition defined in createSampleTaskDefinition()

Task definition for the server ecs task.

---

##### `vpc`<sup>Optional</sup> <a name="vpc" id="low-cost-ecs.LowCostECSProps.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc
- *Default:* Creates vpc with only public subnets and no NAT gateways.

Vpc of the ECS host instance and cluster.

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



