/**
 * Example: Complete orpc-cli workflow
 *
 * This example demonstrates the full workflow:
 * 1. Define your oRPC router
 * 2. Create orpc-cli.config.ts
 * 3. Run `npx orpc-cli generate` to generate CLI commands
 * 4. Create a CLI entry point that uses the generated commands
 * 5. Run your CLI!
 */

// ============================================================================
// Step 1: Define your router (router.ts)
// ============================================================================

import { os } from "@orpc/server";
import { z } from "zod";

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
                // In a real app, this would fetch from database
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
                return { id: Math.floor(Math.random() * 1000), ...input };
            }),

        get: os
            .input(
                z.object({
                    id: z.number().describe("User ID"),
                }),
            )
            .handler(async ({ input }) => {
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
                return { id: Math.floor(Math.random() * 1000), ...input };
            }),
    },
};

export type AppRouter = typeof router;
