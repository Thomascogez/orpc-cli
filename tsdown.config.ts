import { defineConfig } from "tsdown/config";

export default defineConfig({
	entry: ["src/index.ts", "src/cli.ts", "src/config.ts"],
	outDir: "dist",
	sourcemap: false,
	dts: true,
	format: ["esm"],
	noExternal: [], // Allow bundling of @orpc/* packages if needed at build time
});
