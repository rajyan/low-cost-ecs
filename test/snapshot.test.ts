import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

process.env.CDK_DEFAULT_ACCOUNT = 'test-account';
process.env.CDK_DEFAULT_REGION = 'test-region';

// @ts-ignore
import { allProps } from '../examples/all-props';
// @ts-ignore
import { autoscaling } from '../examples/autoscaling';
// @ts-ignore
import { minimum } from '../examples/minimum';

expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string',
  serialize: (val) => {
    return `"${val.replace(
      new RegExp(
        '[a-f0-9]{64}\\.zip|cdk-[a-z0-9]{9}-assets-\\$\{AWS::AccountId}-\\$\{AWS::Region}|container-assets-test-account-test-region:[a-z0-9]{64}',
      ),
      '[HASH REMOVED]',
    )}"`;
  },
});

describe('Test snapshot of examples', () => {
  test('minimum', () => expect(Template.fromStack(Stack.of(minimum))).toMatchSnapshot());
  test('all props', () => expect(Template.fromStack(Stack.of(allProps))).toMatchSnapshot());
  test('autoscaling', () => expect(Template.fromStack(Stack.of(autoscaling))).toMatchSnapshot());
});
