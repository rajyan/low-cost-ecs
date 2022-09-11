import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { LowCostECS } from '../src';

test('Template matches snapshot', () => {
  const app = new App();
  const stack = new LowCostECS(app, 'MyTestStack', {
    env: {
      account: 'dummy-id',
      region: 'dummy-region',
    },
    hostedZoneDomain: 'test.example.com',
    email: 'test@example.com',
  });

  expect.addSnapshotSerializer({
    test: (val) => typeof val === 'string',
    serialize: (val) => {
      return `"${val.replace(
        new RegExp(
          `[a-f0-9]{64}\\.zip|cdk-[a-z0-9]{9}-assets-\\$\{AWS::AccountId}-\\$\{AWS::Region}|container-assets-${stack.account}-${stack.region}:[a-z0-9]{64}`,
        ),
        '[HASH REMOVED]',
      )}"`;
    },
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
