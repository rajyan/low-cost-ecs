import { App } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-autoscaling';
import { LowCostECS } from '../src';

const app = new App();

export const autoscalingStack = new LowCostECS(app, 'LowCostECSStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  hostedZoneDomain: 'rajyan.net',
  recordDomainNames: ['test1.rajyan.net', 'test2.rajyan.net'],
  email: 'kitakita7617@gmail.com',
  hostInstanceSpotPrice: '0.0050',
});
autoscalingStack.hostAutoScalingGroup.scaleOnSchedule('IncreaseAtMorning', {
  timeZone: 'Asia/Tokyo',
  schedule: Schedule.cron({
    minute: '0',
    hour: '8',
  }),
  desiredCapacity: 1,
});
autoscalingStack.hostAutoScalingGroup.scaleOnSchedule('DecreaseAtNight', {
  timeZone: 'Asia/Tokyo',
  schedule: Schedule.cron({
    minute: '0',
    hour: '23',
  }),
  desiredCapacity: 0,
});
