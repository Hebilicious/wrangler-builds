# `wrangler-builds`

`wrangler-builds` keeps Cloudflare Workers Build triggers in sync with checked-in
`workers-build.jsonc` files.

It is built for the explicit workflow first:

- sync one config file with Cloudflare
- inspect the current Cloudflare config for one file
- optionally discover many config files from a directory when you really want that

The package does not create or delete triggers during normal sync. If a trigger
is missing on Cloudflare, the run fails so the drift stays explicit.

## Install

```bash
npm install -g @hebilicious/wrangler-builds
```

## Required environment

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
```

## Config file

Example `workers-build.jsonc`:

```jsonc
{
  "scriptName": "my-worker",
  "buildCommand": "pnpm build",
  "rootDirectory": "apps/my-worker",
  "triggers": [
    {
      "name": "Deploy production",
      "deployCommand": "npx wrangler deploy --config wrangler.jsonc",
      "branchIncludes": ["main"],
      "branchExcludes": [],
      "pathIncludes": ["apps/my-worker/**"],
      "pathExcludes": []
    }
  ]
}
```

Top-level `buildCommand` and `rootDirectory` act as defaults for each trigger.

## Usage

Sync one config file:

```bash
wrangler-builds path/to/workers-build.jsonc
```

Preview changes without mutating Cloudflare:

```bash
wrangler-builds --dry-run path/to/workers-build.jsonc
```

Show the current Cloudflare state for one config file:

```bash
wrangler-builds show path/to/workers-build.jsonc
```

Advanced discovery for multiple configs:

```bash
wrangler-builds sync --cwd . --glob "**/workers-build.jsonc"
```

## Repository

This repository is a `pnpm` workspace managed with `moon` and `proto`.

Useful commands:

```bash
pnpm install
moon run wrangler-builds:build
moon run wrangler-builds:test
moon run wrangler-builds:e2e
moon run workspace:changeset
moon run workspace:changeset-status
moon run workspace:version
```

The live end-to-end suite runs against the example worker in
[`examples/live-e2e-worker`](./examples/live-e2e-worker).

Release workflow details live in [`PUBLISHING.md`](./PUBLISHING.md).
