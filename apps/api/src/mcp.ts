import "@spydr/config";
import express from "express";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createBackend } from "./bootstrap.js";
import { resolveMcpActorContext } from "./infra/mcp/context.js";
import { createSpydrMcpServer } from "./infra/mcp/create-mcp-server.js";

async function main(): Promise<void> {
  const context = resolveMcpActorContext();
  const backend = createBackend({ app: express() });

  const role = await backend.services.repositories.organizationViews.getMemberRole(
    context.userId,
    context.orgId
  );
  if (!role) {
    throw new Error("SPYDR_USER_ID is not a member of SPYDR_ORG_ID");
  }

  const handle = serveStdio(
    () =>
      createSpydrMcpServer({
        commandBus: backend.services.commandBus,
        queryBus: backend.services.queryBus,
        context,
      }),
    {
      onerror: (error) => {
        console.error(error);
      },
    }
  );

  console.error("Spydr MCP server running on stdio");

  const shutdown = async () => {
    await handle.close();
    await backend.stop();
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}

main().catch((error) => {
  console.error("Failed to start Spydr MCP server", error);
  process.exit(1);
});
