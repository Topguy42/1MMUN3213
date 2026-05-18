const META_MAX_BYTES = 450_000;
const META_FETCH_MS = 10_000;

function decodeBasicEntities(s) {
	return s
		.replaceAll(/\s+/g, " ")
		.replaceAll(/&nbsp;/gi, " ")
		.replaceAll("&amp;", "&")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&#39;", "'")
		.replaceAll(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
		.replaceAll(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(Number.parseInt(h, 16)))
		.trim();
}

function absolutize(href, baseUrl, docBase) {
	if (!href || href.startsWith("data:") || href.startsWith("javascript:")) return null;
	try {
		return new URL(href, docBase || baseUrl).href;
	} catch {
		return null;
	}
}

function googleFavicon(hostname) {
	return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
}

function parseTabMeta(html, finalUrl) {
	const pageUrl = new URL(finalUrl);
	const baseMatch = /<base[^>]+href\s*=\s*["']([^"']+)["']/i.exec(html);
	const docBase = baseMatch ? absolutize(baseMatch[1], pageUrl.href, pageUrl.href) : pageUrl.href;

	let title = "";
	const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
	if (titleMatch) title = decodeBasicEntities(titleMatch[1]).slice(0, 240);

	let iconHref = null;
	const linkRe = /<link\b[^>]*>/gi;
	let m;
	while ((m = linkRe.exec(html)) !== null) {
		const tag = m[0];
		const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag);
		if (!rel) continue;
		const r = rel[1].toLowerCase();
		if (!r.includes("icon") && r !== "shortcut icon" && !r.includes("apple-touch")) continue;
		const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
		if (!href) continue;
		const abs = absolutize(href[1], pageUrl.href, docBase);
		if (abs) {
			iconHref = abs;
			break;
		}
	}

	if (!iconHref) {
		iconHref = new URL("/favicon.ico", docBase).href;
	}

	return {
		title: title || pageUrl.hostname,
		iconUrl: iconHref,
		fallbackIconUrl: googleFavicon(pageUrl.hostname),
		hostname: pageUrl.hostname,
	};
}

export default async (req) => {
	const url = new URL(req.url);
	const raw = url.searchParams.get("url");

	if (!raw) {
		return Response.json({ error: "missing url" }, { status: 400 });
	}

	let u;
	try {
		u = new URL(raw.trim());
	} catch {
		try {
			u = new URL(`https://${raw.trim()}`);
		} catch {
			return Response.json({ error: "invalid url" }, { status: 400 });
		}
	}

	if (u.protocol !== "http:" && u.protocol !== "https:") {
		return Response.json({ error: "only http(s) URLs" }, { status: 400 });
	}

	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), META_FETCH_MS);
	try {
		const r = await fetch(u.href, {
			redirect: "follow",
			signal: ctrl.signal,
			headers: {
				Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
				"User-Agent": "Mozilla/5.0 (compatible; OneMMUN3TabMeta/1.0)",
			},
		});
		clearTimeout(t);

		if (!r.ok) {
			return Response.json({ error: `site returned ${r.status}` }, { status: 502 });
		}

		const ct = r.headers.get("content-type") || "";
		if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
			return Response.json({
				title: u.hostname,
				iconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=64`,
				fallbackIconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=64`,
				hostname: u.hostname,
			});
		}

		const buf = await r.arrayBuffer();
		const slice = buf.byteLength > META_MAX_BYTES ? buf.slice(0, META_MAX_BYTES) : buf;
		const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
		return Response.json(parseTabMeta(html, r.url || u.href));
	} catch (e) {
		clearTimeout(t);
		const msg = e?.name === "AbortError" ? "timeout" : "fetch failed";
		return Response.json({ error: msg }, { status: 502 });
	}
};

export const config = { path: "/api/tab-meta" };
