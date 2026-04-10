import { defineConfig } from "../../src/config.js";
import { router } from "./router.js";

export default defineConfig({
	router,
	output: ".orpc-cli",
});
