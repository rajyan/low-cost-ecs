import { awscdk } from 'projen';
import { UpgradeDependenciesSchedule } from 'projen/lib/javascript';

const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Yohta Kimura',
  authorAddress: 'kitakita7617@gmail.com',
  name: 'easy-cerver',
  description: 'test',
  repositoryUrl: 'https://github.com/rajyan/easy-cerver.git',
  license: 'MIT',
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',

  devDeps: [
    'aws-cdk',
    'ts-node',
  ],

  keywords: [
    'cdk',
    'ecs',
    'certbot',
    'low-cost',
  ],

  buildWorkflowTriggers: {
    pullRequest: {},
    workflowDispatch: {},
    push: {
      branches: ['main'],
    },
  },

  depsUpgradeOptions: {
    workflowOptions: {
      schedule: UpgradeDependenciesSchedule.WEEKLY,
    },
  },

  stability: 'experimental',

  autoApproveOptions: {
    allowedUsernames: ['rajyan'],
  },
  python: {
    distName: 'easy-cerver',
    module: 'eascy_cerver',
  },

  projenrcTs: true,
});

const excludes = ['.idea/', 'cdk.out/', 'cdk.context.json', 'yarn-error.log'];
project.npmignore?.exclude(...excludes);
project.gitignore.exclude(...excludes);

project.synth();