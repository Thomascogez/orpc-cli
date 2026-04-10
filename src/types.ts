/**
 * Core types for orpc-cli
 */

import type { JSONSchema7 } from "json-schema";

/**
 * Configuration options for orpc-cli
 */
export interface CLIGenConfig {
	/** oRPC router for type introspection (build-time only) */
	router: unknown;
	/** Output folder for generated code (default: ".orpc-cli") */
	output?: string;
}

/**
 * Discovered procedure info from router introspection
 */
export interface ProcedureInfo {
	/** Full path (e.g., "users.create") */
	path: string;
	/** Input JSON schema */
	inputSchema?: JSONSchema7;
	/** Description if available */
	description?: string;
}

/**
 * JSON Schema property info
 */
export interface SchemaProperty {
	key: string;
	schema: JSONSchema7;
	required: boolean;
	defaultValue?: unknown;
}
