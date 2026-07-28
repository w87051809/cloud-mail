const CONTENT_SECURITY_POLICY = [
	"default-src 'none'",
	"base-uri 'self'",
	"connect-src 'self'",
	"font-src 'self' data:",
	"form-action 'self'",
	"frame-ancestors 'none'",
	"frame-src https://challenges.cloudflare.com",
	"img-src 'self' data: blob: https: http:",
	"object-src 'none'",
	"script-src 'self' https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline'"
].join('; ');

export function applySecurityHeaders(headers, url) {
	headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
	headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
	headers.set('Referrer-Policy', 'no-referrer');
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('X-Frame-Options', 'DENY');
	if (new URL(url).protocol === 'https:') {
		headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
	}
}

export function secureResponse(response, url) {
	if (!response) return new Response('Not Found', { status: 404 });
	const secured = new Response(response.body, response);
	applySecurityHeaders(secured.headers, url);
	return secured;
}
