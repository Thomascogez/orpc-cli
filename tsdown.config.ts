import { defineConfig } from "tsdown/config";

export default defineConfig({
	entry: ["src/index.ts", "src/cli.ts", "src/config.ts"],
	outDir: "dist",
	sourcemap: false,
	dts: true,
	format: ["esm"],
	deps: {
		neverBundle: [
			"esbuild",
			"bundle-require",
			"ts-morph",
			"@orpc/server",
			"@orpc/client",
			"@standard-schema/spec",
			"@types/json-schema",
		],
	},
});
