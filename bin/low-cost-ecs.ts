import { App } from "aws-cdk-lib";
import { LowCostECS } from '../src';

const app = new App();

new LowCostECS(app, "LowCostECSStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  hostedZoneDomain: "rajyan.net",
  recordDomainNames: ["test1.rajyan.net", "test2.rajyan.net"],
  email: "kitakita7617@gmail.com",
  hostInstanceSpotPrice: "0.0050",
});
