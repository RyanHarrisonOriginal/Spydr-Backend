import type { App } from "@modelcontextprotocol/ext-apps";
import type {
  SpydrListViewItem,
  SpydrListViewKind,
  SpydrListViewResult,
} from "@contract";
import { el } from "./dom.js";
import {
  INTERACTIONS_ENABLED,
  isTaskStatus,
  markTaskComplete,
  modifyTaskStatus,
  sendFollowUp,
  taskStatusOptions,
  type TaskStatusOption,
} from "./interactions.js";

export type UiState =
  | { status: "loading" }
  | { status: "empty"; kind: SpydrListViewKind }
  | { status: "error"; message: string }
  | { status: "ready"; data: SpydrListViewResult };

type RenderOptions = {
  app: App | null;
  /** Re-render after optimistic local mutations. */
  onItemsChange?: () => void;
};

const PROJECT_STATUS_ORDER = [
  "active",
  "waiting",
  "blocked",
  "snoozed",
  "inactive",
  "completed",
  "archived",
];

function statusDotClass(status: string): string {
  return `dot dot--${status}`;
}

function priorityClass(priority: string): string {
  return `badge badge--${priority}`;
}

function groupKey(
  item: SpydrListViewItem,
  kind: SpydrListViewKind
): string {
  if (kind === "projects") return item.status || "unknown";
  return item.project?.name || "No project";
}

function groupOrder(kind: SpydrListViewKind, key: string): number {
  if (kind === "projects") {
    const index = PROJECT_STATUS_ORDER.indexOf(key);
    return index === -1 ? PROJECT_STATUS_ORDER.length : index;
  }
  return key === "No project" ? 999 : 0;
}

function groupItems(
  items: SpydrListViewItem[],
  kind: SpydrListViewKind
): Array<{ key: string; items: SpydrListViewItem[] }> {
  const map = new Map<string, SpydrListViewItem[]>();
  for (const item of items) {
    const key = groupKey(item, kind);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      const order = groupOrder(kind, a) - groupOrder(kind, b);
      return order !== 0 ? order : a.localeCompare(b);
    })
    .map(([key, group]) => ({ key, items: group }));
}

function renderState(state: Extract<UiState, { status: "loading" | "empty" | "error" }>): HTMLElement {
  if (state.status === "loading") {
    return el("div", { className: "state", role: "status" }, ["Loading Spydr…"]);
  }
  if (state.status === "empty") {
    return el("div", { className: "state", role: "status" }, [
      el("div", { className: "state__title" }, [
        state.kind === "projects" ? "No projects" : "No tasks",
      ]),
      "Nothing to show for this query.",
    ]);
  }
  return el("div", { className: "state state--error", role: "alert" }, [
    el("div", { className: "state__title" }, ["Something went wrong"]),
    state.message,
  ]);
}

function renderRow(
  item: SpydrListViewItem,
  kind: SpydrListViewKind,
  options: RenderOptions,
  pendingIds: Set<string>
): HTMLElement {
  const pending = pendingIds.has(item.id);
  const row = el("div", {
    className: `row${INTERACTIONS_ENABLED ? " row--interactive" : ""}${pending ? " row--pending" : ""}`,
    role: "listitem",
  });

  const main = el("div", { className: "row__main" }, [
    el("span", { className: "row__emoji", "aria-hidden": "true" }, [
      item.emoji ?? "",
    ]),
    el("span", { className: "row__name", title: item.name }, [item.name]),
  ]);

  const metaChildren: HTMLElement[] = [
    el("span", { className: "pill" }, [
      el("span", { className: statusDotClass(item.status), "aria-hidden": "true" }),
      item.status.replace(/_/g, " "),
    ]),
    el("span", { className: priorityClass(item.priority) }, [item.priority]),
  ];

  if (item.assignee) {
    metaChildren.push(el("span", { className: "meta", title: item.assignee }, [item.assignee]));
  }
  if (kind === "projects" && item.target) {
    metaChildren.push(el("span", { className: "meta" }, [`target ${item.target}`]));
  }
  if (kind === "tasks" && item.dueDate) {
    metaChildren.push(el("span", { className: "meta" }, [`due ${item.dueDate}`]));
  }
  if (kind === "tasks" && item.project) {
    metaChildren.push(
      el("span", { className: "meta", title: item.project.name }, [item.project.name])
    );
  }

  const meta = el("div", { className: "row__meta" }, metaChildren);
  row.append(main, meta);

  if (INTERACTIONS_ENABLED && kind === "tasks" && options.app) {
    const app = options.app;
    const actions = el("div", { className: "actions" });

    if (item.status !== "completed") {
      const completeBtn = el("button", {
        className: "btn btn--primary",
        type: "button",
        disabled: pending,
      }, ["Complete"]);
      completeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        void runOptimistic(item, options, pendingIds, async () => {
          await markTaskComplete(app, item.id);
          item.status = "completed";
        });
      });
      actions.append(completeBtn);
    }

    const select = el("select", {
      className: "select",
      disabled: pending,
      "aria-label": `Status for ${item.name}`,
    }) as HTMLSelectElement;
    for (const status of taskStatusOptions()) {
      const option = el("option", { value: status }, [status]);
      if (status === item.status) option.selected = true;
      select.append(option);
    }
    select.addEventListener("click", (event) => event.stopPropagation());
    select.addEventListener("change", () => {
      const next = select.value;
      if (!isTaskStatus(next) || next === item.status) return;
      const previous = item.status as TaskStatusOption;
      void runOptimistic(item, options, pendingIds, async () => {
        await modifyTaskStatus(app, item.id, next);
        item.status = next;
      }, () => {
        item.status = previous;
        select.value = previous;
      });
    });
    actions.append(select);
    row.append(actions);
  }

  if (INTERACTIONS_ENABLED && options.app) {
    row.addEventListener("click", () => {
      void sendFollowUp(options.app!, item, kind).catch((error) => {
        console.warn("sendFollowUp failed", error);
      });
    });
  }

  return row;
}

async function runOptimistic(
  item: SpydrListViewItem,
  options: RenderOptions,
  pendingIds: Set<string>,
  action: () => Promise<void>,
  rollback?: () => void
): Promise<void> {
  pendingIds.add(item.id);
  options.onItemsChange?.();
  try {
    await action();
  } catch (error) {
    rollback?.();
    console.error(error);
    window.alert(error instanceof Error ? error.message : "Action failed");
  } finally {
    pendingIds.delete(item.id);
    options.onItemsChange?.();
  }
}

export function renderApp(
  root: HTMLElement,
  state: UiState,
  options: RenderOptions,
  pendingIds: Set<string> = new Set()
): void {
  root.replaceChildren();

  if (state.status !== "ready") {
    root.append(renderState(state));
    return;
  }

  const { data } = state;
  if (data.items.length === 0) {
    root.append(renderState({ status: "empty", kind: data.kind }));
    return;
  }

  const app = el("div", { className: "app", role: "list" });
  for (const group of groupItems(data.items, data.kind)) {
    const section = el("section", { className: "group" }, [
      el("div", { className: "group__header" }, [
        group.key.replace(/_/g, " "),
        el("span", { className: "group__count" }, [`(${group.items.length})`]),
      ]),
      el(
        "div",
        { className: "rows" },
        group.items.map((item) => renderRow(item, data.kind, options, pendingIds))
      ),
    ]);
    app.append(section);
  }
  root.append(app);
}

export function listViewFromToolResult(result: {
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}): UiState {
  if (result.isError) {
    const message =
      result.content?.find((block) => block.type === "text")?.text ??
      "Tool returned an error";
    return { status: "error", message };
  }

  const structured = result.structuredContent;
  if (
    structured &&
    typeof structured === "object" &&
    "kind" in structured &&
    "items" in structured &&
    Array.isArray((structured as SpydrListViewResult).items)
  ) {
    const data = structured as SpydrListViewResult;
    return { status: "ready", data };
  }

  return {
    status: "error",
    message: "Tool result missing list-view structuredContent",
  };
}
