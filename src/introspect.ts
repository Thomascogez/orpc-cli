/**
 * Router introspection using TypeScript compiler API
 */

import type { JSONSchema7 } from "json-schema";
import type { ProcedureInfo, SchemaProperty } from "./types.js";


export const introspectRouterRuntime = (
	router: unknown,
	path: string[] = [],
	procedures: ProcedureInfo[] = [],
): ProcedureInfo[] => {
	if (typeof router !== "object" || router === null) {
		return procedures;
	}

	for (const [key, value] of Object.entries(router)) {
		// Skip internal properties
		if (
			key.startsWith("~") ||
			key.startsWith("_") ||
			key === "$config" ||
			key === "$meta"
		) {
			continue;
		}

		const currentPath = [...path, key];

		// Check if it's a procedure (has ~orpc property)
		if (typeof value === "object" && value !== null && "~orpc" in value) {
			const orpcDef = (value as Record<string, unknown>)["~orpc"] as
				| Record<string, unknown>
				| undefined;
			if (orpcDef) {
				// Extract input schema from Standard Schema
				const inputSchema = orpcDef.inputSchema as
					| {
						"~standard"?: {
							jsonSchema?: {
								input: (opts: { target: string }) => JSONSchema7;
							};
						};
					}
					| undefined;
				const schema = inputSchema?.["~standard"]?.jsonSchema?.input({
					target: "draft-07",
				});

				procedures.push({
					path: currentPath.join("."),
					inputSchema: schema,
				});
			}
		} else if (typeof value === "object" && value !== null) {
			introspectRouterRuntime(value, currentPath, procedures);
		}
	}

	return procedures;
};

/**
 * Get properties from JSON Schema
 */
export const getSchemaProperties = (schema: JSONSchema7): SchemaProperty[] => {
	const properties: SchemaProperty[] = [];

	if (!schema.properties) {
		return properties;
	}

	for (const [key, propSchema] of Object.entries(schema.properties)) {
		if (typeof propSchema !== "object" || propSchema === null) {
			continue;
		}

		const isRequired = schema.required?.includes(key) ?? false;

		properties.push({
			key,
			schema: propSchema as JSONSchema7,
			required: isRequired && (propSchema as JSONSchema7).default === undefined,
			defaultValue: (propSchema as JSONSchema7).default,
		});
	}

	return properties;
};

/**
 * Check if schema is an array type
 */
export const isArraySchema = (schema: JSONSchema7): boolean => {
	if (Array.isArray(schema.type)) {
		return schema.type.includes("array");
	}
	return schema.type === "array";
};

/**
 * Check if schema is an object type
 */
export const isObjectSchema = (schema: JSONSchema7): boolean => {
	if (Array.isArray(schema.type)) {
		return schema.type.includes("object");
	}
	return schema.type === "object";
};

/**
 * Get type hint for schema
 */
export const getSchemaTypeHint = (schema: JSONSchema7): string => {
	if (schema.enum && Array.isArray(schema.enum)) {
		return `enum: ${schema.enum.join(", ")}`;
	}
	if (Array.isArray(schema.type)) {
		return schema.type.join(" | ");
	}
	return schema.type || "value";
};
