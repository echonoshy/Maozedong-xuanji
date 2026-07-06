export function searchArticles(articles, query, limit = 24) {
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
