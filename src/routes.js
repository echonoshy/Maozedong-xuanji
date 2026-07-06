export function articlePath(id) {
  return `#/read/${encodeURIComponent(id)}`;
}

export function searchPath(query) {
  return `#/search/${encodeURIComponent(query.trim())}`;
}

export function parseRoute(hash) {
  const route = hash.replace(/^#/, "");

  if (!route || route === "/") {
    return { view: "home" };
  }

  const readMatch = route.match(/^\/read\/(.+)$/);

  if (readMatch) {
    return {
      view: "article",
      id: decodeURIComponent(readMatch[1]),
    };
  }

  const searchMatch = route.match(/^\/search\/(.+)$/);

  if (searchMatch) {
    return {
      view: "search",
      query: decodeURIComponent(searchMatch[1]),
    };
  }

  return { view: "home" };
}
