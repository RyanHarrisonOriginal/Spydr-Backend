import { describe, expect, it } from "vitest";
import { readListViewHtml } from "./read-list-view-html.js";

describe("readListViewHtml", () => {
  it("loads the built singlefile HTML bundle", async () => {
    const html = await readListViewHtml();
    expect(html).toContain("<!doctype html>");
    expect(html.toLowerCase()).toContain("<html");
    expect(html).toContain("id=\"root\"");
  });
});
