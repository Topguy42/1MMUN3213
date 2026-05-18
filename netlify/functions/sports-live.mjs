export default async (req) => {
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Cache-Control": "public, max-age=60, stale-while-revalidate=30",
	};

	const relay = process.env.SPORTS_RELAY || process.env.NEXT_PUBLIC_SPORTS_RELAY;

	if (relay) {
		try {
			const relayUrl = relay.startsWith("http") ? relay : `https://${relay}`;
			const r = await fetch(relayUrl);
			if (r.ok) {
				const data = await r.json();
				if (data.success) return Response.json(data, { headers });
			}
		} catch {}
	}

	try {
		const r = await fetch("https://ntvs.cx/api/get-matches?server=kobra&type=both", {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
				Accept: "application/json, text/plain, */*",
				"Accept-Language": "en-US,en;q=0.9",
				Origin: "https://ntvs.cx",
				Referer: "https://ntvs.cx/",
			},
		});
		const text = await r.text();
		if (!r.ok) {
			return Response.json(
				{ success: false, error: `ntvs ${r.status}`, body: text.slice(0, 300) },
				{ status: 502, headers },
			);
		}
		const data = JSON.parse(text);
		return Response.json(data, { headers });
	} catch (e) {
		return Response.json({ success: false, error: String(e) }, { status: 502, headers });
	}
};

export const config = { path: "/api/sports/live" };
