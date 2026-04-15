/** @format */

const LEGACY_SPC_WATCH_INDEX_URL = "https://www.spc.noaa.gov/products/watch/";

function buildLegacyWatchSummary({ watchEvent, watchNumber, description }) {
	const sent = new Date().toISOString();
	const expires = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

	return {
		event: `${watchEvent}${watchNumber ? ` #${watchNumber}` : ""}`,
		senderName: "Storm Prediction Center",
		sent,
		expires,
		headline: "",
		isDefault: false,
		description,
		parameters: {
			hail: {
				maxHail: "N/A",
				radarIndicated: "Radar Indicated",
			},
			wind: {
				windSpeed: "N/A",
				radarIndicated: "Radar Indicated",
			},
			tornado: {
				possible: /tornado/i.test(watchEvent) ? "Possible" : "N/A",
				severity: "",
			},
			storm: {
				severity: "",
			},
		},
		watchEvent,
		watchNumber: watchNumber || "",
		watchSent: sent,
		watchExpires: expires,
		watchColor: /tornado/i.test(watchEvent) ? "#840404" : "#f5be1d",
		countyCount: 0,
	};
}

function parseLegacyLatLonPolygon(htmlText) {
	const latLonMatch = htmlText.match(/LAT\.\.\.LON\s+([0-9\s]+)/i);
	if (!latLonMatch) {
		return null;
	}

	const rawPoints = latLonMatch[1]
		.trim()
		.split(/\s+/)
		.filter((token) => /^\d{8}$/.test(token));

	if (rawPoints.length < 3) {
		return null;
	}

	const ring = rawPoints.map((token) => {
		const lat = Number.parseInt(token.slice(0, 4), 10) / 100;
		const lon = -Number.parseInt(token.slice(4), 10) / 100;
		return [lon, lat];
	});

	if (ring.length > 0) {
		const first = ring[0];
		const last = ring[ring.length - 1];
		if (first[0] !== last[0] || first[1] !== last[1]) {
			ring.push(first.slice());
		}
	}

	return {
		type: "Polygon",
		coordinates: [ring],
	};
}

function decodeHtml(htmlText) {
	return htmlText
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"');
}

function stripTags(htmlText) {
	return htmlText.replace(/<[^>]*>/g, "");
}

function parseLegacyWatchMetadata(htmlText) {
	const titleMatch = htmlText.match(/<title>\s*Storm Prediction Center\s+([^<]+?)\s*<\/title>/i);
	const fallbackTitle = titleMatch?.[1]?.trim() || "Severe Thunderstorm Watch";
	const watchEventMatch = fallbackTitle.match(/(Tornado Watch|Severe Thunderstorm Watch)/i);
	const watchNumberMatch = fallbackTitle.match(/(\d+)/);
	const watchEvent = watchEventMatch ? watchEventMatch[1] : "Watch";
	const watchNumber = watchNumberMatch ? watchNumberMatch[1] : "";

	const preMatch = htmlText.match(/<pre>([\s\S]*?)<\/pre>/i);
	const description = preMatch
		? decodeHtml(stripTags(preMatch[1])).trim()
		: fallbackTitle;

	return {
		watchEvent,
		watchNumber,
		description,
	};
}

async function getLegacySpcWatchPageUrls() {
	const response = await fetch(LEGACY_SPC_WATCH_INDEX_URL);
	if (!response.ok) {
		throw new Error(`Legacy SPC index HTTP error! status: ${response.status}`);
	}

	const htmlText = await response.text();
	const matches = [...htmlText.matchAll(/ww(\d{4})\.html/gi)];
	const watchNumbers = [...new Set(matches.map((match) => match[1]))];

	return watchNumbers.map(
		(number) => `${LEGACY_SPC_WATCH_INDEX_URL}ww${number}.html`
	);
}

async function getLegacySpcWatches() {
	try {
		const watchPageUrls = await getLegacySpcWatchPageUrls();
		if (watchPageUrls.length === 0) {
			return [];
		}

		const results = await Promise.all(
			watchPageUrls.map(async (pageUrl) => {
				try {
					const response = await fetch(pageUrl);
					if (!response.ok) {
						return null;
					}

					const htmlText = await response.text();
					const geometry = parseLegacyLatLonPolygon(htmlText);
					if (!geometry) {
						return null;
					}

					const metadata = parseLegacyWatchMetadata(htmlText);
					return {
						id: `spc-watch-${metadata.watchNumber || pageUrl}`,
						type: "Feature",
						geometry,
						properties: buildLegacyWatchSummary(metadata),
					};
				} catch (error) {
					console.warn("Failed to load legacy SPC watch page:", pageUrl, error);
					return null;
				}
			})
		);

		return results.filter(Boolean);
	} catch (error) {
		console.error("Error fetching legacy SPC watch data:", error);
		return [];
	}
}

async function getWatches(options = {}) {
	const source = options?.source || "none";

	if (source === "legacy-spc") {
		return getLegacySpcWatches();
	}

	return [];
}
