import { describe, expect, it } from "vitest";
import type { Organization } from "../../domains/organizations/models/index.js";
import {
  actorFromAuthInfo,
  clerkIssuerFromPublishableKey,
  readJwtExpiresAt,
  resolveMcpOrgId,
  resolveMcpResourceUrl,
} from "./actor.js";

function org(id: string): Organization {
  return { id } as Organization;
}

describe("resolveMcpResourceUrl", () => {
  it("defaults to the local API mcp path", () => {
    expect(resolveMcpResourceUrl({}).href).toBe("http://localhost:3001/mcp");
    expect(resolveMcpResourceUrl({ PORT: "4000" }).href).toBe("http://localhost:4000/mcp");
  });

  it("uses MCP_PUBLIC_URL when set", () => {
    expect(
      resolveMcpResourceUrl({ MCP_PUBLIC_URL: "https://api.example.com/mcp" }).href
    ).toBe("https://api.example.com/mcp");
  });
});

describe("clerkIssuerFromPublishableKey", () => {
  it("decodes the frontend API host from a publishable key", () => {
    const key = `pk_test_${Buffer.from("verb-noun-00.clerk.accounts.dev$").toString("base64")}`;
    expect(clerkIssuerFromPublishableKey(key)).toBe(
      "https://verb-noun-00.clerk.accounts.dev"
    );
  });
});

describe("readJwtExpiresAt", () => {
  it("reads the exp claim from a JWT", () => {
    const payload = Buffer.from(JSON.stringify({ exp: 1_800_000_000 })).toString("base64url");
    expect(readJwtExpiresAt(`header.${payload}.sig`)).toBe(1_800_000_000);
  });

  it("returns undefined for an opaque token", () => {
    expect(readJwtExpiresAt("oat_opaque")).toBeUndefined();
  });
});

describe("resolveMcpOrgId", () => {
  const organizations = {
    async getMemberRole(userId: string, orgId: string) {
      return userId === "user-1" && orgId === "org-1" ? "member" : null;
    },
    async listForUser() {
      return [org("org-1")];
    },
  };

  it("uses the requested org when the user is a member", async () => {
    await expect(resolveMcpOrgId(organizations, "user-1", "org-1")).resolves.toEqual({
      ok: true,
      orgId: "org-1",
    });
  });

  it("rejects an org the user does not belong to", async () => {
    await expect(resolveMcpOrgId(organizations, "user-1", "org-2")).resolves.toEqual({
      ok: false,
      status: 403,
      message: "Not a member of this organization",
    });
  });

  it("selects the only membership when no org is requested", async () => {
    await expect(resolveMcpOrgId(organizations, "user-1", null)).resolves.toEqual({
      ok: true,
      orgId: "org-1",
    });
  });

  it("requires an org header when the user has several memberships", async () => {
    await expect(
      resolveMcpOrgId(
        {
          ...organizations,
          async listForUser() {
            return [org("org-1"), org("org-2")];
          },
        },
        "user-1",
        null
      )
    ).resolves.toMatchObject({ ok: false, status: 400 });
  });
});

describe("actorFromAuthInfo", () => {
  it("reads the user and org attached by HTTP auth", () => {
    expect(
      actorFromAuthInfo({
        token: "t",
        clientId: "client",
        scopes: ["email"],
        extra: { userId: "user-1", orgId: "org-1" },
      })
    ).toEqual({ userId: "user-1", orgId: "org-1" });
  });
});
