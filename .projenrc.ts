import { awscdk } from 'projen';
import { UpdateSnapshot, UpgradeDependenciesSchedule } from 'projen/lib/javascript';

const project = new awscdk.AwsCdkConstructLibrary({
  // publish
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
  publishToPypi: {
    distName: 'low-cost-ecs',
    module: 'low_cost_ecs',
  },
  // workflows
  autoApproveOptions: {
    allowedUsernames: ['rajyan'],
  },
  depsUpgradeOptions: {
    workflowOptions: {
      schedule: UpgradeDependenciesSchedule.WEEKLY,
      labels: ['auto-approve'],
    },
  },
  // dev settings
  prettier: true,
  prettierOptions: {
    settings: {
      printWidth: 100,
      singleQuote: true,
    },
  },
  jestOptions: {
    updateSnapshot: UpdateSnapshot.NEVER,
  },
  projenrcTs: true,
});

const excludes = ['.idea/', 'cdk.out/', 'cdk.context.json', 'yarn-error.log'];
project.npmignore?.exclude(...excludes);
project.gitignore.exclude(...excludes);

project.tsconfigDev.addInclude('examples/**/*.ts');

project.synth();
