import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export const config = new pulumi.Config();

import "./secrets.ts";
import "./certManager.ts";
import "./knative.ts";
import "./dns.ts";
import "./stacks/whoami.ts";
