# orpc-cli

Generate command-line interfaces from oRPC routers and clients using Standard Schema.

## Features

- 🔥 **Build-time code generation** - Router is only used at build time, not bundled into CLI
- 📦 **Standard Schema support** - Works with Zod, Valibot, ArkType, and any Standard Schema library
- 🎯 **Type-safe** - Full TypeScript support with generated types
- 🌲 **Nested commands** - Automatic subcommands for nested routers
- ⚡ **Fast** - Uses c12 for fast TypeScript config loading
- 🚀 **Built with brocli** - Both orpc-cli itself and generated CLIs use brocli
- 🔄 **Platform module stubbing** - Works with `cloudflare:workers`, `deno`, and other platform-specific imports

## Installation

```bash
npm install -D orpc-cli
npm install @drizzle-team/brocli @orpc/client
```

## Quick Start

### 1. Create your oRPC router

```typescript
// router.ts
import { os } from "@orpc/server";
import { z } from "zod";

export const router = {
  users: {
    list: os
      .input(z.object({ 
        limit: z.number().optional().describe("Maximum number of users")
      }))
      .handler(async ({ input }) => ({ users: [] })),
    
    create: os
      .input(z.object({ 
        name: z.string().describe("User name"),
        email: z.string().email().describe("User email")
      }))
      .handler(async ({ input }) => ({ id: 1, ...input })),
  },
};

export type AppRouter = typeof router;
```

### 2. Create `orpc-cli.config.ts`

```typescript
import { defineConfig } from "orpc-cli/config";
import { router } from "./router.ts";

export default defineConfig({
  router,
  output: ".orpc-cli",  // Output directory for generated code
});
```

### 3. Generate CLI commands

```bash
npx orpc-cli generate
```

This creates `.orpc-cli/index.ts` with a `buildCommands(client)` function.

### 4. Create your CLI entry point

```typescript
// cli.ts
import { run } from "@drizzle-team/brocli";
import { createORPCClient } from "@orpc/client";
import { buildCommands } from "./.orpc-cli/index.ts";
import type { AppRouter } from "./router.ts";

const client = createORPCClient<AppRouter>({
  baseURL: "http://localhost:3000/api",
});

const commands = buildCommands(client);

run(commands, {
  name: "mycli",
  description: "My generated CLI",
  version: "1.0.0",
});
```

### 5. Run your CLI

```bash
npx tsx cli.ts users list --limit 10
npx tsx cli.ts users create --name "Alice" --email "alice@example.com"
```

## Authentication

The generated CLI passes all command-line options to the oRPC client context, allowing you to handle authentication in your client setup:

```typescript
// cli.ts
import { run } from "@drizzle-team/brocli";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { buildCommands } from "./.orpc-cli/index.js";

const link = new RPCLink({
  url: 'http://localhost:3000/api',
  headers: ({ context }) => {
    // Access CLI options via context.options
    const token = context?.options?.token || process.env.API_TOKEN;
    return {
      authorization: token ? `Bearer ${token}` : undefined,
    };
  },
});

const client = createORPCClient(link);
const commands = buildCommands(client);

run(commands, { name: "mycli", version: "1.0.0" });
```

Now you can pass auth tokens via CLI:

```bash
npx tsx cli.ts users list --token abc123 --limit 10
# Or use environment variable
API_TOKEN=abc123 npx tsx cli.ts users list --limit 10
```

## Output

Output is formatted as pretty-printed JSON by default:

```bash
$ mycli users list --limit 10
{
  "users": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ]
}
```

### Error Handling

Errors are displayed cleanly with just the error message:

```bash
$ mycli users get --id 999
User not found
```

### Streaming / SSE Support

If your procedure returns an async iterator (e.g., for Server-Sent Events), the CLI automatically detects and streams the output with timestamps:

```typescript
// In your router
subscribe: os.handler(async function* () {
  yield { type: "update", data: "first" };
  yield { type: "update", data: "second" };
})
```

```bash
$ mycli events subscribe
[2024-01-15T10:30:00.000Z] [1] {"type":"update","data":"first"}
[2024-01-15T10:30:01.000Z] [2] {"type":"update","data":"second"}
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         Build Time                              │
├─────────────────────────────────────────────────────────────────┤
│  orpc-cli.config.ts                                             │
│  ├── imports your Router (with all server-side code)            │
│  └── passes it to defineConfig()                                │
│                                                                  │
│  npx orpc-cli generate                                          │
│  ├── creates virtual module stubs in memory                     │
│  │   └── cloudflare:workers → { env: Proxy, ... }              │
│  ├── loads config via c12 + jiti (TypeScript support)           │
│  │   └── virtualModules: { "cloudflare:workers": stub }        │
│  ├── introspects router structure & schemas                     │
│  ├── extracts input schemas from Standard Schema                │
│  └── generates .orpc-cli/index.ts                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Runtime (Your CLI)                         │
├─────────────────────────────────────────────────────────────────┤
│  cli.ts                                                         │
│  ├── imports { buildCommands } from "./.orpc-cli/index.ts"     │
│  ├── creates @orpc/client (no server code!)                     │
│  └── buildCommands(client) → command definitions                │
│                                                                  │
│  npx tsx cli.ts users list                                      │
│  └── runs the command using only the client                     │
└─────────────────────────────────────────────────────────────────┘
```

**Key points**:
- The router is **never bundled** into your CLI - only used at build time
- Platform-specific imports (`cloudflare:workers`, etc.) are **automatically stubbed** in memory
- Handler code is **never executed** during introspection - only structure is analyzed
- No temporary files - virtual modules are handled entirely in memory by jiti

## Configuration

### `defineConfig(options)`

```typescript
import { defineConfig } from "orpc-cli/config";

defineConfig({
  // Required: Your oRPC router
  router: yourRouter,
  
  // Optional: Output directory (default: ".orpc-cli")
  output: ".orpc-cli",
});
```

## Generated Code

The generator creates a `buildCommands(client)` function that:

- Returns an array of brocli command definitions
- One command per procedure in your router
- Nested subcommands for nested routers
- Options derived from your Standard Schema input types
- Type hints and descriptions from schema `.describe()`

Example output:

```typescript
// Generated by orpc-cli - DO NOT EDIT
import { command, string, number, run } from "@drizzle-team/brocli";

export const buildCommands = (client: any) => {
  const users_list = command({
    name: "list",
    desc: "users.list",
    options: {
      limit: number("limit").desc("Maximum number of users").default(""),
    },
    handler: (opts) => client.users.list(opts),
  });

  const users = command({
    name: "users",
    desc: "users commands",
    subcommands: [users_list],
  });

  return [users];
};
```

## Schema Support

orpc-cli supports any Standard Schema library:

- **Zod**: `z.object({ ... }).describe("...")`
- **Valibot**: `v.object({ ... })` with descriptions
- **ArkType**: `type({ ... })` with metadata

Option types are inferred from schema types:
- `z.string()` → `--key <value>`
- `z.number()` → `--key <number>`
- `z.boolean()` → `--key` (flag)
- `z.enum([...])` → `--key <value>` with choices
- `.optional()` → optional flag
- `.default(value)` → default value

## CLI Commands

orpc-cli uses **brocli** for its own command-line interface.

### `npx orpc-cli generate`

Generates CLI code from your configuration.

```bash
npx orpc-cli generate
```

Looks for config files in this order:
- `orpc-cli.config.ts`
- `orpc-cli.config.js`
- `orpc-cli.config.mjs`

**Options:**

```
      --config string   Path to config file (default: "")
      --output string   Output directory (overrides config) (default: "")
  -h, --help            help for generate
  -v, --version         version for orpc-cli
```

**Aliases:** `gen`

### `npx orpc-cli --help`

Shows help information.

### `npx orpc-cli --version`

Shows version information.

## Platform-Specific Imports

orpc-cli automatically stubs platform-specific modules during router introspection, so you can use:

- `cloudflare:workers` (env, ExecutionContext, etc.)
- Other platform modules as needed

This means your router can safely import Cloudflare Workers bindings, and orpc-cli will generate CLI code without issues:

```typescript
// router.ts - This works!
import { env } from "cloudflare:workers";
import { os } from "@orpc/server";

export const router = {
  users: {
    get: os
      .input(z.object({ id: z.number() }))
      .handler(async ({ input }) => {
        const db = env.DB; // Safe - only used at runtime
        return db.get(input.id);
      }),
  },
};
```

### How Module Stubbing Works

When orpc-cli loads your config file, it uses **jiti's virtualModules feature**:

1. **Virtual Modules**: Platform modules like `cloudflare:workers` are stubbed with JavaScript objects
2. **No File I/O**: Stubs exist only in memory - no temp files created
3. **Introspection**: The router is loaded and analyzed without executing handlers
4. **Automatic**: Works transparently with no configuration needed

The handlers are **never executed** during introspection - only the router structure and schemas are analyzed.

## Examples

See the `examples/` directory for complete working examples:

- `examples/basic/` - Simple example without platform imports
- `examples/cloudflare/` - Example with Cloudflare Workers imports

## License

MIT
