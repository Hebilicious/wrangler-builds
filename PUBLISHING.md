# Releasing

This repository uses [Changesets](https://github.com/changesets/changesets) for versioning.

Create a changeset for user-facing package changes:

```bash
moon run workspace:changeset
```

Inspect the pending release plan:

```bash
moon run workspace:changeset-status
```

Apply version bumps locally if you want to inspect the generated release commit:

```bash
moon run workspace:version
```

Before publishing, run the real Cloudflare end-to-end suite:

```bash
moon run wrangler-builds:e2e
```

Required environment variables for the live suite:

- `CLOUDFLARE_API_TOKEN`
- `WRANGLER_BUILDS_E2E_ACCOUNT_ID` or `CLOUDFLARE_ACCOUNT_ID`
- `WRANGLER_BUILDS_E2E_BUILD_TOKEN_UUID` if the example trigger must be bootstrapped
- `WRANGLER_BUILDS_E2E_REPO_CONNECTION_UUID` if the example trigger must be bootstrapped

The GitHub Actions workflow at [`.github/workflows/changesets.yaml`](./.github/workflows/changesets.yaml)
handles the release flow after version changes are merged, and runs the live
Cloudflare E2E task before publishing.
