# Cloudflare Workers Example

This example demonstrates using orpc-cli with a router that imports `cloudflare:workers`.

## Files

- `router.ts` - oRPC router with Cloudflare Workers imports
- `orpc-cli.config.ts` - Configuration
- `test-cli.ts` - Test CLI entry point

## Key Point

The router imports `cloudflare:workers`:

```typescript
import { env } from "cloudflare:workers";

export const router = {
  users: {
    get: os
      .input(z.object({ id: z.number() }))
      .handler(async ({ input }) => {
        const db = env.DB; // Uses Cloudflare D1 binding
        return db.get(input.id);
      }),
  },
};
```

But this works fine with orpc-cli because:
1. The import is automatically stubbed using jiti's `virtualModules` feature
2. Stubs exist only in memory - no temp files created
3. Handler code is never executed - only router structure is analyzed
4. Full schema metadata (descriptions, defaults, etc.) is extracted

## Usage

```bash
# Generate CLI
npx orpc-cli generate

# Test the CLI
npx tsx test-cli.ts --help
npx tsx test-cli.ts users list --limit 10
npx tsx test-cli.ts users create --name "Alice" --email "alice@example.com"
```
