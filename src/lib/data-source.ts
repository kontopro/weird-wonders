export type DataSource = "mock" | "supabase";

/** Reads the configured data source. Safe on both server and client. */
export function getDataSource(): DataSource {
  const source = import.meta.env["VITE_DATA_SOURCE"] ?? "mock";
  if (source === "mock" || source === "supabase") return source;
  throw new Error(`Unsupported VITE_DATA_SOURCE: ${source}`);
}

/**
 * Mock mode has no real accounts. The demo admin is available during local
 * development, or on a deployed demo only when explicitly enabled.
 */
export function isDemoAdminEnabled() {
  return (
    getDataSource() === "mock" &&
    (import.meta.env.DEV || import.meta.env["VITE_ENABLE_DEMO_ADMIN"] === "true")
  );
}
