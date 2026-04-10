/**
 * orpc-cli configuration for the example
 */

import { defineConfig } from "@thomas.ca/orpc-cli/config";
import { router } from "./router.ts";

export default defineConfig({
    router,
    output: ".orpc-cli",
});
