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

function renderHeader(options = {}) {
  const navigation = options.archiveHome
    ? '<a href="assets/maozedong-xuanji-5-volumes.pdf">PDF下载</a>'
    : `
        <a href="#volumes">卷册</a>
        <a href="${articleUrl(firstArticle)}">阅读</a>
        <a href="assets/maozedong-xuanji-5-volumes.pdf">PDF</a>
      `;

  return `
    <header class="site-header">
      <a class="brand" href="#" aria-label="返回首页">
        <span class="brand-mark" aria-hidden="true">文</span>
        <span>毛泽东选集</span>
      </a>
      <nav class="top-nav" aria-label="主导航">
        ${navigation}
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
    ${renderHeader({ archiveHome: true })}
    <main class="archive-shell">
      <section class="archive-masthead" aria-labelledby="home-title">
        <h1 id="home-title">毛泽东选集</h1>
        <p>五卷文献，按历史时期编排。为检索、引用与长文阅读重新整理。</p>
        <form class="archive-search" data-home-filter>
          <input
            type="search"
            name="q"
            autocomplete="off"
            aria-label="搜索文献、标题、正文"
            placeholder="搜索文献、标题、正文"
          />
          <button type="submit">搜索</button>
        </form>
        <div class="archive-stats" aria-label="文库统计">
          <span>1925-1957</span>
          <span>五卷</span>
          <span data-home-count>${library.articles.length}篇</span>
        </div>
        <aside class="archive-quick-index" aria-label="快速索引">
          <h2>快速索引</h2>
          ${library.volumes.map(renderArchiveQuickLink).join("")}
        </aside>
      </section>

      <section class="archive-volume-board" id="volumes" aria-label="卷册目录" data-home-volumes>
        ${library.volumes.map((volume) => renderArchiveVolumeRow(volume, "")).join("")}
      </section>
      <section class="archive-empty" data-home-empty>没有找到匹配的篇目。</section>
    </main>
  `;
}

function renderArchiveQuickLink(volume) {
  return `
    <a href="#${volume.id}">
      <span>${escapeHtml(volume.label)}</span>
      <span>${escapeHtml(volume.title)}</span>
    </a>
  `;
}

function normalizeQuery(value) {
  return String(value ?? "").trim().toLowerCase();
}

function articleMatchesQuery(article, query) {
  if (!query) {
    return true;
  }

  return article.searchText.includes(query) || String(article.date ?? "").toLowerCase().includes(query);
}

function highlightMatch(value, query) {
  const text = String(value);

  if (!query) {
    return escapeHtml(text);
  }

  const index = text.toLowerCase().indexOf(query);

  if (index < 0) {
    return escapeHtml(text);
  }

  return `${escapeHtml(text.slice(0, index))}<mark>${escapeHtml(text.slice(index, index + query.length))}</mark>${escapeHtml(text.slice(index + query.length))}`;
}

function renderArchiveVolumeRow(volume, query) {
  const articles = volume.articleIds
    .map((id) => articlesById.get(id))
    .filter((article) => article && articleMatchesQuery(article, query));

  if (!articles.length) {
    return "";
  }

  return `
    <article class="archive-volume-row" id="${volume.id}">
      <div class="archive-volume-meta">
        <h2>${escapeHtml(volume.label)}</h2>
        <p>${escapeHtml(volume.title)}</p>
        <span>${escapeHtml(volume.period)}<br>${volume.articleIds.length}篇</span>
      </div>
      <div class="archive-article-grid">
        ${articles.map((article) => `
          <a class="archive-article-link" href="${articleUrl(article)}">
            <span class="archive-article-number">${String(article.number).padStart(3, "0")}</span>
            <span>
              ${highlightMatch(article.title, query)}
              ${article.date ? `<small>${escapeHtml(article.date)}</small>` : ""}
            </span>
          </a>
        `).join("")}
      </div>
    </article>
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
  bindHomeArchiveFilter();

  if (route.view === "home" && /^#(volumes|volume-\d+)/.test(window.location.hash)) {
    document.querySelector(window.location.hash)?.scrollIntoView();
    return;
  }

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

function bindHomeArchiveFilter() {
  const form = document.querySelector("[data-home-filter]");
  const volumesNode = document.querySelector("[data-home-volumes]");
  const emptyNode = document.querySelector("[data-home-empty]");
  const countNode = document.querySelector("[data-home-count]");
  const input = form?.querySelector("input");

  if (!form || !volumesNode || !emptyNode || !countNode || !input) {
    return;
  }

  const update = () => {
    const query = normalizeQuery(input.value);
    let visibleCount = 0;

    const html = library.volumes.map((volume) => {
      const articles = volume.articleIds
        .map((id) => articlesById.get(id))
        .filter((article) => article && articleMatchesQuery(article, query));

      visibleCount += articles.length;
      return articles.length ? renderArchiveVolumeRow(volume, query) : "";
    }).join("");

    volumesNode.innerHTML = html;
    volumesNode.style.display = visibleCount ? "block" : "none";
    emptyNode.style.display = visibleCount ? "none" : "block";
    countNode.textContent = query ? `${visibleCount}个结果` : `${library.articles.length}篇`;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    update();
  });

  input.addEventListener("input", update);
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
