process.env.CDK_DEFAULT_ACCOUNT = 'test-account';
process.env.CDK_DEFAULT_REGION = 'test-region';

import { Template } from 'aws-cdk-lib/assertions';
import { allPropsStack } from '../examples/all-props';
import { autoscalingStack } from '../examples/autoscaling';
import { minimumStack } from '../examples/minimum';

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
  test('minimum', () => expect(Template.fromStack(minimumStack)).toMatchSnapshot());
  test('all props', () => expect(Template.fromStack(allPropsStack)).toMatchSnapshot());
  test('autoscaling', () => expect(Template.fromStack(autoscalingStack)).toMatchSnapshot());
});
