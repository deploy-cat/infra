import * as digitalocean from "@pulumi/digitalocean";
import { kourierLoadBalancerIP } from "./knative";
import { config } from "./index";

export const domain = new digitalocean.Domain("default", {
  name: config.require("knative-domain"),
  ipAddress: kourierLoadBalancerIP.apply((item) => item),
});

// export const wildcardRecord = new digitalocean.DnsRecord("wildcard", {
//   domain: domain.id,
//   type: "A",
//   name: "*",
//   value: kourierLoadBalancerIP.apply((item) => item),
// });
