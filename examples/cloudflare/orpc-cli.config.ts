/**
 * orpc-cli configuration for Cloudflare Workers example
 */

import { defineConfig } from "orpc-cli/config";
import { router } from "./router.ts";

export default defineConfig({
	router,
	output: ".orpc-cli",
});
