# `@hebilicious/wrangler-builds`

Standalone utility for keeping Cloudflare Workers Build trigger settings in sync
with repo-managed `workers-build.jsonc` files.

## Scope

The package:

1. Discovers config files from an explicit path list or a caller-provided
   `cwd` plus glob.
2. Parses `workers-build.jsonc` with real JSONC support.
3. Validates configs against a checked-in JSON schema.
4. Resolves remote Cloudflare Workers Build triggers for each configured Worker.
5. Computes a deterministic sync plan.
6. Patches only existing triggers whose mutable fields drift from config.

The package does not create or delete triggers. Missing remote triggers fail the
run so drift stays explicit.

## CLI

```bash
wrangler-builds --dry-run
wrangler-builds --cwd . --glob "**/workers-build.jsonc"
wrangler-builds path/to/workers-build.jsonc other/workers-build.jsonc
```

Required environment variables:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
