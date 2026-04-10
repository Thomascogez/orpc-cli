/**
 * Test the generated CLI
 */

import { run } from "@drizzle-team/brocli";
import { buildCommands } from "./.orpc-cli/index.ts";

// Mock client for testing
const mockClient = {
    users: {
        list: async (opts: any) => {
            console.log("Called users.list with:", opts);
            return {
                users: [
                    { id: 1, name: "Alice", email: "alice@example.com" },
                    { id: 2, name: "Bob", email: "bob@example.com" },
                ],
                total: 2,
            };
        },
        create: async (opts: any) => {
            console.log("Called users.create with:", opts);
            return { id: 999, ...opts };
        },
        get: async (opts: any) => {
            console.log("Called users.get with:", opts);
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
            console.log("Called posts.list with:", opts);
            return { posts: [] };
        },
        create: async (opts: any) => {
            console.log("Called posts.create with:", opts);
            return { id: 888, ...opts };
        },
    },
};

const commands = buildCommands(mockClient);

run(commands, {
    name: "mycli",
    description: "My generated CLI",
    version: "1.0.0",
});
