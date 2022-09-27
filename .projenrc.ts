import { awscdk } from 'projen';
import { UpgradeDependenciesSchedule } from 'projen/lib/javascript';

const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Yohta Kimura',
  authorAddress: 'kitakita7617@gmail.com',
  name: 'low-cost-ecs',
  description: 'Easy and low-cost ECS on EC2 server without a load balancer',
  repositoryUrl: 'https://github.com/rajyan/low-cost-ecs.git',
  license: 'MIT',
  cdkVersion: '2.37.0',
  defaultReleaseBranch: 'main',
  keywords: ['cdk', 'ecs', 'stepfunctions', 'route53', 'certbot', 'loadbalancer'],
  devDeps: ['aws-cdk', 'ts-node'],
  stability: 'experimental',

  python: {
    distName: 'low-cost-ecs',
    module: 'low_cost_ecs',
  },
  autoApproveOptions: {
    allowedUsernames: ['rajyan'],
  },
  depsUpgradeOptions: {
    workflowOptions: {
      schedule: UpgradeDependenciesSchedule.WEEKLY,
      labels: ['auto-approve'],
    },
  },
  prettier: true,
  prettierOptions: {
    settings: {
      printWidth: 100,
      singleQuote: true,
    },
  },
  projenrcTs: true,
});

const excludes = ['.idea/', 'cdk.out/', 'cdk.context.json', 'yarn-error.log'];
project.npmignore?.exclude(...excludes);
project.gitignore.exclude(...excludes);

project.tsconfigDev.addInclude('examples/**/*.ts');

project.synth();
