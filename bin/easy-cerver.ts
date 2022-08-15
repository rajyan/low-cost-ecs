import { App } from "aws-cdk-lib";
import { EasyCerver } from "../lib/easy-cerver";

const app = new App();

new EasyCerver(app, "EasyCerverStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  hostedZoneDomain: 'rajyan.net',
  email: 'kitakita7617@gmail.com',
});
