[![NPM version](https://badge.fury.io/js/easy-cerver.svg)](https://www.npmjs.com/package/easy-cerver)
[![PyPI version](https://badge.fury.io/py/easy-cerver.svg)](https://pypi.org/project/easy-cerver/0.0.4/)
[![Release](https://github.com/rajyan/easy-cerver/workflows/release/badge.svg)](https://github.com/rajyan/easy-cerver/actions/workflows/release.yml)
[<img src="https://constructs.dev/badge?package=easy-cerver" width="150">](https://constructs.dev/packages/easy-cerver)

# Easy Cerver

A CDK construct that provides easy and low-cost ECS on EC2 server setup without a load balancer.
TLS/SSL certificates are installed automatically on startup of the server and renewed by a scheduled state machine using [certbot-dns-route53](https://certbot-dns-route53.readthedocs.io/en/stable/).

**This construct is for development purposes only** see [Limitations](#Limitations).

# Try it out!

The easiest way to see what this construct does is to clone this repository and deploying sample server.
Edit settings in `bin/easy-cerver.ts` and deploy cdk construct. [Public hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html) with your own domain is required.

```
git clone https://github.com/rajyan/easy-cerver.git
# edit settings in bin/easy-cerver.ts
npx cdk deploy
```

You can access to your `recordDomainNames` and see that the nginx sample server has been deployed.

# Installation

To use this construct in your own cdk stack as a library,

```
npm install easy-cerver
```

```ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EasyCerver } from 'easy-cerver';

class SampleStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const vpc = /** Your VPC */
        const securityGroup = /** Your security group */
        const serverTaskDefinition = /** Your task definition */

        new EasyCerver(this, 'EasyCerver', {
            hostedZoneDomain: "rajyan.net",
            email: "kitakita7617@gmail.com",
            vpc: vpc,
            securityGroup: securityGroup,
            serverTaskDefinition: serverTaskDefinition
        });
    }
}
```

The required fields are `hostedZoneDomain` and `email`.
You can set your own task definition, and other props. Read [`EasyCerverProps` documentation](https://github.com/rajyan/easy-cerver/blob/main/API.md#easy-cerver.EasyCerverProps) for details.

# Why



# Overview

# Cost

setup => route53 hosted zone

# Debugging

* host => ssm
* server ecs execute

# Limitations

The ecs service occupies the host port, so you can only run one service at a time.
The old task must be terminated before the new task launches, and this causes downtime on release.
Also, if you make changes that require recreating service, you may need to manually terminate the task of old the service.
