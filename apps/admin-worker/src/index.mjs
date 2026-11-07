/**
 * Preview admin Worker.
 *
 * Static UI is served by Workers Static Assets with hardened browser security
 * headers and noindex protection. All /api requests are forwarded to the
 * central API using a private service binding.
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
  if (!headers.has("X-Robots-Tag")) {
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
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

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return env.API.fetch(request);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse);
  }
};
