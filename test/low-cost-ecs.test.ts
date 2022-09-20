import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { LowCostECS } from '../lib';

test('stack with minimum props', () => {
  const app = new App();
  const stack = new LowCostECS(app, 'LowCostECS', {
    env: {
      account: 'test-account',
      region: 'test-region',
    },
    hostedZoneDomain: 'test.rajyan.net',
    email: 'test@email.com',
  });
  const template = Template.fromStack(stack);

  // vpc, cluster
  template.hasResourceProperties('AWS::EC2::VPC', {
    Name: Match.absent(),
  });
  template.hasResourceProperties('AWS::EC2::Subnet', {
    Tags: Match.arrayWith([{
      Key: 'aws-cdk:subnet-type',
      Value: 'Public',
    }]),
  });
  template.resourceCountIs('AWS::EC2::Subnet', 3);
  template.resourceCountIs('AWS::EC2::NatGateway', 0);
  template.resourceCountIs('AWS::ECS::Cluster', 1);

  // host instance
  template.hasResourceProperties('AWS::Route53::RecordSet', {
    HostedZoneId: 'DUMMY',
    Name: 'test.rajyan.net.',
  });
  template.hasResourceProperties('AWS::EC2::EIP', {
    Tags: [{
      Key: 'Name',
    }],
  });
  template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
    MaxSize: '1',
    MinSize: '1',
  });
  template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
    AssociatePublicIpAddress: true,
    InstanceType: 't2.micro',
  });

  // certbot state machine
  template.hasResource('AWS::EFS::FileSystem', {
    DeletionPolicy: 'Delete',
    UpdateReplacePolicy: 'Delete',
  });
  template.hasResource('AWS::Logs::LogGroup', {
    DeletionPolicy: 'Delete',
    UpdateReplacePolicy: 'Delete',
  });
  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: [{
      Name: 'certbot',
      Essential: true,
      Image: 'certbot/dns-route53:v1.29.0',
      MemoryReservation: 64,
      MountPoints: [{
        ContainerPath: '/etc/letsencrypt',
        ReadOnly: false,
        SourceVolume: 'certVolume',
      }],
    }],
    NetworkMode: 'bridge',
    Volumes: [{
      Name: 'certVolume',
    }],
  });
  template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

  // server service
  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: [
      {
        Name: 'nginx',
        Essential: true,
        MemoryReservation: 64,
        MountPoints: [{
          ContainerPath: '/etc/letsencrypt',
          ReadOnly: true,
          SourceVolume: 'certVolume',
        }],
      },
      {
        Name: 'aws-cli',
        Essential: false,
        Image: 'amazon/aws-cli:latest',
      },
    ],
    NetworkMode: 'bridge',
    Volumes: [{
      Name: 'certVolume',
    }],
  });
  template.hasResourceProperties('AWS::ECS::Service', {
    DeploymentConfiguration: {
      DeploymentCircuitBreaker: {
        Enable: true,
        Rollback: true,
      },
      MaximumPercent: 100,
      MinimumHealthyPercent: 0,
    },
    DeploymentController: {
      Type: 'ECS',
    },
    DesiredCount: 1,
    EnableExecuteCommand: true,
    LaunchType: 'EC2',
  });
});

test('stack without default container', () => {
  const app = new App();
  const stack = new LowCostECS(app, 'LowCostECS', {
    env: {
      account: 'test-account',
      region: 'test-region',
    },
    hostedZoneDomain: 'test.rajyan.net',
    email: 'test@email.com',
    serverTaskDefinition: {
      containers: [],
    },
  });
  expect(() => {
    Template.fromStack(stack);
  }).toThrow(new Error('Validation failed with the following errors:\n  [LowCostECS/Service] A TaskDefinition must have at least one essential container'));
});