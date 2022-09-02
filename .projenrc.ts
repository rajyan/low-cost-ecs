import { awscdk } from 'projen';
import { UpgradeDependenciesSchedule } from 'projen/lib/javascript';

const excludes = ['.idea/', 'cdk.out/', 'cdk.context.json', 'yarn-error.log'];
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Yohta Kimura',
  authorAddress: 'kitakita7617@gmail.com',
  name: 'easy-cerver',
  description: 'Easy and low-cost ECS on EC2 server without a load balancer',
  repositoryUrl: 'https://github.com/rajyan/easy-cerver.git',
  license: 'MIT',
  cdkVersion: '2.37.0',
  defaultReleaseBranch: 'main',
  keywords: [
    'cdk',
    'ecs',
    'stepfunctions',
    'route53',
    'certbot',
    'loadbalancer',
  ],
  devDeps: [
    'aws-cdk',
    'ts-node',
  ],
  stability: 'experimental',

  python: {
    distName: 'easy-cerver',
    module: 'eascy_cerver',
  },

  npmignore: excludes,
  gitignore: excludes,
  autoApproveOptions: {
    allowedUsernames: ['rajyan'],
  },
  depsUpgradeOptions: {
    workflowOptions: {
      schedule: UpgradeDependenciesSchedule.WEEKLY,
    },
  },
  projenrcTs: true,
});

// workaround until fixed https://youtrack.jetbrains.com/issue/WEB-57089/ESLint823-TypeError-thislibOptionsparse-is-not-a-function
project.addDevDeps('eslint@8.22.0');

project.synth();