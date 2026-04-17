// The order to sort the alerts
const order = [
	"Tornado Warning",
	"Severe Thunderstorm Warning",
	"Warning-Background",
	"Warning",
	"Statement",
	"Advisory-Background",
	"Advisory",
	"Watch-Background",
	"Watch",
];

async function mergeWatchPolygons(data, watchSource = "none") {
	if (!config.show.watches || watchSource !== "legacy-spc") return data;

	const watches = await getWatches({ source: watchSource });
	if (watches.length > 0) {
		data.features.push(...watches);
	}

	return data;
}

function sortAlertPolygons(data) {
	function getSeverityRank(event) {
		const e = (event || "").toLowerCase();
		if (e.includes("tornado warning")) return 0;
		if (e.includes("tornado watch")) return 1;
		if (e.includes("severe thunderstorm warning")) return 2;
		if (e.includes("severe thunderstorm watch")) return 3;
		return 4;
	}

	data.features.sort((a, b) => {
		const aIndex = order.findIndex((type) => a.properties.event.includes(type));
		const bIndex = order.findIndex((type) => b.properties.event.includes(type));

		if (aIndex !== bIndex) {
			return aIndex - bIndex;
		}

		const aSeverity = getSeverityRank(a.properties.event);
		const bSeverity = getSeverityRank(b.properties.event);
		if (aSeverity !== bSeverity) {
			return aSeverity - bSeverity;
		}

		const aTime = new Date(a.properties.sent).getTime();
		const bTime = new Date(b.properties.sent).getTime();
		return aTime - bTime;
	});

	return data;
}

async function processAlertData(data, watchSource = "none") {
	data.features = data.features.filter((feature) => feature.geometry !== null);

	if ((localStorage.getItem("hideFloods") ?? true) == true) {
		data.features = data.features.filter((feature) => {
			const event = feature.properties.event.toLowerCase();
			return event !== "flood warning" && event !== "flood advisory";
		});
	}

	await mergeWatchPolygons(data, watchSource);
	sortAlertPolygons(data);
	drawPolygons(data);
	current_features = data;
	return data;
}

// Function to fetch and update weather alerts
function updateWeatherAlerts() {
	if (userSettings.opacity.polygon == 0) {
		console.error(
			"Polygon opacity is set to 0, no need to load new weather alerts, skipping."
		);
		clearLayers(["weather-alerts", "weather-alerts-border", "weather-alerts-background"]);
		current_features = [];
		return;
	}

	if (window.timeUntilNextUpdate < 59) {
		console.warn(
			"Skipping weather alerts update no need to update yet, next update in " +
				window.timeUntilNextUpdate +
				" seconds."
		);
		return;
	}

	if (config.dev.status) {
		console.info(
			"Dev mode enabled — loading local test data: ./test-data/" + config.dev.warnings_file
		);
		fetch("./test-data/" + config.dev.warnings_file)
			.then((response) => response.json())
			.then((data) => processAlertData(data))
			.catch((err) => console.error("Failed to load local test data:", err));
		return;
	}

	const alertUrl = `${config.api}?status=actual&urgency=Immediate,Expected,Future,Past,Unknown`;

	fetch(alertUrl, {
		headers: { "User-Agent": "WIP Web Weather App (admin@arch1010.dev)" },
	})
		.then((response) => response.json())
		.then((data) => processAlertData(data))
		.catch((error) => {
			console.error(
				"Primary API failed, falling back to weather.gov API:",
				error
			);
			if (config.api === "https://api.weather.gov/alerts/active") {
				console.warn("Already using weather.gov API, no fallback available.");
				throw new Error("No fallback available");
			}

			return fetch(
				"https://api.weather.gov/alerts/active?status=actual&urgency=Immediate,Expected,Future,Past,Unknown",
				{
					headers: { "User-Agent": "WIP Web Weather App (admin@arch1010.dev)" },
				}
			)
				.then((response) => response.json())
				.then((data) => processAlertData(data, "legacy-spc"))
				.catch((fallbackError) => {
					console.error("Both APIs failed:", fallbackError);
				});
		});
}