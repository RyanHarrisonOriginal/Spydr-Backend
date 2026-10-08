import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import { isSpydrListViewResult, type SpydrListViewResult } from "@contract";
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

const app = new App({ name: "spydr-list-view", version: "1.0.0" });

function paint(): void {
  clear(root!);
  renderApp(
    root!,
    state,
    {
      app,
      onItemsChange: () => {
        if (latestData) {
          state = { status: "ready", data: latestData };
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
}): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    const { top, right, bottom, left } = ctx.safeAreaInsets;
    document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  }
}

function acceptResult(data: SpydrListViewResult): void {
  latestData = {
    ...data,
    items: data.items.map((item) => ({ ...item })),
  };
  state = { status: "ready", data: latestData };
  paint();
}

app.ontoolinput = () => {
  state = { status: "loading" };
  paint();
};

app.ontoolresult = (result) => {
  const next = listViewFromToolResult(result);
  if (next.status === "ready") {
    acceptResult(next.data);
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

void isSpydrListViewResult;
