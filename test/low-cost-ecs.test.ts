import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { LowCostECS } from '../lib';

test('stack with minimum props', () => {
  const stack = new Stack(undefined, 'TestStack', {
    env: {
      account: 'test-account',
      region: 'test-region',
    },
  });
  new LowCostECS(stack, 'LowCostECS', {
    hostedZoneDomain: 'test.rajyan.net',
    email: 'test@email.com',
  });
  const template = Template.fromStack(stack);

  // vpc, cluster
  template.hasResourceProperties('AWS::EC2::VPC', {
    Name: Match.absent(),
  });
  template.hasResourceProperties('AWS::EC2::Subnet', {
    Tags: Match.arrayWith([
      {
        Key: 'aws-cdk:subnet-type',
        Value: 'Public',
      },
    ]),
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
    Tags: [
      {
        Key: 'Name',
      },
    ],
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
    ContainerDefinitions: [
      {
        Name: 'certbot',
        Essential: true,
        Image: 'certbot/dns-route53:v1.29.0',
        MemoryReservation: 64,
        MountPoints: [
          {
            ContainerPath: '/etc/letsencrypt',
            ReadOnly: false,
            SourceVolume: 'certVolume',
          },
        ],
      },
    ],
    NetworkMode: 'bridge',
    Volumes: [
      {
        Name: 'certVolume',
      },
    ],
  });
  template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);

  // server service
  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: [
      {
        Name: 'nginx',
        Essential: true,
        MemoryReservation: 64,
        MountPoints: [
          {
            ContainerPath: '/etc/letsencrypt',
            ReadOnly: true,
            SourceVolume: 'certVolume',
          },
        ],
        DependsOn: [
          {
            Condition: 'COMPLETE',
            ContainerName: 'aws-cli',
          },
        ],
      },
      {
        Name: 'aws-cli',
        Essential: false,
        Image: 'amazon/aws-cli:latest',
      },
    ],
    NetworkMode: 'bridge',
    Volumes: [
      {
        Name: 'certVolume',
      },
    ],
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

describe('server task definition props', () => {
  it('can add a essential container', () => {
    const stack = new Stack(undefined, 'TestStack', {
      env: {
        account: 'test-account',
        region: 'test-region',
      },
    });
    new LowCostECS(stack, 'LowCostECS', {
      hostedZoneDomain: 'test.rajyan.net',
      email: 'test@email.com',
      serverTaskDefinition: {
        containers: [
          {
            containerName: 'test',
            image: ContainerImage.fromRegistry('test-image'),
            memoryReservationMiB: 64,
            essential: true,
          },
        ],
      },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        {
          Name: 'test',
          Image: 'test-image',
          Essential: true,
          MemoryReservation: 64,
        },
        {
          Name: 'aws-cli',
          Essential: false,
          Image: 'amazon/aws-cli:latest',
        },
      ],
    });
  });

  it('creates a container name if not set', () => {
    const stack = new Stack(undefined, 'TestStack', {
      env: {
        account: 'test-account',
        region: 'test-region',
      },
    });
    new LowCostECS(stack, 'LowCostECS', {
      hostedZoneDomain: 'test.rajyan.net',
      email: 'test@email.com',
      serverTaskDefinition: {
        containers: [
          {
            image: ContainerImage.fromRegistry('test-image'),
            memoryReservationMiB: 64,
            essential: true,
          },
        ],
      },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        {
          Name: 'container0',
          Image: 'test-image',
          MemoryReservation: 64,
          Essential: true,
        },
        {
          Name: 'aws-cli',
          Essential: false,
          Image: 'amazon/aws-cli:latest',
        },
      ],
    });
  });

  it('can set a port mapping for container', () => {
    const stack = new Stack(undefined, 'TestStack', {
      env: {
        account: 'test-account',
        region: 'test-region',
      },
    });
    new LowCostECS(stack, 'LowCostECS', {
      hostedZoneDomain: 'test.rajyan.net',
      email: 'test@email.com',
      serverTaskDefinition: {
        containers: [
          {
            image: ContainerImage.fromRegistry('test-image'),
            memoryReservationMiB: 64,
            essential: true,
            portMappings: [
              {
                containerPort: 443,
                hostPort: 443,
              },
            ],
          },
        ],
      },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        {
          Name: 'container0',
          Image: 'test-image',
          MemoryReservation: 64,
          Essential: true,
          PortMappings: [
            {
              ContainerPort: 443,
              HostPort: 443,
              Protocol: 'tcp',
            },
          ],
        },
        {
          Name: 'aws-cli',
          Essential: false,
          Image: 'amazon/aws-cli:latest',
        },
      ],
    });
  });

  it('throws an error if no default container', () => {
    const stack = new Stack(undefined, 'TestStack', {
      env: {
        account: 'test-account',
        region: 'test-region',
      },
    });
    expect(() => {
      new LowCostECS(stack, 'LowCostECS', {
        hostedZoneDomain: 'test.rajyan.net',
        email: 'test@email.com',
        serverTaskDefinition: {
          containers: [
            {
              containerName: 'test-not-essential',
              image: ContainerImage.fromRegistry('test-image'),
              essential: false,
            },
          ],
        },
      });
    }).toThrow(
      new Error(
        'defaultContainer is required for serverTaskDefinition. Add at least one essential container.'
      )
    );
  });
});
