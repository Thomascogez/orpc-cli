/**
 * CLI entry point for Cloudflare Workers example
 *
 * This example shows how to handle auth with a Cloudflare Workers router
 */

import { run } from "@drizzle-team/brocli";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { buildCommands } from "./.orpc-cli/index.js";
import type { AppRouter } from "./router.ts";

// Create your oRPC client
const link = new RPCLink({
	url: `http://localhost:3000/api/rpc`,
	headers: ({ context }) => {
		// Access CLI options via context.options for auth
		const token = context?.options?.token || process.env.API_TOKEN;
		return {
			...(token ? { authorization: `Bearer ${token}` } : {}),
		};
	},
});

const client: RouterClient<AppRouter> = createORPCClient(link);

// Build commands with the client
const commands = buildCommands(client);

// Run the CLI
run(commands, {
	name: "cf-mycli",
	description: "Cloudflare Workers CLI Example",
	version: "1.0.0",
});
