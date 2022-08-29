import { App } from "aws-cdk-lib";
import { EasyCerver } from '../src';

const app = new App();

new EasyCerver(app, "EasyCerverStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  hostedZoneDomain: "rajyan.net",
  recordDomainNames: ["test1.rajyan.net", "test2.rajyan.net"],
  email: "kitakita7617@gmail.com",
  hostInstanceSpotPrice: "0.0050",
});
