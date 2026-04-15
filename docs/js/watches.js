/** @format */

const WATCHES_URL = "https://data.arch1010.dev/watches";

function toPolygonGeometry(feature) {
	const properties = feature?.properties || {};
	const ringSource = Array.isArray(properties.coordinates)
		? properties.coordinates
		: feature?.geometry?.type === "LineString" && Array.isArray(feature?.geometry?.coordinates)
			? feature.geometry.coordinates
			: null;

	if (!ringSource) {
		return feature?.geometry;
	}

	const ring = ringSource.map((coordinate) => [coordinate[0], coordinate[1]]);
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

function buildWatchSummary(feature) {
	const properties = feature.properties || {};
	const watchEvent = properties.watchEvent || "Watch";
	const watchNumber = properties.watchNumber ? ` #${properties.watchNumber}` : "";
	const sent = properties.watchSent || properties.sent || new Date().toISOString();
	const expires = properties.watchExpires || properties.expires || sent;
	const countyCount = properties.countyCount ? `${properties.countyCount} counties affected` : "";
	const description = typeof properties.description === "string"
		? properties.description.trim()
		: "";
	const fallbackDescription = [
		`${watchEvent}${watchNumber}`,
		countyCount,
		`Expires ${new Date(expires).toUTCString()}`,
	].filter(Boolean).join("\n");

	return {
		event: `${watchEvent}${watchNumber}`,
		senderName: "Storm Prediction Center",
		sent,
		expires,
		headline: "",
		isDefault: false,
		description: description || fallbackDescription,
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
			originalFeature: feature,
		},
		watchEvent,
		watchId: properties.watchId ?? null,
		watchNumber: properties.watchNumber || "",
		watchSent: sent,
		watchExpires: expires,
		watchColor: properties.watchColor || "",
		countyCount: properties.countyCount || 0,
	};
}

async function getWatches() {
	try {
		const response = await fetch(WATCHES_URL);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		const features = Array.isArray(data) ? data : (data.features || []);
		const watchFeatures = features.filter((feature) => feature?.properties?.featureType === "county-watch-outline");

		return watchFeatures.map((feature) => ({
			id: feature.id,
			type: "Feature",
			geometry: toPolygonGeometry(feature),
			properties: buildWatchSummary(feature),
		}));
	} catch (error) {
		console.error("Error fetching watch data:", error);
		return [];
	}
}
