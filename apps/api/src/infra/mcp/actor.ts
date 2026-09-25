import type { AuthInfo } from "@modelcontextprotocol/server";
import type { IOrganizationViews } from "../../domains/organizations/views.js";
import type { IMcpActorContext } from "./context.js";

export function actorFromAuthInfo(authInfo: AuthInfo | undefined): IMcpActorContext {
  const userId = authInfo?.extra?.userId;
  const orgId = authInfo?.extra?.orgId;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("MCP request is missing an authenticated user");
  }
  if (typeof orgId !== "string" || orgId.length === 0) {
    throw new Error("MCP request is missing an organization");
  }
  return { userId, orgId };
}

export function readJwtExpiresAt(token: string): number | undefined {
  const payload = token.split(".")[1];
  if (!payload) return undefined;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: unknown;
    };
    return typeof json.exp === "number" ? json.exp : undefined;
  } catch {
    return undefined;
  }
}

export function clerkIssuerFromPublishableKey(publishableKey: string): string {
  const encoded = publishableKey.match(/^pk_(?:test|live)_(.+)$/)?.[1];
  if (!encoded) {
    throw new Error("Invalid CLERK_PUBLISHABLE_KEY");
  }
  const pad =
    encoded.length % 4 === 0 ? "" : "=".repeat(4 - (encoded.length % 4));
  const decoded = Buffer.from(encoded + pad, "base64").toString("utf8");
  const frontendApi = decoded.endsWith("$") ? decoded.slice(0, -1) : decoded;
  if (!frontendApi || /[\s/]/.test(frontendApi)) {
    throw new Error("Invalid CLERK_PUBLISHABLE_KEY");
  }
  return `https://${frontendApi}`;
}

export function resolveMcpResourceUrl(env: NodeJS.ProcessEnv = process.env): URL {
  const configured = env.MCP_PUBLIC_URL?.trim();
  if (configured) return new URL(configured);
  const port = env.PORT?.trim() || "3001";
  return new URL(`http://localhost:${port}/mcp`);
}

export type IMcpOrgResolution =
  | { ok: true; orgId: string }
  | { ok: false; status: 400 | 403; message: string };

export async function resolveMcpOrgId(
  organizations: Pick<IOrganizationViews, "getMemberRole" | "listForUser">,
  userId: string,
  requestedOrgId: string | null
): Promise<IMcpOrgResolution> {
  if (requestedOrgId) {
    const role = await organizations.getMemberRole(userId, requestedOrgId);
    if (!role) {
      return { ok: false, status: 403, message: "Not a member of this organization" };
    }
    return { ok: true, orgId: requestedOrgId };
  }

  const memberships = await organizations.listForUser(userId);
  if (memberships.length === 0) {
    return { ok: false, status: 403, message: "No organization membership" };
  }
  return { ok: true, orgId: memberships[0]!.id };
}
