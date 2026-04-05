export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Redirect bare /guides/* paths to /docs/guides/* (Mintlify handles /docs/*)
    if (url.pathname.startsWith("/guides/")) {
      const dest = new URL(request.url);
      dest.pathname = "/docs" + url.pathname;
      return Response.redirect(dest.toString(), 301);
    }

    // Fall through to static assets (index.html, packs.html, etc.)
    return env.ASSETS.fetch(request);
  },
};
