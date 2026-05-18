const TV_PROXY_FETCH_MS = 20_000;

const TV_PROXY_HEADER_MAP = {
	"x-cookie": "cookie",
	"x-referer": "referer",
	"x-origin": "origin",
	"x-user-agent": "user-agent",
	"x-x-real-ip": "x-real-ip",
};
const TV_PROXY_DIRECT_HEADERS = new Set([
	"accept",
	"accept-language",
	"authorization",
	"cache-control",
	"content-type",
	"pragma",
	"range",
	"x-requested-with",
]);
const TV_PROXY_BLOCKED_HEADERS = new Set([
	"connection",
	"content-length",
	"host",
	"sec-fetch-dest",
	"sec-fetch-mode",
	"sec-fetch-site",
	"sec-fetch-user",
	"upgrade-insecure-requests",
]);

function headerValue(value) {
	if (Array.isArray(value)) return value.join(", ");
	if (typeof value === "string") return value;
	return undefined;
}

function collectProxyHeaders(reqHeaders) {
	const headers = {};
	for (const [name, rawValue] of Object.entries(reqHeaders)) {
		const value = headerValue(rawValue);
		if (!value) continue;
		const mapped = TV_PROXY_HEADER_MAP[name];
		if (mapped) {
			headers[mapped] = value;
			continue;
		}
		if (TV_PROXY_DIRECT_HEADERS.has(name) || (name.startsWith("x-") && !TV_PROXY_BLOCKED_HEADERS.has(name))) {
			headers[name] = value;
		}
	}
	if (!headers["user-agent"]) {
		headers["user-agent"] =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
	}
	return headers;
}

function looksLikeM3u8(destination, contentType, buf) {
	if (contentType && /mpegurl|m3u8/i.test(contentType)) return true;
	const prefix = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 32)).trimStart();
	return prefix.startsWith("#EXTM3U");
}

function tvProxyDestinationUrl(destination, origin) {
	return `${origin}/api/tv-proxy?destination=${encodeURIComponent(destination)}`;
}

function rewriteM3u8Uri(uri, baseUrl, origin) {
	try {
		return tvProxyDestinationUrl(new URL(uri, baseUrl).href, origin);
	} catch {
		return uri;
	}
}

function rewriteM3u8Line(line, baseUrl, origin) {
	const trimmed = line.trim();
	if (!trimmed) return line;
	if (trimmed.startsWith("#")) {
		return line
			.replace(/URI="([^"]+)"/g, (_match, uri) => `URI="${rewriteM3u8Uri(uri, baseUrl, origin)}"`)
			.replace(/URI='([^']+)'/g, (_match, uri) => `URI='${rewriteM3u8Uri(uri, baseUrl, origin)}'`)
			.replace(/URI=(?!["'])([^,\s]+)/g, (_match, uri) => `URI=${rewriteM3u8Uri(uri, baseUrl, origin)}`);
	}
	const leading = line.match(/^\s*/)?.[0] || "";
	const trailing = line.match(/\s*$/)?.[0] || "";
	return `${leading}${rewriteM3u8Uri(trimmed, baseUrl, origin)}${trailing}`;
}

function rewriteM3u8Manifest(buf, baseUrl, origin) {
	const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
	const newline = text.includes("\r\n") ? "\r\n" : "\n";
	return new TextEncoder().encode(
		text.split(/\r?\n/).map((line) => rewriteM3u8Line(line, baseUrl, origin)).join(newline),
	);
}

export default async (req) => {
	const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
		"Access-Control-Allow-Headers": "*",
		"Access-Control-Expose-Headers":
			"X-Final-Destination, X-Set-Cookie, X-Content-Type, X-Content-Length, X-Location, Content-Range, Accept-Ranges",
	};

	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: corsHeaders });
	}

	const url = new URL(req.url);
	const raw = url.searchParams.get("destination");

	if (!raw) {
		return Response.json({ error: "missing destination" }, { status: 400, headers: corsHeaders });
	}

	let destination;
	try {
		destination = new URL(raw);
	} catch {
		return Response.json({ error: "invalid destination" }, { status: 400, headers: corsHeaders });
	}

	if (destination.protocol !== "http:" && destination.protocol !== "https:") {
		return Response.json({ error: "only http(s) URLs" }, { status: 400, headers: corsHeaders });
	}

	const ctrl = new AbortController();
	const timeout = setTimeout(() => ctrl.abort(), TV_PROXY_FETCH_MS);

	try {
		const reqHeaders = Object.fromEntries(req.headers.entries());
		const hasBody = req.method !== "GET" && req.method !== "HEAD";
		const body = hasBody ? await req.arrayBuffer() : undefined;

		const upstream = await fetch(destination.href, {
			method: req.method,
			redirect: "follow",
			headers: collectProxyHeaders(reqHeaders),
			body: body && body.byteLength > 0 ? body : undefined,
			signal: ctrl.signal,
		});

		let buf = req.method === "HEAD" ? new ArrayBuffer(0) : await upstream.arrayBuffer();
		clearTimeout(timeout);

		const contentType = upstream.headers.get("content-type");
		const isPlaylist = req.method !== "HEAD" && looksLikeM3u8(destination, contentType, buf);

		const origin = `${url.protocol}//${url.host}`;
		if (isPlaylist) {
			buf = rewriteM3u8Manifest(buf, upstream.url || destination.href, origin).buffer;
		}

		const responseHeaders = new Headers(corsHeaders);
		responseHeaders.set("X-Final-Destination", upstream.url || destination.href);

		const responseContentType = isPlaylist ? "application/vnd.apple.mpegurl; charset=utf-8" : contentType;
		if (responseContentType) {
			responseHeaders.set("Content-Type", responseContentType);
			responseHeaders.set("X-Content-Type", responseContentType);
		}

		const contentLength = isPlaylist ? String(buf.byteLength) : upstream.headers.get("content-length");
		if (contentLength) responseHeaders.set("X-Content-Length", contentLength);

		const contentRange = upstream.headers.get("content-range");
		if (contentRange) responseHeaders.set("Content-Range", contentRange);

		const acceptRanges = upstream.headers.get("accept-ranges");
		if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

		const location = upstream.headers.get("location");
		if (location) responseHeaders.set("X-Location", location);

		const setCookie = upstream.headers.get("set-cookie");
		if (setCookie) responseHeaders.set("X-Set-Cookie", setCookie);

		return new Response(buf, { status: upstream.status, headers: responseHeaders });
	} catch (e) {
		clearTimeout(timeout);
		const msg = e?.name === "AbortError" ? "timeout" : "fetch failed";
		return Response.json({ error: msg }, { status: 502, headers: corsHeaders });
	}
};

export const config = { path: "/api/tv-proxy" };
