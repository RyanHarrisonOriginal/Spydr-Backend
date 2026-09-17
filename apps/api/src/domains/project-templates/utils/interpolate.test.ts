import { describe, expect, it } from "vitest";
import {
  assertFullyRendered,
  collectTemplateParamKeys,
  extractTemplateKeys,
  fillMissingParamValues,
  renderTemplate,
  UNSPECIFIED_PARAM_VALUE,
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

  it("collects defined keys and tokens used in template text", () => {
    expect(
      collectTemplateParamKeys({
        titleTemplate: "{{NEW_COMPANY_NAME}} Go Live",
        bodyTemplate: "region {{REGION}}",
        outcomeTemplate: null,
        tags: [],
        parameters: [
          { key: "NEW_COMPANY_NAME" },
          { key: "UNUSED_FLAG" },
        ],
        tasks: [
          {
            titleTemplate: "email {{CONTACT}}",
            bodyTemplate: "",
            tags: ["{{REGION}}"],
          },
        ],
      })
    ).toEqual(["NEW_COMPANY_NAME", "UNUSED_FLAG", "REGION", "CONTACT"]);
  });

  it("fills missing spawned param values with UNSPECIFIED", () => {
    expect(
      fillMissingParamValues(
        { NEW_COMPANY_NAME: "Acme" },
        ["NEW_COMPANY_NAME", "REGION", "CONTACT"],
        { REGION: "  west  ", CONTACT: "  " }
      )
    ).toEqual({
      REGION: "west",
      CONTACT: UNSPECIFIED_PARAM_VALUE,
    });
  });

  it("replaces tokens in later strings after earlier renders", () => {
    const params = { VAR1: "one", VAR2: "two" };
    expect(
      renderTemplate("{{VAR1}} project title is fairly long", params)
    ).toBe("one project title is fairly long");
    expect(renderTemplate("{{VAR2}} task", params)).toBe("two task");
    expect(extractTemplateKeys("{{VAR2}} task")).toEqual(["VAR2"]);
  });
});
