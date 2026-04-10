#!/usr/bin/env node

/**
 * CLI entry point for orpc-cli using brocli
 *
 * Usage: npx orpc-cli generate
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { command, run, string } from "@drizzle-team/brocli";
import { bundleRequire } from "bundle-require";
import type * as esbuild from "esbuild";
import { generateCLICode } from "./generator.js";
import { introspectRouterRuntime } from "./introspect.js";
import type { CLIGenConfig } from "./types.js";

/**
 * Create esbuild plugin for virtual modules (platform-specific stubs)
 */
const createVirtualModulesPlugin = (): esbuild.Plugin => {
	return {
		name: "virtual-modules",
		setup(build) {
			// Cloudflare Workers stub
			build.onResolve({ filter: /^cloudflare:workers$/ }, (args) => ({
				path: args.path,
				namespace: "virtual-module",
			}));

			build.onLoad(
				{ filter: /^cloudflare:workers$/, namespace: "virtual-module" },
				() => ({
					contents: `
					export const env = new Proxy({}, {
						get(_, prop) {
							return undefined;
						}
					});
					export class ExecutionContext {
						waitUntil() {}
						passThroughOnException() {}
					}
					export class ScheduledController {
						constructor(scheduledTime, cron) {
							this.scheduledTime = scheduledTime;
							this.cron = cron;
						}
					}
				`,
					loader: "js",
				}),
			);

			// Deno stub (if needed in future)
			build.onResolve({ filter: /^deno$/ }, (args) => ({
				path: args.path,
				namespace: "virtual-module",
			}));

			build.onLoad({ filter: /^deno$/, namespace: "virtual-module" }, () => ({
				contents: `export default {};`,
				loader: "js",
			}));
		},
	};
};

/**
 * Find config file path
 */
const findConfigFile = async (cwd: string): Promise<string | null> => {
	const configFiles = [
		"orpc-cli.config.ts",
		"orpc-cli.config.mts",
		"orpc-cli.config.js",
		"orpc-cli.config.mjs",
	];

	for (const file of configFiles) {
		const fullPath = path.join(cwd, file);
		try {
			await fs.access(fullPath);
			return fullPath;
		} catch { }
	}

	return null;
};

/**
 * Load config using bundle-require with TypeScript support and platform module stubbing
 */
const loadConfig = async (options?: {
	cwd?: string;
}): Promise<CLIGenConfig> => {
	console.log("  Looking for config file...");

	const cwd = options?.cwd || process.cwd();
	const configFile = await findConfigFile(cwd);

	if (!configFile) {
		throw new Error(
			"Config file not found. Please create orpc-cli.config.ts (or .mts, .js, .mjs)",
		);
	}

	console.log(`  Found config file: ${configFile}`);

	// Use bundle-require to load the config file
	const { mod, dependencies } = await bundleRequire<{
		default?: CLIGenConfig;
		config?: CLIGenConfig;
	}>({
		filepath: configFile,
		esbuildOptions: {
			plugins: [createVirtualModulesPlugin()],
			platform: "node",
			target: "node20",
		},
	});

	// Support both default export and named export
	const config = mod.default || mod;

	if (!config) {
		throw new Error("Config file must export a default export or named export");
	}

	console.log(`  ✓ Loaded config (dependencies: ${dependencies.length})`);
	return config as CLIGenConfig;
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
		const code = generateCLICode(procedures);

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
