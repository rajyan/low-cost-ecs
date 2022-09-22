import { App, Stack } from 'aws-cdk-lib';
import { LowCostECS } from '../src';

const app = new App();
const stack = new Stack(app, 'TestStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

export const minimum = new LowCostECS(stack, 'LowCostECS', {
  hostedZoneDomain: 'rajyan.net',
  email: 'kitakita7617@gmail.com',
});
