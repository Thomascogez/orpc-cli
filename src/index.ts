/**
 * orpc-cli - Generate command-line interfaces from oRPC routers
 *
 * @example
 * ```typescript
 * // orpc-cli.config.ts
 * import { defineConfig } from "orpc-cli/config";
 * import { router } from "./src/router";
 *
 * export default defineConfig({
 *   router,
 *   output: ".orpc-cli",
 * });
 * ```
 *
 * @example
 * ```bash
 * # Generate CLI
 * npx orpc-cli generate
 *
 * # Use generated commands
 * import { buildCommands } from "./.orpc-cli";
 * import { client } from "./client";
 * import { run } from "@drizzle-team/brocli";
 *
 * const commands = buildCommands(client);
 * run(commands, { name: "mycli", version: "1.0.0" });
 * ```
 */

// Re-export types for users who need them
export type {
	CLIGenConfig,
	ProcedureInfo,
	SchemaProperty,
} from "./types.js";

