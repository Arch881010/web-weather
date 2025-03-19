function drawPolygons(data) {
	// Add the black border around each polygon
	clearLayers([
		"weather-alerts",
		"weather-alerts-border",
		"weather-alerts-border-pop",
	]);

	if (config.opacity.polygon == 0) return;

	borderWeight = 7;

	L.geoJSON(data, {
		style: {
			color: "#0d0c0c", // Outer border color
			weight: borderWeight+borderWeight/3, // Outer border width
			opacity: 100, // Outer border opacity
			fillOpacity: 0, // Make the polygon fill transparent
		},
		id: "weather-alerts-border-pop",
	}).addTo(map);

	L.geoJSON(data, {
		style: {
			color: "black", // Outer border color
			weight: borderWeight, // Outer border width
			opacity: config.opacity.polygon, // Outer border opacity
			fillOpacity: 0, // Make the polygon fill transparent
		},
		id: "weather-alerts-border",
	}).addTo(map);

	// Add the GeoJSON layer to the map with color coding
	L.geoJSON(data, {
		style: function (feature) {
			const color = getColor(feature.properties.event);
			const style = {
				color: color, // Border color
				weight: 3, // Border width
				opacity: config.opacity.polygon, // Outer border opacity
				fillOpacity: config.opacity.polygon_fill, // Polygon fill opacity
			};
			if (feature.properties.event === "Tornado Emergency") {
				style.dashArray = "10,15"; // More dashed border
			}
			return style;
		},
		onEachFeature: function (feature, layer) {
			if (feature.properties) {
				layer.bindPopup(getPopupText(feature));
			}

			layer.on("popupopen", function () {
				console.log("Popup opened for feature:", feature);
				window.cachedAlertText = getAlertText(feature);
			});
		},
		id: "weather-alerts",
	})
		.addTo(map)
		.bringToFront();
}

function redrawPolygons() {
	if (current_features.length <= 0) updateWeatherAlerts();
	else drawPolygons(current_features);
}
