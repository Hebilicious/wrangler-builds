# `wrangler-builds`

This repository is a `pnpm` workspace managed with `moon` and `proto`.

The publishable package lives in `packages/wrangler-builds` and provides the
`wrangler-builds` CLI for syncing Cloudflare Workers Build triggers from
checked-in `workers-build.jsonc` files.

Common commands:

```bash
pnpm install
moon run wrangler-builds:build
moon run wrangler-builds:test
```
