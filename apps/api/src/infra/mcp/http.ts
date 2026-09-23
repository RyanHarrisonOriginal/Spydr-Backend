import type { Express, NextFunction, Request, Response } from "express";
import {
  bearerAuthChallengeResponse,
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  verifyBearerToken,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import {
  hostHeaderValidation,
  localhostHostValidation,
  localhostOriginValidation,
  originValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ICommandBus } from "../../domains/shared/application/index.js";
import type { IQueryBus } from "../../domains/shared/application/index.js";
import type { IOrganizationViews } from "../../domains/organizations/views.js";
import { getOrgIdHeader } from "../../middleware/org-context.js";
import { actorFromAuthInfo, resolveMcpOrgId, resolveMcpResourceUrl } from "./actor.js";
import {
  clerkAuthorizationServerIssuer,
  verifyClerkOAuthAccessToken,
} from "./clerk-oauth.js";
import { createSpydrMcpServer } from "./create-mcp-server.js";

const MCP_SCOPES = ["openid", "profile", "email"] as const;

type McpRequest = Request & { auth?: AuthInfo };

export interface IMountSpydrMcpHttpOptions {
  commandBus: ICommandBus;
  queryBus: IQueryBus;
  organizationViews: IOrganizationViews;
}

function localHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function hostGuards(resourceUrl: URL): {
  host: (req: IncomingMessage, res: ServerResponse) => boolean;
  origin: (req: IncomingMessage, res: ServerResponse) => boolean;
} {
  if (localHostname(resourceUrl.hostname)) {
    return {
      host: localhostHostValidation(),
      origin: localhostOriginValidation(),
    };
  }
  const names = [resourceUrl.hostname, "localhost", "127.0.0.1", "[::1]"];
  return {
    host: hostHeaderValidation(names),
    origin: originValidation(names),
  };
}

async function sendWebResponse(res: Response, web: globalThis.Response): Promise<void> {
  res.status(web.status);
  web.headers.forEach((value, key) => {
    if (key === "transfer-encoding" || key === "content-length" || key === "connection") {
      return;
    }
    res.setHeader(key, value);
  });
  res.send(Buffer.from(await web.arrayBuffer()));
}

let authorizationServerMetadata: Promise<unknown> | undefined;

function loadAuthorizationServerMetadata(issuer: string): Promise<unknown> {
  const pending = fetch(new URL("/.well-known/oauth-authorization-server", issuer)).then(
    async (response) => {
      if (!response.ok) {
        throw new Error(
          `Clerk authorization server metadata failed with ${response.status}`
        );
      }
      return response.json() as Promise<unknown>;
    }
  );
  pending.catch(() => {
    if (authorizationServerMetadata === pending) {
      authorizationServerMetadata = undefined;
    }
  });
  authorizationServerMetadata = pending;
  return pending;
}

export function mountSpydrMcpHttp(
  app: Express,
  options: IMountSpydrMcpHttpOptions
): void {
  const resourceUrl = resolveMcpResourceUrl();
  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(resourceUrl);
  const guards = hostGuards(resourceUrl);
  const handler = toNodeHandler(
    createMcpHandler((ctx) =>
      createSpydrMcpServer({
        commandBus: options.commandBus,
        queryBus: options.queryBus,
        context: actorFromAuthInfo(ctx.authInfo),
      })
    ),
    {
      onerror: (error) => {
        console.error(error);
      },
    }
  );

  const protectedResource = (_req: Request, res: Response) => {
    res.json({
      resource: resourceUrl.href,
      authorization_servers: [clerkAuthorizationServerIssuer()],
      scopes_supported: [...MCP_SCOPES],
      bearer_methods_supported: ["header"],
      resource_name: "Spydr",
    });
  };

  app.get("/.well-known/oauth-protected-resource", protectedResource);
  app.get("/.well-known/oauth-protected-resource/mcp", protectedResource);
  app.get(
    ["/.well-known/oauth-authorization-server", "/.well-known/oauth-authorization-server/mcp"],
    async (_req, res) => {
      try {
        const metadata = await loadAuthorizationServerMetadata(
          clerkAuthorizationServerIssuer()
        );
        res.json(metadata);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Metadata unavailable";
        res.status(502).json({ message });
      }
    }
  );

  const requireClerkOAuth = async (req: McpRequest, res: Response, next: NextFunction) => {
    try {
      req.auth = await verifyBearerToken(req.header("authorization"), {
        verifier: {
          verifyAccessToken: (token) => verifyClerkOAuthAccessToken(token, resourceUrl),
        },
        resourceMetadataUrl,
      });
      next();
    } catch (error) {
      await sendWebResponse(
        res,
        bearerAuthChallengeResponse(error, { resourceMetadataUrl })
      );
    }
  };

  const requireMcpOrg = async (req: McpRequest, res: Response, next: NextFunction) => {
    const userId = req.auth?.extra?.userId;
    if (typeof userId !== "string") {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const resolved = await resolveMcpOrgId(
      options.organizationViews,
      userId,
      getOrgIdHeader(req)
    );
    if (!resolved.ok) {
      res.status(resolved.status).json({ message: resolved.message });
      return;
    }
    req.auth = {
      ...req.auth!,
      extra: { ...req.auth?.extra, userId, orgId: resolved.orgId },
    };
    next();
  };

  app.all("/mcp", (req, res, next) => {
    if (!guards.host(req, res) || !guards.origin(req, res)) return;
    next();
  }, requireClerkOAuth, requireMcpOrg, (req, res) => {
    void handler(req, res, req.body);
  });
}
