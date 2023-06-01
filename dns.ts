import * as digitalocean from "@pulumi/digitalocean";
import { kourierLoadBalancerIP } from "./knative";

export const domain = new digitalocean.Domain("default", {
  name: "deploy.fish",
  ipAddress: kourierLoadBalancerIP.apply((item) => item),
});

export const wildcardRecord = new digitalocean.DnsRecord("*", {
  domain: domain.id,
  type: "A",
  name: "*",
  value: kourierLoadBalancerIP.apply((item) => item),
});
