# @thomas.ca/orpc-cli

[![npm version](https://img.shields.io/npm/v/@thomas.ca/orpc-cli)](https://www.npmjs.com/package/@thomas.ca/orpc-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Generate a type-safe CLI HTTP client from your oRPC router. Perfect for AI agents and developers who love command-line tools.

> **What it does:** @thomas.ca/orpc-cli introspects your oRPC router at build time and generates [`@drizzle-team/brocli`](https://github.com/drizzle-team/brocli) command definitions. You bring your own oRPC client—we generate the command structure, not the full CLI.

## TL;DR

Turn your oRPC router into a CLI HTTP client. Define routes, generate brocli commands, and start making HTTP requests from the terminal. Your server code stays on the server—only the command structure is generated.

```bash
npx @thomas.ca/orpc-cli generate
npx tsx cli.ts users list --limit 10
```

## Features

- **Build-time code generation** — Router is introspected at build time, never bundled into the CLI
- **Nested subcommands** — Supports arbitrary depth (e.g., `inbox.message.list`)
- **Platform import stubbing** — Works with `cloudflare:workers`, `deno`, and other platform-specific imports via esbuild plugin
- **tsconfig paths** — Automatically resolved via esbuild
- **SSE streaming** — Detects async iterators and streams output with timestamps
- **Standard Schema** — Works with Zod, Valibot, ArkType, and any Standard Schema library

## Installation

```bash
npm install -D @thomas.ca/orpc-cli
npm install @drizzle-team/brocli @orpc/client
```

## Quick Start

@thomas.ca/orpc-cli generates **brocli command definitions**—not a complete CLI. You create the entry point, we generate the commands.

### 1. Define your router

```ts
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

### 2. Create config

```ts
// orpc-cli.config.ts
import { defineConfig } from "@thomas.ca/orpc-cli/config";
import { router } from "./router.ts";

export default defineConfig({
  router,
  output: ".orpc-cli",
});
```

### 3. Generate CLI

```bash
npx @thomas.ca/orpc-cli generate
```

### 4. Create CLI entry point

```ts
// cli.ts
import { run } from "@drizzle-team/brocli";
import { createORPCClient } from "@orpc/client";
import { buildCommands } from "./.orpc-cli/index.ts";
import type { AppRouter } from "./router.ts";

const client = createORPCClient<AppRouter>({
  baseURL: "http://localhost:3000/api",
});

run(buildCommands(client), {
  name: "mycli",
  description: "My generated CLI",
  version: "1.0.0",
});
```

### 5. Run CLI

```bash
npx tsx cli.ts users list --limit 10
npx tsx cli.ts users create --name "Alice" --email "alice@example.com"
```

## How It Works

```
┌────────────────────────────────────────────────────────────────┐
│                        Build Time                               │
├────────────────────────────────────────────────────────────────┤
│  orpc-cli.config.ts                                            │
│  └── Router imported and introspected                          │
│                                                                │
│  npx @thomas.ca/orpc-cli generate                                         │
│  ├── bundle-require loads config (esbuild + virtual modules)   │
│  ├── Platform stubs: cloudflare:workers → { env: Proxy }       │
│  ├── tsconfig paths resolved automatically                     │
│  ├── Router structure analyzed (no handlers executed)          │
│  └── .orpc-cli/index.ts generated                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                       Runtime (Your CLI)                        │
├────────────────────────────────────────────────────────────────┤
│  cli.ts                                                        │
│  ├── import { buildCommands } from "./.orpc-cli/index.ts"      │
│  ├── @orpc/client (no server code)                             │
│  └── buildCommands(client) → brocli commands                   │
└────────────────────────────────────────────────────────────────┘
```

Key points:

- Router is **never bundled** into your CLI
- Platform imports are **stubbed** via esbuild plugin (no temp files)
- Handlers are **not executed** during introspection
- tsconfig paths are **auto-resolved** via esbuild

## Authentication

Use environment variables to authenticate your CLI HTTP client:

```ts
// cli.ts
import { RPCLink } from "@orpc/client/fetch";

const link = new RPCLink({
  url: 'http://localhost:3000/api',
  headers: {
    authorization: process.env.API_TOKEN ? `Bearer ${process.env.API_TOKEN}` : undefined,
  },
});

const client = createORPCClient(link);
run(buildCommands(client), { name: "mycli", version: "1.0.0" });
```

```bash
API_TOKEN=abc123 npx tsx cli.ts users list --limit 10
```

## Platform-Specific Imports

@thomas.ca/orpc-cli stubs platform modules during config loading via an esbuild plugin. This means you can import Cloudflare Workers bindings in your router without issues:

```ts
// router.ts
import { env } from "cloudflare:workers";

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

Supported stubs:

- `cloudflare:workers` — `env` (Proxy), `ExecutionContext`, `ScheduledController`
- `deno` — empty object

## Configuration

### `defineConfig(options)`

```ts
import { defineConfig } from "@thomas.ca/orpc-cli/config";

defineConfig({
  // Required: Your oRPC router
  router: yourRouter,
  
  // Optional: Output directory (default: ".orpc-cli")
  output: ".orpc-cli",
});
```

## Generated Code

@thomas.ca/orpc-cli generates a `buildCommands(client)` function that returns [`@drizzle-team/brocli`](https://github.com/drizzle-team/brocli) command definitions. You wire these commands into your own CLI entry point.

**What gets generated:**

- `buildCommands(client)` — Function that takes an oRPC client and returns brocli command array
- Command definitions with options mapped from your Standard Schema inputs
- `processOutput()` helper — Handles JSON output and SSE streaming
- `handleError()` helper — Consistent error formatting

**What you write:**

- CLI entry point (using `run()` from brocli)
- oRPC client configuration
- Any custom middleware or setup

**Example input router:**

```ts
export const router = {
  users: {
    list: os
      .input(z.object({ 
        limit: z.number().default(10),
        active: z.boolean().default(true)
      }))
      .handler(async ({ input }) => ({ users: [] })),
  },
};
```

**Generated output:**

```ts
// Generated by orpc-cli - DO NOT EDIT
import { command, string, number, boolean } from "@drizzle-team/brocli";

async function processOutput(result: unknown): Promise<void> {
  // Handle async iterator / SSE streaming
  if (result && typeof (result as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function') {
    let index = 0;
    for await (const event of result as AsyncIterable<unknown>) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${++index}] ${JSON.stringify(event)}`);
    }
    return;
  }
  // Regular output
  console.log(JSON.stringify(result, null, 2));
}

function handleError(error: unknown): never {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(msg);
  process.exit(1);
}

export const buildCommands = (client: any) => {
  const users_list = command({
    name: "list",
    desc: "users.list",
    options: {
      limit: number("limit").desc("number").default(10),
      active: boolean("active").desc("boolean").default(true),
    },
    handler: async (opts) => {
      const { ...input } = opts;
      try {
        const result = await client.users.list(input, { context: { options: opts } });
        await processOutput(result);
      } catch (error) {
        handleError(error);
      }
    },
  });

  const users = command({
    name: "users",
    desc: "users commands",
    subcommands: [users_list],
  });

  return [users];
};
```

**Key generated features:**

- `processOutput()` — Handles both regular JSON and async iterator (SSE) streaming
- `handleError()` — Clean error output with `process.exit(1)`
- Type-safe defaults — Numbers without quotes, booleans as literals
- Nested subcommands — Arbitrary depth supported

### Output Format

Regular responses are pretty-printed JSON:

```bash
$ mycli users list
{
  "users": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ]
}
```

Errors show only the message:

```bash
$ mycli users get --id 999
User not found
```

Async iterators (SSE) are streamed with timestamps:

```bash
$ mycli events subscribe
[2024-01-15T10:30:00.000Z] [1] {"type":"update","data":"first"}
[2024-01-15T10:30:01.000Z] [2] {"type":"update","data":"second"}
```

## CLI Reference

### `npx @thomas.ca/orpc-cli generate`

Generate CLI code from your configuration.

**Aliases:** `gen`

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--cwd <path>` | Current working directory | `process.cwd()` |
| `--output <dir>` | Output directory (overrides config) | `""` |

**Config file resolution:**
Looks for config files in order:

1. `orpc-cli.config.ts`
2. `orpc-cli.config.mts`
3. `orpc-cli.config.js`
4. `orpc-cli.config.mjs`

## Examples

See the `examples/` directory:

- **`examples/basic/`** — Simple users/posts router
- **`examples/cloudflare/`** — Router using `cloudflare:workers` imports
- **`examples/nested/`** — Deep nesting: `inbox.message.list`, `workspace.project.task.create`

## License

MIT
