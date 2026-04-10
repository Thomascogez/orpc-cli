/**
 * Configuration helper for orpc-cli
 *
 * @example
 * ```typescript
 * import { defineConfig } from "orpc-cli/config";
 * import { router } from "./src/router";
 *
 * export default defineConfig({
 *   router,
 *   output: ".orpc-cli",
 * });
 * ```
 */

import type { CLIGenConfig } from "./types.js";

/**
 * Define orpc-cli configuration
 */
export const defineConfig = (config: CLIGenConfig): CLIGenConfig => {
	return {
		output: ".orpc-cli",
		...config,
	};
};
