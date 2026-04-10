/**
 * Test CLI for Cloudflare Workers example
 */

import { run } from "@drizzle-team/brocli";
import { buildCommands } from "./.orpc-cli/index.ts";

// Mock client that simulates Cloudflare Workers environment
const mockClient = {
	users: {
		list: async (opts: any) => {
			console.log("[CF Worker] users.list called with:", opts);
			return {
				users: [
					{ id: 1, name: "Alice", email: "alice@example.com" },
					{ id: 2, name: "Bob", email: "bob@example.com" },
				],
				total: 2,
			};
		},
		create: async (opts: any) => {
			console.log("[CF Worker] users.create called with:", opts);
			return { id: 999, ...opts };
		},
		get: async (opts: any) => {
			console.log("[CF Worker] users.get called with:", opts);
			return {
				id: opts.id,
				name: "Alice",
				email: "alice@example.com",
				role: "admin",
			};
		},
	},
	posts: {
		list: async (opts: any) => {
			console.log("[CF Worker] posts.list called with:", opts);
			return { posts: [] };
		},
		create: async (opts: any) => {
			console.log("[CF Worker] posts.create called with:", opts);
			return { id: 888, ...opts };
		},
	},
};

const commands = buildCommands(mockClient);

run(commands, {
	name: "cf-mycli",
	description: "Cloudflare Workers CLI Example",
	version: "1.0.0",
});
