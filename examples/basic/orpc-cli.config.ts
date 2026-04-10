/**
 * orpc-cli configuration for the example
 */

import { defineConfig } from "orpc-cli/config";
import { router } from "./router.ts";

export default defineConfig({
    router,
    output: ".orpc-cli",
});
