/** @format */

// Initialize the map

const log_features = ["Marine"];
console.info(
	"Logging these features (warnings):",
	(log_features || ["None"]).toString()
);

const map = L.map("map").setView([39.8283, -98.5795], 5); // Centered on the US

// Add state borders to the map
map.on("zoomend", addCountyBorders);
window.countyBordersShown = false;
function addCountyBorders() {
	if (map.getZoom() < 9) {
		if (window.countyBordersShown) {
			console.info("Removing county borders to the map.");
			clearLayers(["county-borders"]);
		}
		window.countyBordersShown = false;
		return;
	}
	if (window.countyBordersShown) {
		return;
	}
	console.info("Adding county borders to the map.");
	window.countyBordersShown = true;
	fetch("./json/counties.json")
		.then((response) => response.json())
		.then((data) => {
			L.geoJSON(data, {
				style: {
					color: getColor("county"), // Light gray for border color
					weight: 3, // Border width
					opacity: config.opacity.countyBorders, // low opactiy
					fillOpacity: 0, // Make the polygon fill transparent
				},
				id: "county-borders",
				interactive: false,
			})
				.addTo(map)
				.bringToFront();
		});
}
// Add a dark-themed tile layer to the map (using CartoDB Dark Matter tiles)
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
	attribution:
		'&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Function to format the expiration time
function formatExpirationTime(expirationTime) {
	const expirationDate = new Date(expirationTime);
	const now = new Date();
	const timeDiff = expirationDate - now;

	const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
	const hours = Math.floor(
		(timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
	);
	const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

	let formattedTime = "";
	if (days > 0) {
		formattedTime += `${days}d `;
	}
	if (hours > 0 || days > 0) {
		formattedTime += `${hours}h `;
	}
	formattedTime += `${minutes}m ${seconds}s`;

	return formattedTime.trim();
}

// Function to get the popup text based on the feature
function getPopupText(feature) {
    let weatherEvent = feature.properties.event;

    if (log_features.matchesAny(weatherEvent)) {
        console.log(feature);
    }

    const popupContent = `
        ${asText(getSevereStorm(feature))}
        <button id="show-alert-text" style="margin-top: 10px; padding: 10px; border-radius: 5px; background-color: #007bff; color: white; border: none; cursor: pointer;">
            Show Alert Text
        </button>
    `;

    return popupContent;
}

function timePassedAsSeconds(time) {
	const now = new Date();
	const timeDiff = now - time;
	const seconds = Math.floor(timeDiff / 1000);
	return seconds;
}

// Function to fetch and update weather alerts
function updateWeatherAlerts() {
	fetch("https://api.weather.gov/alerts/active", {
		headers: {
			"User-Agent": "WIP Web Weather App (admin@arch1010.dev)",
		},
	})
		.then((response) => response.json())
		.then((data) => {
			// Sort alerts and watches
			data.features.sort((a, b) => {
				const order = ["Warning", "Advisory", "Watch"];
				const aIndex = order.findIndex((type) =>
					a.properties.event.includes(type)
				);
				const bIndex = order.findIndex((type) =>
					b.properties.event.includes(type)
				);
				return (
					(bIndex === -1 ? -1 : order.length - bIndex) -
					(aIndex === -1 ? -1 : order.length - aIndex)
				);
			});

			// Clear existing layers
			clearLayers(["weather-alerts", "weather-alerts-border"]);

			// Add the black border around each polygon
			L.geoJSON(data, {
				style: function (feature) {
					return {
						color: "black", // Outer border color
						weight: 5, // Outer border width
						opacity: config.opacity.polygon, // Outer border opacity
						fillOpacity: 0, // Make the polygon fill transparent
					};
				},
				id: "weather-alerts-border",
			}).addTo(map);

			// Add the GeoJSON layer to the map with color coding
			L.geoJSON(data, {
				style: function (feature) {
					return {
						color: getColor(feature.properties.event), // Border color
						weight: 3, // Border width
						opacity: config.opacity.polygon, // Outer border opacity
						fillOpacity: config.opacity.polygon_fill, // Polygon fill opacity
					};
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
		});
}

// Function to clear existing layers
function clearLayers(layerIds) {
	map.eachLayer((layer) => {
		if (layer.options && layerIds.includes(layer.options.id)) {
			map.removeLayer(layer);
		}
	});
}

// Function to fetch and update radar layer
function updateRadarLayer() {
	// Clear existing radar layers
	clearLayers(["radar-layer"]);

	// Add the radar layer
	L.tileLayer
		.wms("https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi", {
			layers: "nexrad-n0r-900913",
			format: "image/png",
			transparent: true,
			attribution: "Weather data © 2024 IEM Nexrad",
			id: "radar-layer",
			opacity: config.opacity.radar, // Set the opacity of the radar layer
		})
		.addTo(map);
}

// Function to update the countdown timer
function updateCountdown(force) {
	force = force || false;
	if (window.countdownIsRunning && !force) {
		return console.warn("The countdown is already active, skipping.");
	}
	const countdownElement = document.getElementById("countdown");
	let timeLeft = 60;
	window.timeUntilNextUpdate = timeLeft;
	window.countdownIsRunning = true;
	window.lastUpdate = new Date();

	setInterval(() => {
		timeLeft = window.timeUntilNextUpdate;
		timeLeft -= 1;
		countdownElement.innerText = `Next update in: ${timeLeft}s`;

		if (timeLeft <= 0) {
			timeLeft = 60;
			window.timeUntilNextUpdate = timeLeft;
			updateWeatherAlerts();
			updateRadarLayer();
		}
		window.timeUntilNextUpdate = timeLeft;
	}, 1000);
}

// Add countdown timer to the map
const countdownDiv = L.control({ position: "bottomright" });
countdownDiv.onAdd = function () {
	const div = L.DomUtil.create("div", "countdown");
	div.id = "countdown";
	div.innerText = "Next update in: 60s";
	div.style.padding = "5px";
	div.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
	div.style.color = "white";
	div.style.fontSize = "14px";
	div.style.borderRadius = "5px";
	div.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
	return div;
};
countdownDiv.addTo(map);

function getSevereStorm(feature) {
	let weatherEvent = feature.properties.event;
	let weatherParams = feature.properties.parameters;
	let hailSize = weatherParams.maxHailSize || ["N/A"];
	let windSpeed = weatherParams.maxWindGust || ["N/A"];
	let tornadoPossible = weatherParams.tornadoDetection || ["N/A"];
	let hailSource = weatherParams.hailThreat || ["Radar Indicated"];
	let windSource = weatherParams.windThreat || ["Radar Indicated"];
	let torSeverity = weatherParams.tornadoDamageThreat || [""];

	let params = {
		event: weatherEvent,
		expires: feature.properties.expires,
		isDefault: false,
		description: feature.properties.description,
		parameters: {
			hail: {
				maxHail: hailSize[0],
				radarIndicated: hailSource[0].toTitleCase(),
			},
			wind: {
				windSpeed: windSpeed[0],
				radarIndicated: windSource[0].toTitleCase(),
			},
			tornado: {
				possible: tornadoPossible[0].toTitleCase(),
				severity: torSeverity[0].toTitleCase(),
			},
			origionalFeature: feature,
		},
	};

	// In case no hail or is 0.00"
	if (params.parameters.hail.maxHail == "0.00") {
		params.parameters.hail.maxHail = "N/A";
	}

	// In case no wind or is 0mph
	if (params.parameters.wind.windSpeed == "0mph") {
		params.parameters.wind.windSpeed = "N/A";
	}

	// In case hail has bugged with SWS
	if (
		!params.parameters.hail.maxHail.includes('"') &&
		params.parameters.hail.maxHail != "N/A"
	) {
		params.parameters.hail.maxHail += '"';
	}

	return params;
}

function getDefaults(feature) {
	let params = {
		event: feature.properties.event,
		expires: feature.properties.expires,
		description: feature.properties.description,
		isDefault: true,
		origionalFeature: feature,
	};
	return params;
}

function asText(json) {
	let weatherEvent = json.event;
	let expireTime = json.expires;
	let popupContent = `
    <strong>${weatherEvent}</strong><br>
    Expires: ${formatExpirationTime(expireTime)}<br>
`;

	const hail = json.parameters.hail.maxHail || "N/A";
	const wind = json.parameters.wind.windSpeed || "N/A";
	let hailSource = json.parameters.wind.radarIndicated || "Radar Indicated";
	let windSource = json.parameters.hail.radarIndicated || "Radar Indicated";
	const tornado = json.parameters.tornado.possible || "N/A";
	const torSeverity = json.parameters.tornado.severity || "";

	if (weatherEvent.includes("Special Weather Statement")) {
		windSource = hailSource = "Radar Indicated";
	}

	if (!json.description.includes("weakened below severe")) {
		if (hail.toUpperCase() != "N/A") {
			popupContent += `Hail: ${hail}, ${hailSource}<br>`;
		}
		if (wind.toUpperCase() != "N/A") {
			popupContent += `Wind: ${wind}, ${windSource}<br>`;
		}
		if (tornado.toUpperCase() != "N/A") {
			popupContent += `Tornado: ${tornado}<br>`;
			if (torSeverity != "") {
				popupContent += `Threat: ${torSeverity}<br>`;
			}
		}
	} else {
		popupContent += `This storm has weakened below severe limits.\nThis warning will expire soon.`;
	}

	if (json.isDefault) {
		popupContent += `<br><br><em>Click for more information (to be added)</em>`;
	}

	return popupContent;
}

function forceUpdate() {
	window.timeUntilNextUpdate = 1;
}
