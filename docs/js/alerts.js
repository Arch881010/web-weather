// Function to fetch and update weather alerts
function updateWeatherAlerts() {
	let url = config.urls.warnings;

	if (config.dev) {
		url = config.devUrls.warnings;
	}

	console.warn(url);

	if (userSettings.opacity.polygon == 0) {
		console.error(
			"Polygon opacity is set to 0, no need to load new weather alerts, skipping."
		);
		clearLayers(["weather-alerts", "weather-alerts-border"]);
		current_features = [];
		return;
	}

	fetch(url, {
		headers: {
			"User-Agent": "WIP Web Weather App (admin@arch1010.dev)",
		},
	})
		.then((response) => response.json())
		.then(async (data) => {
			// Remove features with null geometry
			data.features = data.features.filter(
				(feature) => feature.geometry !== null
			);

			
			if (config.alerts.watches) {
				const watches = await getWatches();
				console.warn("Watches " + watches.toString());
				for (const watch of watches) {
					data.features.push(watch);
				}
			}


			for (feature of data.features) {
				let torSeverity = feature.properties.parameters.tornadoDamageThreat || [
					"",
				];

				feature.properties.event = fixText(
					torSeverity[0],
					feature.properties.event
				);
				//console.log(feature.properties.event)
			}
			
			data.features = data.features.filter((feature) => {
				const eventType = feature.properties.event.toLowerCase();
				console.log(eventType);
				if (
					eventType.includes("watch") &&
					config.alerts.disabled_watches.includes(eventType)
				) {
					return false;
				}
				if (
					eventType.includes("warning") &&
					config.alerts.disabled_warnings.includes(eventType)
				) {
					return false;
				}
				if (
					eventType.includes("advisory") &&
					config.alerts.disabled_advisories.includes(eventType)
				) {
					return false;
				}

				if (eventType.includes("watch")) return config.alerts.watches;
				if (eventType.includes("warning")) return config.alerts.warnings;
				if (eventType.includes("advisories")) return config.alerts.advisories;

				return true;
			});

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

			// Sort alerts and watches
			data.features.sort((a, b) => {
				const order = ["Watch", "Advisory", "Statement", "Warning"];
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
		});
}
