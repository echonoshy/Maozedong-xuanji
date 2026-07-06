import { describe, expect, test } from "vitest";
import { articlePath, parseRoute } from "../src/routes.js";

describe("hash routes", () => {
  test("creates encoded article routes", () => {
    expect(articlePath("016-实践论")).toBe("#/read/016-%E5%AE%9E%E8%B7%B5%E8%AE%BA");
  });

  test("parses home, reader, and search routes", () => {
    expect(parseRoute("")).toEqual({ view: "home" });
    expect(parseRoute("#/read/016-%E5%AE%9E%E8%B7%B5%E8%AE%BA")).toEqual({
      view: "article",
      id: "016-实践论",
    });
    expect(parseRoute("#/search/%E5%AE%9E%E8%B7%B5%E8%AE%BA")).toEqual({
      view: "search",
      query: "实践论",
    });
  });
});
