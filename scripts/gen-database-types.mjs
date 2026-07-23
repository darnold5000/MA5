#!/usr/bin/env node
/**
 * Generate src/types/database.ts from Signal Works Supabase PostgREST OpenAPI.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in env
 * (load MA5/.env.local or signalworks-clients/.env.local before running).
 *
 * Preferred after `supabase login`: npm run gen:types:cli
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, "..", "signalworks-clients", ".env.local"));

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = serviceKey || anonKey;

if (!baseUrl || !apiKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).",
  );
  process.exit(1);
}

const openApiUrl = `${baseUrl}/rest/v1/?apikey=${encodeURIComponent(apiKey)}`;
const res = await fetch(openApiUrl, {
  headers: {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/openapi+json",
  },
});

if (!res.ok) {
  console.error(`OpenAPI fetch failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}

/** @type {Record<string, { type?: string; properties?: Record<string, unknown>; required?: string[]; format?: string; items?: unknown; enum?: string[] }>} */
const definitions = (await res.json()).definitions ?? {};

function tsType(prop, { nullable = false } = {}) {
  if (!prop) return "unknown";
  if (Array.isArray(prop.type)) {
    const base = prop.type.filter((t) => t !== "null");
    const isNullable = prop.type.includes("null") || nullable;
    const inner = tsType({ ...prop, type: base[0] ?? "string" });
    return isNullable ? `${inner} | null` : inner;
  }
  if (prop.enum?.length) {
    const base = prop.enum.map((v) => JSON.stringify(v)).join(" | ");
    return nullable ? `${base} | null` : base;
  }
  let base = "unknown";
  if (prop.type === "integer" || prop.type === "number") base = "number";
  else if (prop.type === "boolean") base = "boolean";
  else if (prop.type === "string") base = "string";
  else if (prop.type === "array") {
    const inner = tsType(
      typeof prop.items === "object" ? prop.items : { type: "string" },
    );
    base = `${inner}[]`;
  } else if (prop.type === "object") base = "Json";
  return nullable || prop.nullable ? `${base} | null` : base;
}

function colType(schema, required) {
  const nullable = Boolean(schema?.nullable);
  const optional = !required;
  const type = tsType(schema, { nullable });
  return `${optional ? "?" : ""}: ${type}`;
}

function rowType(def) {
  const props = def.properties ?? {};
  const req = new Set(def.required ?? []);
  const lines = Object.entries(props).map(([name, schema]) => {
    return `          ${name}${colType(schema, req.has(name))};`;
  });
  return `{\n${lines.join("\n")}\n        }`;
}

function insertType(def) {
  const props = def.properties ?? {};
  const required = new Set(def.required ?? []);
  for (const auto of ["id", "created_at", "updated_at"]) {
    required.delete(auto);
  }
  const lines = Object.entries(props).map(([name, schema]) => {
    return `          ${name}${colType(schema, required.has(name))};`;
  });
  return `{\n${lines.join("\n")}\n        }`;
}

const tableNames = Object.keys(definitions)
  .filter((name) => !name.includes(" "))
  .sort();

const tableBlocks = tableNames
  .map((name) => {
    const def = definitions[name];
    return `      ${JSON.stringify(name)}: {
        Row: ${rowType(def)};
        Insert: ${insertType(def)};
        Update: {
${Object.keys(def.properties ?? {})
  .map((col) => {
    const schema = def.properties[col];
    return `          ${col}?: ${tsType(schema, { nullable: true })};`;
  })
  .join("\n")}
        };
        Relationships: [];
      };`;
  })
  .join("\n");

const output = `/**
 * Generated from Signal Works Supabase PostgREST OpenAPI.
 * Regenerate: npm run gen:types
 * Project: gezdzzqnylloaxcmuzvm (post-035 schema)
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
${tableBlocks}
    };
    Views: Record<string, never>;
    Functions: {
      ma5_purge_expired_anonymous_visitors: {
        Args: { retention_days?: number };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<
  T extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][T]["Row"];

export type TablesInsert<
  T extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<
  T extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][T]["Update"];
`;

const outPath = join(root, "src/types/database.ts");
writeFileSync(outPath, output, "utf8");
console.log(`Wrote ${outPath} (${tableNames.length} tables)`);
