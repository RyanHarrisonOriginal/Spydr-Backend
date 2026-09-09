export class JobUnrecoverableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobUnrecoverableError";
  }
}
