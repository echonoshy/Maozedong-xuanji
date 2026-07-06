import { marked } from "marked";
import { articlePath, parseRoute, searchPath } from "./routes.js";
import { searchArticles } from "./search.js";
import "./styles.css";

const app = document.querySelector("#app");
let library;
let articlesById;
let firstArticle;

marked.use({
  gfm: true,
  breaks: false,
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function articleUrl(article) {
  return articlePath(article.id);
}

function stripArticleChrome(markdown) {
  return markdown
    .replace(/^#\s+.+?\s*$/m, "")
    .replace(/^\s*（.+?）\s*$/m, "")
    .trim();
}

function getArticleIndex(article) {
  return library.articles.findIndex((item) => item.id === article.id);
}

function getVolume(article) {
  return library.volumes.find((volume) => volume.id === article.volumeId);
}

function renderHeader() {
  return `
    <header class="site-header">
      <a class="brand" href="#" aria-label="返回首页">
        <span class="brand-mark" aria-hidden="true">文</span>
        <span>毛泽东选集</span>
      </a>
      <nav class="top-nav" aria-label="主导航">
        <a href="#volumes">卷册</a>
        <a href="${articleUrl(firstArticle)}">阅读</a>
        <a href="assets/maozedong-xuanji-5-volumes.pdf">PDF</a>
      </nav>
    </header>
  `;
}

function renderSearchForm(query = "", variant = "hero") {
  return `
    <form class="search-form search-form-${variant}" data-search-form>
      <span class="search-icon" aria-hidden="true"></span>
      <input
        type="search"
        name="q"
        value="${escapeHtml(query)}"
        aria-label="搜索文献、标题、正文"
        placeholder="搜索文献、标题、正文"
      />
      <button type="submit">搜索</button>
    </form>
  `;
}

function renderHome() {
  return `
    ${renderHeader()}
    <main class="home-shell">
      <section class="hero" aria-labelledby="home-title">
        <div class="hero-copy">
          <h1 id="home-title">毛泽东选集</h1>
          <p>五卷文献，按历史时期编排。为检索与长文阅读重新整理。</p>
          ${renderSearchForm("", "hero")}
          <div class="hero-actions">
            <a class="button button-primary" href="${articleUrl(firstArticle)}">开始阅读</a>
          </div>
        </div>
        <aside class="reading-preview" aria-label="阅读预览">
          <div class="preview-topline">
            <span>阅读预览</span>
            <span>第一卷</span>
          </div>
          <div class="preview-body">
            <p>一九三七年七月</p>
            <h2>实践论</h2>
            <blockquote>人的认识，主要地依赖于物质的生产活动，逐渐地了解自然的现象、自然的性质、自然的规律性。</blockquote>
          </div>
        </aside>
      </section>

      <section class="volume-section" id="volumes" aria-labelledby="volumes-title">
        <div class="section-heading">
          <h2 id="volumes-title">按卷阅读</h2>
        </div>
        <div class="volume-list">
          ${library.volumes.map(renderVolumeCard).join("")}
        </div>
      </section>
    </main>
  `;
}

function renderVolumeCard(volume) {
  const firstVolumeArticle = articlesById.get(volume.articleIds[0]);

  return `
    <a class="volume-card accent-${volume.accent}" href="${articleUrl(firstVolumeArticle)}">
      <span class="volume-label">${escapeHtml(volume.label)}</span>
      <strong>${escapeHtml(volume.title)}</strong>
      <span>${escapeHtml(volume.period)} · ${volume.articleIds.length} 篇 · ${String(volume.start).padStart(3, "0")}-${String(volume.end).padStart(3, "0")}</span>
    </a>
  `;
}

function renderArticle(article) {
  const index = getArticleIndex(article);
  const previous = library.articles[index - 1];
  const next = library.articles[index + 1];
  const volume = getVolume(article);
  const html = marked.parse(stripArticleChrome(article.markdown));

  return `
    ${renderHeader()}
    <main class="reader-shell">
      <aside class="reader-nav" aria-label="卷册目录">
        <a class="back-home" href="#">首页</a>
        <h2>${escapeHtml(volume.label)}</h2>
        <p>${escapeHtml(volume.title)}</p>
        <nav>
          ${volume.articleIds.map((id) => {
            const item = articlesById.get(id);
            const active = item.id === article.id ? "active" : "";
            return `<a class="${active}" href="${articleUrl(item)}">${String(item.number).padStart(3, "0")} ${escapeHtml(item.title)}</a>`;
          }).join("")}
        </nav>
      </aside>

      <article class="article">
        <header class="article-header">
          <p>${escapeHtml(volume.label)} · ${String(article.number).padStart(3, "0")}</p>
          <h1>${escapeHtml(article.title)}</h1>
          ${article.date ? `<time>${escapeHtml(article.date)}</time>` : ""}
        </header>
        <div class="article-content">
          ${html}
        </div>
        <nav class="article-pager" aria-label="文章翻页">
          ${previous ? `<a href="${articleUrl(previous)}">上一篇<br><span>${escapeHtml(previous.title)}</span></a>` : "<span></span>"}
          ${next ? `<a href="${articleUrl(next)}">下一篇<br><span>${escapeHtml(next.title)}</span></a>` : "<span></span>"}
        </nav>
      </article>
    </main>
  `;
}

function renderSearch(query) {
  const results = searchArticles(library.articles, query);

  return `
    ${renderHeader()}
    <main class="search-shell">
      <section class="search-page">
        <h1>搜索</h1>
        ${renderSearchForm(query, "page")}
        <p class="search-count">${results.length ? `${results.length} 个结果` : "没有找到匹配结果"}</p>
        <div class="search-results">
          ${results.map((article) => `
            <a class="result-row" href="${articleUrl(article)}">
              <span>${String(article.number).padStart(3, "0")} · ${escapeHtml(article.volumeLabel)}</span>
              <strong>${escapeHtml(article.title)}</strong>
              <p>${escapeHtml(article.excerpt)}</p>
            </a>
          `).join("")}
        </div>
      </section>
    </main>
  `;
}

function render() {
  if (!library) {
    app.innerHTML = '<main class="loading">载入中</main>';
    return;
  }

  const route = parseRoute(window.location.hash);

  if (route.view === "article") {
    const article = articlesById.get(route.id) ?? firstArticle;
    app.innerHTML = renderArticle(article);
  } else if (route.view === "search") {
    app.innerHTML = renderSearch(route.query);
  } else {
    app.innerHTML = renderHome();
  }

  bindSearchForms();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function bindSearchForms() {
  document.querySelectorAll("[data-search-form]").forEach((form) => {
    form.querySelector("input")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const query = String(data.get("q") ?? "").trim();

      if (query) {
        window.location.hash = searchPath(query);
      }
    });
  });
}

window.addEventListener("hashchange", render);

async function bootstrap() {
  const response = await fetch(`${import.meta.env.BASE_URL}content/library.json`);

  if (!response.ok) {
    throw new Error(`Failed to load content: ${response.status}`);
  }

  library = await response.json();
  articlesById = new Map(library.articles.map((article) => [article.id, article]));
  firstArticle = library.articles[0];
  render();
}

bootstrap().catch((error) => {
  app.innerHTML = `
    <main class="loading loading-error">
      <h1>内容加载失败</h1>
      <p>${escapeHtml(error.message)}</p>
    </main>
  `;
});
