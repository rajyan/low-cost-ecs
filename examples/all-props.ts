import { App, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ContainerImage, Protocol } from 'aws-cdk-lib/aws-ecs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { LowCostECS } from '../src';

const app = new App();
const stack = new Stack(app, 'TestStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

export const allPropsStack = new LowCostECS(app, 'LowCostECSStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  hostedZoneDomain: 'rajyan.net',
  email: 'kitakita7617@gmail.com',
  awsCliDockerTag: 'testTag',
  certbotDockerTag: 'testTag',
  certbotScheduleInterval: 10,
  containerInsights: true,
  hostInstanceSpotPrice: '0.010',
  hostInstanceType: 't3.micro',
  logGroup: LogGroup.fromLogGroupArn(stack, 'LogGroup', 'arn:aws:logs:region:account-id:log-group:test'),
  recordDomainNames: ['test1.rajyan.net', 'test2.rajyan.net'],
  removalPolicy: RemovalPolicy.RETAIN,
  securityGroup: SecurityGroup.fromSecurityGroupId(stack, 'SecurityGroup', 'test-sg-id'),
  serverTaskDefinition: {
    containers: [{
      containerName: 'test-container',
      image: ContainerImage.fromRegistry('test-image'),
      memoryLimitMiB: 32,
      essential: true,
      portMappings: [{
        containerPort: 80,
        hostPort: 80,
        protocol: Protocol.TCP,
      }],
    }],
    volumes: [{
      name: 'test-volume',
    }],
  },
  vpc: new Vpc(stack, 'Vpc'),
});
