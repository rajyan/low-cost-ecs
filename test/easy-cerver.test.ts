import { SynthUtils } from "@aws-cdk/assert";
import { App } from "aws-cdk-lib";
import { EasyCerver } from "../lib/easy-cerver";

test("Template matches snapshot", () => {
  const app = new App();
  const stack = new EasyCerver(app, "MyTestStack", {
    env: {
      account: "dummy-id",
      region: "dummy-region",
    },
    hostedZoneDomain: "test.example.com",
    email: "test@example.com",
  });
  expect.addSnapshotSerializer({
    test: (val) => typeof val === "string",
    serialize: (val) => {
      return `"${val.replace(
        new RegExp(
          `[a-f0-9]{64}\\.zip|cdk-[a-z0-9]{9}-assets-\\$\{AWS::AccountId}-\\$\{AWS::Region}|container-assets-${stack.account}-${stack.region}:[a-z0-9]{64}`
        ),
        "[HASH REMOVED]"
      )}"`;
    },
  });

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
