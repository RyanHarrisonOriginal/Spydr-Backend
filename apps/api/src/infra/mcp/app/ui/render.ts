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
  refreshListView,
  sendFollowUp,
  taskStatusOptions,
  type ListAppToolName,
  type TaskStatusOption,
} from "./interactions.js";

export type UiState =
  | { status: "loading" }
  | { status: "empty"; kind: SpydrListViewKind }
  | { status: "error"; message: string }
  | { status: "ready"; data: SpydrListViewResult; notice?: string | null };

export type RenderOptions = {
  app: App | null;
  listToolName: ListAppToolName | null;
  lastArgs: Record<string, unknown>;
  onItemsChange?: () => void;
  onRefreshed?: (data: SpydrListViewResult) => void;
  onNotice?: (message: string | null) => void;
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
  return `prio prio--${priority}`;
}

function groupKey(item: SpydrListViewItem, kind: SpydrListViewKind): string {
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

function renderState(
  state: Extract<UiState, { status: "loading" | "empty" | "error" }>
): HTMLElement {
  if (state.status === "loading") {
    return el("div", { className: "state", role: "status" }, ["Loading…"]);
  }
  if (state.status === "empty") {
    return el("div", { className: "state", role: "status" }, [
      el("div", { className: "state__title" }, [
        state.kind === "projects" ? "No projects" : "No tasks",
      ]),
      "Nothing matched this query.",
    ]);
  }
  return el("div", { className: "state state--error", role: "alert" }, [
    el("div", { className: "state__title" }, ["Something went wrong"]),
    state.message,
  ]);
}

function stop(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

async function afterMutation(
  options: RenderOptions,
  fallback: () => void
): Promise<void> {
  if (options.app && options.listToolName) {
    try {
      const raw = await refreshListView(
        options.app,
        options.listToolName,
        options.lastArgs
      );
      const next = listViewFromToolResult(raw as Parameters<typeof listViewFromToolResult>[0]);
      if (next.status === "ready") {
        options.onRefreshed?.(next.data);
        return;
      }
    } catch (error) {
      console.warn("refresh after mutation failed", error);
    }
  }
  fallback();
  options.onItemsChange?.();
}

function renderRow(
  item: SpydrListViewItem,
  kind: SpydrListViewKind,
  options: RenderOptions,
  pendingIds: Set<string>
): HTMLElement {
  const pending = pendingIds.has(item.id);
  const row = el("div", {
    className: `row${pending ? " row--pending" : ""}`,
    role: "listitem",
  });

  const title = el("div", { className: "row__title" }, [
    el("span", { className: "row__emoji", "aria-hidden": "true" }, [
      item.emoji ?? "",
    ]),
    el("span", { className: "row__name", title: item.name }, [item.name]),
  ]);

  const metaBits: HTMLElement[] = [
    el("span", { className: priorityClass(item.priority) }, [item.priority]),
  ];
  if (item.assignee) {
    metaBits.push(
      el("span", { className: "meta", title: item.assignee }, [item.assignee])
    );
  }
  if (kind === "projects" && item.target) {
    metaBits.push(el("span", { className: "meta" }, [`→ ${item.target}`]));
  }
  if (kind === "tasks" && item.dueDate) {
    metaBits.push(el("span", { className: "meta" }, [`due ${item.dueDate}`]));
  }
  if (kind === "tasks" && item.project) {
    metaBits.push(
      el("span", { className: "meta", title: item.project.name }, [
        item.project.name,
      ])
    );
  }

  const status = el("div", { className: "row__status" }, [
    el("span", { className: statusDotClass(item.status), "aria-hidden": "true" }),
    el("span", { className: "status-label" }, [
      item.status.replace(/_/g, " "),
    ]),
  ]);

  row.append(
    title,
    status,
    el("div", { className: "row__meta" }, metaBits)
  );

  if (INTERACTIONS_ENABLED && options.app) {
    const app = options.app;
    const actions = el("div", { className: "actions" });

    if (kind === "tasks") {
      if (item.status !== "completed") {
        const completeBtn = el(
          "button",
          {
            className: "btn btn--primary",
            type: "button",
            disabled: pending,
          },
          ["Done"]
        );
        completeBtn.addEventListener("click", (event) => {
          stop(event);
          void runOptimistic(item, options, pendingIds, async () => {
            await markTaskComplete(app, item.id);
            await afterMutation(options, () => {
              item.status = "completed";
            });
          });
        });
        actions.append(completeBtn);
      }

      const select = el("select", {
        className: "select",
        disabled: pending,
        "aria-label": `Status for ${item.name}`,
      }) as HTMLSelectElement;
      for (const value of taskStatusOptions()) {
        const option = el("option", { value }, [value]);
        if (value === item.status) option.selected = true;
        select.append(option);
      }
      select.addEventListener("mousedown", stop);
      select.addEventListener("click", stop);
      select.addEventListener("change", (event) => {
        stop(event);
        const next = select.value;
        if (!isTaskStatus(next) || next === item.status) return;
        const previous = item.status as TaskStatusOption;
        void runOptimistic(
          item,
          options,
          pendingIds,
          async () => {
            await modifyTaskStatus(app, item.id, next);
            await afterMutation(options, () => {
              item.status = next;
            });
          },
          () => {
            item.status = previous;
            select.value = previous;
          }
        );
      });
      actions.append(select);
    }

    const askBtn = el(
      "button",
      {
        className: "btn",
        type: "button",
        disabled: pending,
        title: kind === "projects" ? "Ask about this project" : "Ask about this task",
      },
      ["Ask"]
    );
    askBtn.addEventListener("click", (event) => {
      stop(event);
      void sendFollowUp(app, item, kind).catch((error) => {
        options.onNotice?.(
          error instanceof Error ? error.message : "Could not send follow-up"
        );
      });
    });
    actions.append(askBtn);
    row.append(actions);
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
  options.onNotice?.(null);
  options.onItemsChange?.();
  try {
    await action();
  } catch (error) {
    rollback?.();
    console.error(error);
    options.onNotice?.(
      error instanceof Error ? error.message : "Action failed"
    );
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

  const { data, notice } = state;
  if (data.items.length === 0) {
    root.append(renderState({ status: "empty", kind: data.kind }));
    return;
  }

  const noun = data.kind === "projects" ? "projects" : "tasks";
  const total = data.totalMatched ?? data.items.length;
  // Claude inline cards auto-fit content and clip nested scroll — cap rows so
  // documentElement height stays honest and visible.
  const INLINE_ROW_CAP = 12;
  const visibleItems = data.items.slice(0, INLINE_ROW_CAP);
  const hiddenCount = Math.max(0, data.items.length - visibleItems.length);
  const shell = el("div", { className: "app" });

  shell.append(
    el("header", { className: "header" }, [
      el("div", { className: "header__title" }, [
        data.kind === "projects" ? "Projects" : "Tasks",
      ]),
      el("div", { className: "header__count" }, [
        total === data.items.length
          ? `${visibleItems.length}${hiddenCount ? `+` : ""} ${noun}`
          : `${visibleItems.length} of ${total}`,
      ]),
    ])
  );

  if (notice) {
    shell.append(el("div", { className: "notice", role: "alert" }, [notice]));
  }

  const list = el("div", { className: "list", role: "list" });
  for (const group of groupItems(visibleItems, data.kind)) {
    list.append(
      el("section", { className: "group" }, [
        el("div", { className: "group__header" }, [
          el("span", { className: "group__label" }, [
            group.key.replace(/_/g, " "),
          ]),
          el("span", { className: "group__count" }, [
            String(group.items.length),
          ]),
        ]),
        el(
          "div",
          { className: "rows" },
          group.items.map((item) =>
            renderRow(item, data.kind, options, pendingIds)
          )
        ),
      ])
    );
  }
  shell.append(list);

  if (hiddenCount > 0 || (data.items.length < total && total > data.items.length)) {
    const remaining = Math.max(hiddenCount, total - visibleItems.length);
    shell.append(
      el("div", { className: "footer" }, [
        `${remaining} more not shown — ask for the next page (raise offset).`,
      ])
    );
  }

  root.append(shell);
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
    return { status: "ready", data: structured as SpydrListViewResult };
  }

  return {
    status: "error",
    message: "Tool result missing list-view structuredContent",
  };
}
