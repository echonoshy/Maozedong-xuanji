import { describe, expect, test } from "vitest";
import {
  articleIdFromFilename,
  buildLibraryFromDirectory,
  searchArticles,
} from "../scripts/build-content.mjs";

describe("content pipeline", () => {
  test("derives stable article ids from source filenames", () => {
    expect(articleIdFromFilename("016-实践论.md")).toBe("016-实践论");
    expect(articleIdFromFilename("156-“友谊”，还是侵略？.md")).toBe("156-“友谊”，还是侵略？");
  });

  test("builds five volumes and excludes helper markdown files", async () => {
    const library = await buildLibraryFromDirectory("docs/src");

    expect(library.volumes).toHaveLength(5);
    expect(library.articles).toHaveLength(229);
    expect(library.volumes.map((volume) => volume.articleIds.length)).toEqual([
      18,
      40,
      31,
      70,
      70,
    ]);
    expect(library.articles[0]).toMatchObject({
      id: "000-中国社会各阶级的分析",
      title: "中国社会各阶级的分析",
      volumeId: "volume-1",
    });
  });

  test("finds articles by Chinese title and content", async () => {
    const library = await buildLibraryFromDirectory("docs/src");

    expect(searchArticles(library.articles, "实践论")[0]).toMatchObject({
      id: "016-实践论",
      title: "实践论",
    });
    expect(searchArticles(library.articles, "纸老虎").some((article) => article.id === "228-一切反动派都是纸老虎")).toBe(true);
  });
});
