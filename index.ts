import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

import "./secrets.ts";
import "./certManager.ts";
import "./knative.ts";
import "./dns.ts";
