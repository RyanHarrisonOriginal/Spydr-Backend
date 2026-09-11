import { describe, expect, it } from "vitest";
import {
  assertFullyRendered,
  extractTemplateKeys,
  renderTemplate,
  validateParamValues,
} from "./interpolate.js";

describe("project template interpolate", () => {
  it("extracts unique keys", () => {
    expect(
      extractTemplateKeys(
        "{{NEW_COMPANY_NAME}} Reporting",
        "reach out to {{NEW_COMPANY_NAME}} CFO",
        "{{REGION}}"
      )
    ).toEqual(["NEW_COMPANY_NAME", "REGION"]);
  });

  it("renders and fail-closes on leftovers", () => {
    const rendered = renderTemplate("{{NEW_COMPANY_NAME}} Go Live", {
      NEW_COMPANY_NAME: "Acme",
    });
    expect(rendered).toBe("Acme Go Live");
    expect(() => assertFullyRendered("title", "{{MISSING}}")).toThrow(
      /Unresolved/
    );
  });

  it("validates required params", () => {
    expect(() =>
      validateParamValues(
        [{ key: "NEW_COMPANY_NAME", required: true, defaultValue: null }],
        {}
      )
    ).toThrow(/Missing required/);

    expect(
      validateParamValues(
        [{ key: "NEW_COMPANY_NAME", required: true, defaultValue: null }],
        { NEW_COMPANY_NAME: " Acme " }
      )
    ).toEqual({ NEW_COMPANY_NAME: "Acme" });
  });
});
