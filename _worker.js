export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Redirect bare /guides/* paths to /docs/guides/* (Mintlify handles /docs/*)
    if (url.pathname.startsWith("/guides/")) {
      const dest = new URL(request.url);
      dest.pathname = "/docs" + url.pathname;
      return Response.redirect(dest.toString(), 301);
    }

    // Serve extension-less paths as .html (e.g. /packs → /packs.html)
    if (!url.pathname.includes(".") && url.pathname !== "/") {
      const htmlUrl = new URL(request.url);
      htmlUrl.pathname = url.pathname + ".html";
      const htmlResponse = await env.ASSETS.fetch(new Request(htmlUrl.toString(), request));
      if (htmlResponse.status === 200) return htmlResponse;
    }

    // Fall through to static assets (index.html, packs.html, etc.)
    return env.ASSETS.fetch(request);
  },
};
