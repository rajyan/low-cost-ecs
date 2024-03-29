import { App, Stack } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-autoscaling';
import { LowCostECS } from '../src';

const app = new App();
const stack = new Stack(app, 'TestStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

export const autoscaling = new LowCostECS(stack, 'LowCostECS', {
  hostedZoneDomain: 'example.com',
  recordDomainNames: ['test1.example.com', 'test2.example.com'],
  email: 'test@example.com',
  hostInstanceSpotPrice: '0.0050',
});
autoscaling.hostAutoScalingGroup.scaleOnSchedule('IncreaseAtMorning', {
  timeZone: 'Asia/Tokyo',
  schedule: Schedule.cron({
    minute: '0',
    hour: '8',
  }),
  desiredCapacity: 1,
});
autoscaling.hostAutoScalingGroup.scaleOnSchedule('DecreaseAtNight', {
  timeZone: 'Asia/Tokyo',
  schedule: Schedule.cron({
    minute: '0',
    hour: '23',
  }),
  desiredCapacity: 0,
});
