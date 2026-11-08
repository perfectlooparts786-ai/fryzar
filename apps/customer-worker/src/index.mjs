/**
 * Preview customer Worker.
 *
 * Static UI is served by Workers Static Assets with hardened browser security
 * headers. All /api requests plus public crawl metadata (/sitemap.xml and
 * /robots.txt) are forwarded to the central API using a private service binding.
 */
function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  if (!headers.has("X-Content-Type-Options")) {
    headers.set("X-Content-Type-Options", "nosniff");
  }
  if (!headers.has("Referrer-Policy")) {
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  if (!headers.has("X-Frame-Options")) {
    headers.set("X-Frame-Options", "DENY");
  }
  if (!headers.has("Permissions-Policy")) {
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }
  if (!headers.has("Content-Security-Policy")) {
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; connect-src 'self' https:; frame-src https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    );
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (
      pathname === "/api" ||
      pathname.startsWith("/api/") ||
      pathname === "/sitemap.xml" ||
      pathname === "/robots.txt"
    ) {
      return env.API.fetch(request);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse);
  }
};
