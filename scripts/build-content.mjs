import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VOLUMES = [
  {
    id: "volume-1",
    label: "第一卷",
    title: "国内革命战争时期",
    period: "1925-1937",
    start: 0,
    end: 17,
    accent: "orange",
  },
  {
    id: "volume-2",
    label: "第二卷",
    title: "抗日战争时期（上）",
    period: "1937-1941",
    start: 18,
    end: 57,
    accent: "blue",
  },
  {
    id: "volume-3",
    label: "第三卷",
    title: "抗日战争时期（下）",
    period: "1941-1945",
    start: 58,
    end: 88,
    accent: "green",
  },
  {
    id: "volume-4",
    label: "第四卷",
    title: "第三次国内革命战争时期",
    period: "1945-1949",
    start: 89,
    end: 158,
    accent: "orange",
  },
  {
    id: "volume-5",
    label: "第五卷",
    title: "中国人民站起来了",
    period: "1949-1957",
    start: 159,
    end: 228,
    accent: "blue",
  },
];

const HELPER_FILES = new Set(["SUMMARY.md", "目录.md"]);

export function articleIdFromFilename(filename) {
  return path.basename(filename, ".md");
}

function numberFromId(id) {
  const match = id.match(/^(\d{3})-/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function titleFromFilename(id) {
  return id.replace(/^\d{3}-/, "");
}

function volumeForNumber(number) {
  return VOLUMES.find((volume) => number >= volume.start && number <= volume.end);
}

function extractHeading(markdown, fallbackTitle) {
  const match = markdown.match(/^#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : fallbackTitle;
}

function extractDate(markdown) {
  const lines = markdown.split(/\r?\n/).slice(0, 8);
  const dateLine = lines.find((line) => /^（.+）\s*$/.test(line.trim()));
  return dateLine ? dateLine.trim().replace(/^（|）$/g, "") : "";
}

function plainText(markdown) {
  return markdown
    .replace(/^# .+$/gm, "")
    .replace(/^> ?/gm, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/[*_`~>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptFromMarkdown(markdown) {
  const text = plainText(markdown);
  return text.length > 128 ? `${text.slice(0, 128)}...` : text;
}

export async function buildLibraryFromDirectory(sourceDir) {
  const filenames = (await readdir(sourceDir))
    .filter((filename) => filename.endsWith(".md"))
    .filter((filename) => !HELPER_FILES.has(filename));

  const articles = await Promise.all(
    filenames.map(async (filename) => {
      const id = articleIdFromFilename(filename);
      const number = numberFromId(id);
      const volume = volumeForNumber(number);
      const markdown = await readFile(path.join(sourceDir, filename), "utf8");
      const fallbackTitle = titleFromFilename(id);
      const title = extractHeading(markdown, fallbackTitle);

      return {
        id,
        number,
        title,
        date: extractDate(markdown),
        volumeId: volume?.id ?? "unassigned",
        volumeLabel: volume?.label ?? "",
        sourceFile: filename,
        markdown,
        excerpt: excerptFromMarkdown(markdown),
        searchText: `${title} ${fallbackTitle} ${plainText(markdown)}`.toLowerCase(),
      };
    }),
  );

  articles.sort((left, right) => left.number - right.number);

  const volumes = VOLUMES.map((volume) => ({
    ...volume,
    articleIds: articles
      .filter((article) => article.volumeId === volume.id)
      .map((article) => article.id),
  }));

  return {
    site: {
      title: "毛泽东选集",
      description: "五卷文献，按时期整理，适合检索与长文阅读。",
    },
    volumes,
    articles,
  };
}

export function searchArticles(articles, query, limit = 20) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return articles
    .map((article) => {
      const title = article.title.toLowerCase();
      const exactTitle = title === normalizedQuery ? 120 : 0;
      const titleMatch = title.includes(normalizedQuery) ? 80 : 0;
      const contentMatch = article.searchText.includes(normalizedQuery) ? 20 : 0;
      return {
        article,
        score: exactTitle + titleMatch + contentMatch,
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.article.number - right.article.number)
    .slice(0, limit)
    .map((result) => result.article);
}

async function writeGeneratedLibrary() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const library = await buildLibraryFromDirectory(path.join(root, "docs/src"));
  const outputDir = path.join(root, "public/content");
  const outputFile = path.join(outputDir, "library.json");
  const payload = JSON.stringify(library, null, 2);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, `${payload}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeGeneratedLibrary();
}
