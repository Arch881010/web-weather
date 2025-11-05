// The order to sort the alerts
const order = [
	"Watch-Background",
	"Watch",
	"Advisory-Background",
	"Advisory",
	"Statement",
	"Warning-Background",
	"Warning",
];

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

	// If dev mode is enabled, use local test data instead of remote API
	if (config.dev.status) {
		console.info(
			"Dev mode enabled — loading local test data: ./test-data/ww/2023/real-fake.json"
		);
		fetch(("./test-data/" + config.dev.warnings_file))
			.then((response) => response.json())
			.then(async (data) => {
				// Remove features with null geometry
				data.features = data.features.filter(
					(feature) => feature.geometry !== null
				);

				if ((localStorage.getItem("hideFloods") ?? true) == true) {
					// Exclude Flood Warnings
					data.features = data.features.filter(
						(feature) =>
							feature.properties.event.toLowerCase() !== "flood warning"
					);

					// Exclude Flood Advisories
					data.features = data.features.filter(
						(feature) =>
							feature.properties.event.toLowerCase() !== "flood advisory"
					);
				}
				if (config.show.watches) {
					const watches = await getWatches();
					console.warn("Watches " + watches.toString());
					for (const watch of watches) {
						data.features.push(watch);
					}
				}

				// Sort alerts and watches
				data.features.sort((a, b) => {
					// const order = ["Watch", "Advisory", "Statement", "Warning"];
					const aIndex = order.findIndex((type) =>
						a.properties.event.includes(type)
					);
					const bIndex = order.findIndex((type) =>
						b.properties.event.includes(type)
					);

					if (aIndex !== bIndex) {
						return aIndex - bIndex;
					}

					const aTime = new Date(a.properties.sent).getTime();
					const bTime = new Date(b.properties.sent).getTime();
					return aTime - bTime;
				});

				drawPolygons(data);
				current_features = data;
			})
			.catch((err) => console.error("Failed to load local test data:", err));
		return;
	}

	// Normal production fetch
	fetch(
		`${config.api}?status=actual&urgency=Immediate,Expected,Future,Past,Unknown`,
		{
			headers: { "User-Agent": "WIP Web Weather App (admin@arch1010.dev)" },
		}
	)
		.then((response) => response.json())
		.then(async (data) => {
			// Remove features with null geometry
			data.features = data.features.filter(
				(feature) => feature.geometry !== null
			);

			if ((localStorage.getItem("hideFloods") ?? true) == true) {
				// Exclude Flood Warnings
				data.features = data.features.filter(
					(feature) =>
						feature.properties.event.toLowerCase() !== "flood warning"
				);

				// Exclude Flood Advisories
				data.features = data.features.filter(
					(feature) =>
						feature.properties.event.toLowerCase() !== "flood advisory"
				);
			}
			console.log(config.show.watches);
			if (config.show.watches) {
				const watches = await getWatches();
				console.warn("Watches " + watches.toString());
				for (const watch of watches) {
					data.features.push(watch);
				}
			}

			// Sort alerts and watches
			data.features.sort((a, b) => {
				const aIndex = order.findIndex((type) =>
					a.properties.event.includes(type)
				);
				const bIndex = order.findIndex((type) =>
					b.properties.event.includes(type)
				);

				// If event types are different, sort by event type
				if (aIndex !== bIndex) {
					return aIndex - bIndex;
				}

				// If event types are the same, sort by time issued
				const aTime = new Date(a.properties.sent).getTime();
				const bTime = new Date(b.properties.sent).getTime();
				return aTime - bTime;
			});

			drawPolygons(data);
			current_features = data;
		})
		.catch((error) => {
			console.error(
				"Primary API failed, falling back to weather.gov API:",
				error
			);
			if (config.api === "https://api.weather.gov/alerts/active") {
				console.warn("Already using weather.gov API, no fallback available.");
				throw new Error("No fallback available");
			}
			// Fallback to weather.gov API
			return fetch(
				"https://api.weather.gov/alerts/active?status=actual&urgency=Immediate,Expected,Future,Past,Unknown",
				{
					headers: { "User-Agent": "WIP Web Weather App (admin@arch1010.dev)" },
				}
			)
				.then((response) => response.json())
				.then(async (data) => {
					// Remove features with null geometry
					data.features = data.features.filter(
						(feature) => feature.geometry !== null
					);

					if ((localStorage.getItem("hideFloods") ?? true) == true) {
						// Exclude Flood Warnings
						data.features = data.features.filter(
							(feature) =>
								feature.properties.event.toLowerCase() !== "flood warning"
						);

						// Exclude Flood Advisories
						data.features = data.features.filter(
							(feature) =>
								feature.properties.event.toLowerCase() !== "flood advisory"
						);
					}
					console.log(config.show.watches);
					if (config.show.watches) {
						const watches = await getWatches();
						console.warn("Watches " + watches.toString());
						for (const watch of watches) {
							data.features.push(watch);
						}
					}

					// Sort alerts and watches
					data.features.sort((a, b) => {
						const aIndex = order.findIndex((type) =>
							a.properties.event.includes(type)
						);
						const bIndex = order.findIndex((type) =>
							b.properties.event.includes(type)
						);

						// If event types are different, sort by event type
						if (aIndex !== bIndex) {
							return aIndex - bIndex;
						}

						// If event types are the same, sort by time issued
						const aTime = new Date(a.properties.sent).getTime();
						const bTime = new Date(b.properties.sent).getTime();
						return aTime - bTime;
					});

					drawPolygons(data);
					current_features = data;
					//config.api = "https://api.weather.gov"; // Update config to use weather.gov API
				})
				.catch((fallbackError) => {
					console.error("Both APIs failed:", fallbackError);
				});
		});
}
