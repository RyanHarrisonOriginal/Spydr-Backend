export interface IMcpActorContext {
  userId: string;
  orgId: string;
}

export function resolveMcpActorContext(
  env: NodeJS.ProcessEnv = process.env
): IMcpActorContext {
  const userId = env.SPYDR_USER_ID?.trim();
  const orgId = env.SPYDR_ORG_ID?.trim();

  if (!userId) {
    throw new Error("SPYDR_USER_ID is required to run the Spydr MCP server");
  }
  if (!orgId) {
    throw new Error("SPYDR_ORG_ID is required to run the Spydr MCP server");
  }

  return { userId, orgId };
}
