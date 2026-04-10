/**
 * Example router with Cloudflare Workers imports
 * Used to test module stubbing
 */

import { os } from "@orpc/server";
import { z } from "zod";
import { env } from "cloudflare:workers";

// This router imports cloudflare:workers but the import is stubbed during introspection
export const router = {
	users: {
		list: os
			.input(
				z.object({
					limit: z
						.number()
						.optional()
						.describe("Maximum number of users to return"),
					offset: z.number().optional().describe("Offset for pagination"),
				}),
			)
			.handler(async ({ input }) => {
				// This code uses env.DB but is NOT executed during introspection
				// It's safe because stubbing provides undefined for env bindings
				const db = env.DB;
				return {
					users: [
						{ id: 1, name: "Alice", email: "alice@example.com" },
						{ id: 2, name: "Bob", email: "bob@example.com" },
					],
					total: 2,
				};
			}),

		create: os
			.input(
				z.object({
					name: z.string().min(1).describe("User's full name"),
					email: z.string().email().describe("User's email address"),
					role: z.enum(["admin", "user"]).default("user").describe("User role"),
				}),
			)
			.handler(async ({ input }) => {
				const db = env.DB;
				return { id: Math.floor(Math.random() * 1000), ...input };
			}),

		get: os
			.input(
				z.object({
					id: z.number().describe("User ID"),
				}),
			)
			.handler(async ({ input }) => {
				const db = env.DB;
				return {
					id: input.id,
					name: "Alice",
					email: "alice@example.com",
					role: "admin",
				};
			}),
	},

	posts: {
		list: os
			.input(
				z.object({
					authorId: z.number().optional().describe("Filter by author ID"),
					published: z
						.boolean()
						.optional()
						.describe("Filter by published status"),
				}),
			)
			.handler(async ({ input }) => {
				return { posts: [] };
			}),

		create: os
			.input(
				z.object({
					title: z.string().min(1).describe("Post title"),
					content: z.string().describe("Post content"),
					authorId: z.number().describe("Author user ID"),
					published: z
						.boolean()
						.default(false)
						.describe("Whether the post is published"),
				}),
			)
			.handler(async ({ input }) => {
				const db = env.DB;
				return { id: Math.floor(Math.random() * 1000), ...input };
			}),
	},
};

export type AppRouter = typeof router;
