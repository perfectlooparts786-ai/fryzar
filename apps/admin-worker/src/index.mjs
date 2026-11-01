/**
 * Preview admin Worker.
 *
 * Static UI is served by Workers Static Assets. All /api requests are
 * forwarded to the central API using a private service binding.
 */
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return env.API.fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};
