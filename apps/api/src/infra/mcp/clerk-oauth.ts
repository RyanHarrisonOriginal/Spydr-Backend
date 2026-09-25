import { createClerkClient, type ClerkClient } from "@clerk/backend";
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import { clerkIssuerFromPublishableKey, readJwtExpiresAt } from "./actor.js";

let clerkClient: ClerkClient | undefined;

function getClerkClient(): ClerkClient {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    throw new OAuthError(OAuthErrorCode.ServerError, "Clerk is not configured");
  }
  clerkClient ??= createClerkClient({ secretKey, publishableKey });
  return clerkClient;
}

export function clerkAuthorizationServerIssuer(): string {
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("CLERK_PUBLISHABLE_KEY is required");
  }
  return clerkIssuerFromPublishableKey(publishableKey);
}

export async function verifyClerkOAuthAccessToken(
  token: string,
  resourceUrl: URL
): Promise<AuthInfo> {
  const state = await getClerkClient().authenticateRequest(
    new Request(resourceUrl, {
      headers: { authorization: `Bearer ${token}` },
    }),
    { acceptsToken: "oauth_token" }
  );

  if (!state.isAuthenticated) {
    throw new OAuthError(
      OAuthErrorCode.InvalidToken,
      state.message || "Invalid OAuth access token"
    );
  }

  const auth = state.toAuth();
  if (auth.tokenType !== "oauth_token" || !auth.userId) {
    throw new OAuthError(OAuthErrorCode.InvalidToken, "Expected a Clerk OAuth access token");
  }

  const expiresAt =
    readJwtExpiresAt(token) ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24;

  return {
    token,
    clientId: auth.clientId,
    scopes: auth.scopes,
    expiresAt,
    extra: { userId: auth.userId },
  };
}
