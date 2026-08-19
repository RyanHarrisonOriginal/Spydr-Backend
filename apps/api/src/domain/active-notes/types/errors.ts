export class ActiveNoteAnalysisError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "ActiveNoteAnalysisError";
    this.statusCode = statusCode;
  }
}

export class ActiveNoteApplyError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ActiveNoteApplyError";
    this.statusCode = statusCode;
  }
}
