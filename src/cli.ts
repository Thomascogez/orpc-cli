#!/usr/bin/env node

/**
 * CLI entry point for orpc-cli using brocli
 *
 * Usage: npx orpc-cli generate
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { command, run, string } from "@drizzle-team/brocli";
import { loadConfig as loadC12Config } from "c12";
import { createJiti } from "jiti";
import { generateCLICode } from "./generator.js";
import { introspectRouterRuntime } from "./introspect.js";
import type { CLIGenConfig } from "./types.js";

/**
 * Create virtual module stubs for platform-specific imports
 * Using jiti's virtualModules feature - takes actual module objects, not file paths
 */
const createVirtualModules = (): Record<string, unknown> => {
	return {
		// Cloudflare Workers stub
		"cloudflare:workers": {
			env: new Proxy(
				{},
				{
					get(_, prop) {
						return undefined;
					},
				},
			),
			ExecutionContext: class ExecutionContext {
				waitUntil(): void { }
				passThroughOnException(): void { }
			},
			ScheduledController: class ScheduledController {
				constructor(
					readonly scheduledTime: number,
					readonly cron: string,
				) { }
			},
		},
		// Deno stub (if needed in future)
		deno: {
			default: {},
		},
	};
};

/**
 * Load config using c12 with jiti for TypeScript support and platform module stubbing
 */
const loadConfig = async (options?: {
	cwd?: string;
}): Promise<CLIGenConfig> => {
	console.log("  Looking for config file...");

	// Create jiti instance with virtual modules for platform stubs
	const jiti = createJiti(import.meta.url, {
		interopDefault: true,
		moduleCache: false,
		tsconfigPaths: true,
		virtualModules: createVirtualModules(),
	});

	const { config, configFile } = await loadC12Config<CLIGenConfig>({
		name: "orpc-cli",
		cwd: options?.cwd,
		configFile: "orpc-cli.config",
		configFileRequired: true,
		// Use jiti with virtual modules for importing config files
		import: (id: string) => jiti.import(id),
	});

	if (!config) {
		throw new Error("Failed to load config file");
	}

	console.log(`  ✓ Loaded config from: ${configFile || "default"}`);
	return config;
};

/**
 * Ensure output directory exists
 */
const ensureOutputDir = async (outputPath: string): Promise<void> => {
	try {
		await fs.mkdir(outputPath, { recursive: true });
	} catch (error) {
		throw new Error(`Failed to create output directory: ${error}`);
	}
};

/**
 * Generate command
 */
const generateCmd = command({
	name: "generate",
	aliases: ["gen"],
	desc: "Generate CLI commands from oRPC router",
	options: {
		cwd: string("cwd").desc("Current working directory").default(process.cwd()),
		output: string("output")
			.desc("Output directory (overrides config)")
			.default(""),
	},
	handler: async (opts) => {
		console.log("🔍 Loading config...");
		const config = await loadConfig({ cwd: opts.cwd });

		const outputDir = opts.output || config.output || ".orpc-cli";

		console.log("🔍 Introspecting router...");
		const procedures = introspectRouterRuntime(config.router);

		if (procedures.length === 0) {
			console.warn("⚠️  No procedures found in router");
			return;
		}

		console.log(`✓ Found ${procedures.length} procedures`);

		console.log("📝 Generating CLI code...");
		const code = generateCLICode(procedures, {
			name: "cli",
			description: "Generated CLI",
		});

		console.log(`📁 Writing to ${outputDir}/index.ts...`);
		await ensureOutputDir(outputDir);
		await fs.writeFile(path.join(outputDir, "index.ts"), code, "utf-8");

		console.log("✅ Done!");
		console.log("");
		console.log("Next steps:");
		console.log(`  1. Import the generated commands:`);
		console.log(
			`     import { buildCommands } from "./${outputDir}/index.ts";`,
		);
		console.log(`  2. Create your CLI entry point:`);
		console.log(`     const commands = buildCommands(client);`);
		console.log(`     run(commands, { name: "mycli", version: "1.0.0" });`);
	},
});

/**
 * Main CLI
 */
run([generateCmd], {
	name: "orpc-cli",
	description: "Generate CLI from oRPC router",
	version: "1.0.0",
});
