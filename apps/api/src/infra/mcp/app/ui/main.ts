import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import type { SpydrListViewResult } from "@contract";
import { clear } from "./dom.js";
import { listViewFromToolResult, renderApp, type UiState } from "./render.js";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

let state: UiState = { status: "loading" };
const pendingIds = new Set<string>();
let latestData: SpydrListViewResult | null = null;
let notice: string | null = null;
let lastArgs: Record<string, unknown> = {};
let listToolName:
  | "present_projects"
  | "present_tasks"
  | "get_projects"
  | "get_tasks"
  | null = null;

const app = new App({ name: "spydr-list-view", version: "1.1.0" });

function paint(): void {
  clear(root!);
  const paintState: UiState =
    state.status === "ready"
      ? { ...state, notice }
      : state;
  renderApp(
    root!,
    paintState,
    {
      app,
      listToolName,
      lastArgs,
      onItemsChange: () => {
        if (latestData) {
          state = { status: "ready", data: latestData, notice };
        }
        paint();
      },
      onRefreshed: (data) => {
        acceptResult(data);
      },
      onNotice: (message) => {
        notice = message;
        if (latestData) {
          state = { status: "ready", data: latestData, notice };
        }
        paint();
      },
    },
    pendingIds
  );
}

function applyHostContext(ctx: {
  theme?: "light" | "dark";
  styles?: {
    variables?: Record<string, string | undefined>;
    css?: { fonts?: string };
  };
  safeAreaInsets?: { top: number; right: number; bottom: number; left: number };
  toolInfo?: { tool?: { name?: string } };
}): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    const { top, right, bottom, left } = ctx.safeAreaInsets;
    document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  }
  const name = ctx.toolInfo?.tool?.name;
  if (
    name === "present_projects" ||
    name === "present_tasks" ||
    name === "get_projects" ||
    name === "get_tasks"
  ) {
    listToolName = name;
  }
}

function acceptResult(data: SpydrListViewResult): void {
  latestData = {
    ...data,
    items: data.items.map((item) => ({ ...item })),
  };
  notice = null;
  state = { status: "ready", data: latestData, notice };
  paint();
}

app.ontoolinput = (params) => {
  lastArgs = { ...(params.arguments ?? {}) };
  if (typeof lastArgs.ui === "undefined") {
    // Keep the widget open across in-app refreshes.
    lastArgs.ui = true;
  }
  state = { status: "loading" };
  paint();
};

app.ontoolresult = (result) => {
  const next = listViewFromToolResult(result);
  if (next.status === "ready") {
    acceptResult(next.data);
    return;
  }
  // Ignore non-list results (e.g. write-tool echoes) so controls don't wipe the UI.
  if (latestData && !result.isError) {
    return;
  }
  state = next;
  paint();
};

app.onhostcontextchanged = (ctx) => {
  applyHostContext(ctx);
};

app.onteardown = async () => ({});

paint();

void (async () => {
  try {
    await app.connect(new PostMessageTransport(window.parent, window.parent));
    applyHostContext(app.getHostContext() ?? {});
  } catch (error) {
    state = {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to connect to host",
    };
    paint();
  }
})();
