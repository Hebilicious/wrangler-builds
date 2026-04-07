# `@hebilicious/wrangler-builds`

Keep Cloudflare Workers Build trigger settings in sync with checked-in
`workers-build.jsonc` files.

## Install

```bash
npm install -g @hebilicious/wrangler-builds
```

## CLI

```bash
wrangler-builds path/to/workers-build.jsonc
wrangler-builds --dry-run path/to/workers-build.jsonc
wrangler-builds show path/to/workers-build.jsonc
wrangler-builds sync --cwd . --glob "**/workers-build.jsonc"
```

Required environment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

For repository docs, config examples, and release workflow details, see
[github.com/Hebilicious/wrangler-builds](https://github.com/Hebilicious/wrangler-builds).
