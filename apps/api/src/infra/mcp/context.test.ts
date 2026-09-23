import { describe, expect, it } from "vitest";
import { resolveMcpActorContext } from "./context.js";

describe("resolveMcpActorContext", () => {
  it("reads user and org ids from env", () => {
    expect(
      resolveMcpActorContext({
        SPYDR_USER_ID: " user-1 ",
        SPYDR_ORG_ID: "org-1",
      })
    ).toEqual({ userId: "user-1", orgId: "org-1" });
  });

  it("requires both ids", () => {
    expect(() => resolveMcpActorContext({ SPYDR_USER_ID: "user-1" })).toThrow(
      "SPYDR_ORG_ID is required"
    );
    expect(() => resolveMcpActorContext({ SPYDR_ORG_ID: "org-1" })).toThrow(
      "SPYDR_USER_ID is required"
    );
  });
});
