import { z } from "zod";

/**
 * Shared Zod input for get_projects / get_tasks.
 *
 * The MCP SDK advertises `tools/list` `inputSchema` by converting this object
 * via `z.toJSONSchema` — keep filter/pagination fields here so the published
 * contract and runtime validation cannot drift.
 *
 * `limit` / `offset` use `z.coerce.number()` so clients that send numeric
 * strings (common when the field is missing from a cached tools/list) still
 * parse.
 */
const optionalOrgId = z
  .string()
  .min(1)
  .optional()
  .describe(
    "Organization id from list_organizations. Omit to use the default organization."
  );

export const listViewFilterFields = {
  status: z
    .string()
    .min(1)
    .optional()
    .describe("Filter by status (exact match, e.g. active, completed)"),
  assignee: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Filter by assignee display name (substring). Use "unassigned" for tasks/projects with no assignee.'
    ),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Max rows to return (default 50, max 100). Page with offset."),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Rows to skip before returning results (default 0)."),
};

export const getProjectsInputSchema = z.object({
  orgId: optionalOrgId,
  id: z
    .string()
    .min(1)
    .optional()
    .describe(
      "When set, return this project as a single list-view row (no embedded children; use get_tasks for tasks)"
    ),
  ...listViewFilterFields,
});

export const getTasksInputSchema = z.object({
  orgId: optionalOrgId,
  id: z.string().min(1).optional().describe("When set, return this task"),
  ...listViewFilterFields,
});

export type GetProjectsInput = z.infer<typeof getProjectsInputSchema>;
export type GetTasksInput = z.infer<typeof getTasksInputSchema>;
