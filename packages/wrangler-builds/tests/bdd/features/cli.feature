@live
Feature: Synchronize configured build triggers
  So that Cloudflare matches the repository configuration
  Maintainers can preview and apply build trigger updates from the CLI.

  Background:
    Given the live example worker trigger exists on Cloudflare

  Scenario: Preview a planned trgger update
    Given the live example trigger has drifted from its configuration
    When I preview the sync for the live example project
    Then the command should succeed
    And I should be told that the example trigger would be updated
    And Cloudflare should still show the drifted build command

  Scenario: Apply a configured trigger update discovered from the repository
    Given the live example trigger has drifted from its configuration
    When I sync build triggers discovered from "examples/live-e2e-worker/workers-build.jsonc"
    Then the command should succeed
    And I should be told that the example trigger was updated
    And Cloudflare should match the live example config

  Scenario: Refuse to sync a trigger that has not been provisioned
    Given a temp config refers to a missing trigger named "BDD missing trigger"
    When I preview the sync for that config
    Then the command should fail
    And I should be told that the missing trigger must be provisioned first
