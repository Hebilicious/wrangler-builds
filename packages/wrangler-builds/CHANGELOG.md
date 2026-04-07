# @hebilicious/wrangler-builds

## 0.1.0

### Minor Changes

- 4b1dcfa: Improve the CLI around explicit single-file workflows.

  - make `wrangler-builds <path-to-workers-build.jsonc>` the primary sync command
  - add `wrangler-builds show <path-to-workers-build.jsonc>` to inspect the current Cloudflare config
  - keep `sync --cwd --glob ...` as the advanced discovery flow
