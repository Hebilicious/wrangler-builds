import assert from "node:assert/strict";

import { Given, Then, When } from "@cucumber/cucumber";

import type { LiveCliWorld } from "../support/world.js";

Given("the live example worker trigger exists on Cloudflare", async function (this: LiveCliWorld) {
  await this.ensureTriggerExists();
});

Given(
  "the live example trigger has drifted from its configuration",
  async function (this: LiveCliWorld) {
    await this.driftTrigger();
  },
);

Given(
  "a temp config refers to a missing trigger named {string}",
  async function (this: LiveCliWorld, triggerName: string) {
    await this.createMissingTriggerConfig(triggerName);
  },
);

When("I preview the sync for that config", async function (this: LiveCliWorld) {
  await this.runCli(["--dry-run", this.configPath]);
});

When("I preview the sync for the live example project", async function (this: LiveCliWorld) {
  await this.runCli(["--dry-run", this.configPath]);
});

When(
  "I sync build triggers discovered from {string}",
  async function (this: LiveCliWorld, glob: string) {
    await this.runCli(["--glob", glob]);
  },
);

Then("the command should succeed", function (this: LiveCliWorld) {
  assert.equal(this.exitCode, 0, this.stderr || this.stdout);
});

Then("the command should fail", function (this: LiveCliWorld) {
  assert.notEqual(this.exitCode, 0, "Expected the CLI to fail.");
});

Then("Cloudflare should still show the drifted build command", async function (this: LiveCliWorld) {
  await this.assertTriggerStillDrifted();
});

Then("Cloudflare should match the live example config", async function (this: LiveCliWorld) {
  await this.assertTriggerMatchesExpected();
});

Then("I should be told that the example trigger would be updated", function (this: LiveCliWorld) {
  assert.match(this.stdout, /~ wrangler-builds-live-e2e-20260408: would update Deploy production/);
});

Then("I should be told that the example trigger was updated", function (this: LiveCliWorld) {
  assert.match(this.stdout, /\+ wrangler-builds-live-e2e-20260408: updated Deploy production/);
});

Then(
  "I should be told that the missing trigger must be provisioned first",
  function (this: LiveCliWorld) {
    const combined = `${this.stdout}\n${this.stderr}`;
    assert.match(
      combined,
      /Missing Cloudflare Build trigger "BDD missing trigger" for wrangler-builds-live-e2e-20260408\./,
    );
  },
);
