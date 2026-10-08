/**
 * Kill-switch for MCP Apps UI advertising.
 *
 * Claude currently fails to render our Streamable-HTTP Apps iframe ("Unable to
 * reach Spydr") even when tools/call succeeds. Keep the App codepath, but do
 * not advertise `_meta.ui` / ui:// resources unless explicitly enabled.
 *
 * Set `MCP_APPS_ENABLED=true` to re-enable when the host bug is fixed.
 */
export function mcpAppsEnabled(): boolean {
  const value = process.env.MCP_APPS_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}
