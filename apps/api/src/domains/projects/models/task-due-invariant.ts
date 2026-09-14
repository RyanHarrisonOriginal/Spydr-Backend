export function calendarDayUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isDueAfterProjectTarget(
  dueDate: Date | null | undefined,
  projectTargetDate: Date | null | undefined
): boolean {
  if (!dueDate || !projectTargetDate) return false;
  return calendarDayUtc(dueDate) > calendarDayUtc(projectTargetDate);
}

export function assertTaskDueDateWithinProjectTarget(
  dueDate: Date | null | undefined,
  projectTargetDate: Date | null | undefined
): void {
  if (!isDueAfterProjectTarget(dueDate, projectTargetDate)) return;

  throw new Error(
    `Invalid task due date: cannot be after the project target date (${calendarDayUtc(projectTargetDate!)})`
  );
}

export function assertProjectTargetCoversTaskDues(
  targetDate: Date | null | undefined,
  tasks: ReadonlyArray<{
    isDeleted?: boolean;
    details?: { dueDate: Date | null } | null;
  }>
): void {
  if (!targetDate) return;

  for (const task of tasks) {
    if (task.isDeleted) continue;
    const dueDate = task.details?.dueDate ?? null;
    if (!isDueAfterProjectTarget(dueDate, targetDate)) continue;

    throw new Error(
      `Invalid project date: cannot end before a task is due (${calendarDayUtc(dueDate!)})`
    );
  }
}
