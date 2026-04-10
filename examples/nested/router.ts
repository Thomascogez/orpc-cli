import { os } from "@orpc/server";
import { z } from "zod";

/**
 * Deeply nested router for testing multi-level command structure
 * Structure: inbox.message.list, inbox.message.get, inbox.folder.list, etc.
 */
export const router = {
	inbox: {
		message: {
			list: os
				.input(
					z.object({
						folder: z.string().optional().describe("Filter by folder name"),
						unread: z.boolean().optional().describe("Filter unread messages"),
					}),
				)
				.handler(async ({ input }) => ({
					messages: [{ id: 1, subject: "Hello", from: "alice@example.com" }],
					total: 1,
				})),

			get: os
				.input(
					z.object({
						id: z.number().describe("Message ID"),
					}),
				)
				.handler(async ({ input }) => ({
					id: input.id,
					subject: "Hello",
					body: "World",
				})),

			send: os
				.input(
					z.object({
						to: z.string().email().describe("Recipient email"),
						subject: z.string().describe("Message subject"),
						body: z.string().describe("Message body"),
					}),
				)
				.handler(async ({ input }) => ({
					sent: true,
					id: Math.floor(Math.random() * 1000),
				})),
		},

		folder: {
			list: os.handler(async () => ({
				folders: [
					{ id: 1, name: "Inbox", count: 5 },
					{ id: 2, name: "Sent", count: 3 },
				],
			})),

			create: os
				.input(
					z.object({
						name: z.string().describe("Folder name"),
					}),
				)
				.handler(async ({ input }) => ({
					id: Math.floor(Math.random() * 1000),
					name: input.name,
				})),
		},
	},

	// Also test deeply nested structure (4 levels)
	workspace: {
		project: {
			task: {
				list: os.handler(async () => ({ tasks: [] })),
				create: os
					.input(z.object({ title: z.string().describe("Task title") }))
					.handler(async ({ input }) => ({ id: 1, title: input.title })),
			},
		},
	},
};

export type AppRouter = typeof router;
