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
let connected = false;

/**
 * Claude remote often ignores `ui/notifications/size-changed` and instead reads
 * `document.documentElement` height from the iframe DOM (blob URL). Setting
 * html/body height in px after content paints is what makes the widget visible.
 * Spec-compliant hosts still get sendSizeChanged as a fallback.
 *
 * @see https://github.com/anthropics/claude-ai-mcp/issues/69
 */
const app = new App(
  { name: "spydr-list-view", version: "1.2.0" },
  {},
  { autoResize: false }
);

const MIN_HOST_HEIGHT = 96;
const MAX_HOST_HEIGHT = 480;

function clearDocumentHeight(): void {
  document.documentElement.style.height = "";
  document.documentElement.style.minHeight = "";
  document.body.style.height = "";
  document.body.style.minHeight = "";
}

function applyDocumentHeight(px: number): void {
  const h = `${Math.round(px)}px`;
  document.documentElement.style.height = h;
  document.documentElement.style.minHeight = h;
  document.body.style.height = h;
  document.body.style.minHeight = h;
  if (connected) {
    void app.sendSizeChanged({ height: Math.round(px) }).catch(() => {
      /* non-fatal */
    });
  }
}

function reportSize(): void {
  // Measure with height:auto first — Claude can lock onto an early tiny
  // documentElement.height and never recover.
  clearDocumentHeight();
  const measured = Math.ceil(
    Math.max(
      root!.getBoundingClientRect().height,
      root!.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    )
  );
  const height = Math.min(
    MAX_HOST_HEIGHT,
    Math.max(MIN_HOST_HEIGHT, measured + 4)
  );
  applyDocumentHeight(height);
}

function scheduleReportSize(): void {
  // Double rAF: wait for layout after DOM replace, then for fonts/styles.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      reportSize();
      // Claude sometimes snapshots before fonts settle — nudge once more.
      window.setTimeout(reportSize, 50);
    });
  });
}

function paint(): void {
  clear(root!);
  const paintState: UiState =
    state.status === "ready" ? { ...state, notice } : state;
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
  scheduleReportSize();
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
  if (latestData && !result.isError) {
    return;
  }
  state = next;
  paint();
};

app.onhostcontextchanged = (ctx) => {
  applyHostContext(ctx);
  scheduleReportSize();
};

app.onteardown = async () => ({});

// Don't paint before connect — Claude can snapshot a tiny pre-connect height
// and lock the iframe there.
void (async () => {
  try {
    await app.connect(new PostMessageTransport(window.parent, window.parent));
    connected = true;
    applyHostContext(app.getHostContext() ?? {});
    paint();
  } catch (error) {
    state = {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to connect to host",
    };
    paint();
  }
})();
