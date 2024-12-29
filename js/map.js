/** @format */

//TODO: Move this to a separate file

String.prototype.toTitleCase = function () {
	// https://stackoverflow.com/a/196991
	return this.replace(
		/\w\S*/g,
		(text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
	);
};

function convertToText(text) {
	if (text.includes("Tornado Watch")) {
		return "Tornado Watch";
	}
	if (text.includes("Severe Thunderstorm Watch")) {
		return "Severe Thunderstorm Watch";
	}
	if (text.includes("Tornado")) {
		return "Tornado";
	}
	if (text.includes("Severe Thunderstorm")) {
		return "Severe Thunderstorm";
	}
	if (text.includes("Flood")) {
		return "Flood";
	}
	if (text.includes("Heat")) {
		return "Heat";
	}
	if (text.includes("Winter Storm")) {
		return "Winter Storm";
	}
	if (text.includes("Fire")) {
		return "Fire";
	}
	if (text.includes("Fog")) {
		return "Fog";
	}
	if (text.includes("Marine")) {
		return "Marine";
	}
	if (text.includes("Weather Statement")) {
		return "Weather Statement";
	}
	return "Default";
}

const alertColors = {
	"Severe Thunderstorm": "#ff9900",
	"Tornado": "#ff0000",
	"Flood": "#00ff00",
	"Weather Statement": "#add8e6",
	"Marine": "#E0B0FF",
	"Tornado Watch": "#0000ff",
	"Severe Thunderstorm Watch": "#0000ff",
	"Flood Watch": "#0000ff",
	"Default": "#ffffff",
};

const declaredAlerts = [
	"Tornado",
	"Severe Thunderstorm",
	"Special Weather Statement",
];

// end

// Initialize the map

const config = {
	opacity: {
		radar: 0.5,
		polygon_fill: 0,
		polygon: 1,
		countyBorders: 0.1,
	},
};

const map = L.map("map").setView([39.8283, -98.5795], 5); // Centered on the US

// Add state borders to the map
function addCountyBorders() {
	fetch("./json/counties.json")
		.then((response) => response.json())
		.then((data) => {
			L.geoJSON(data, {
				style: {
					color: "#D3D3D3", // Light gray for border color
					weight: 3, // Border width
					opacity: config.opacity.countyBorders, // low opactiy
					fillOpacity: 0, // Make the polygon fill transparent
				},
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

// Define a function to get the color based on the type of the alert
function getColor(eventType) {
	return alertColors[convertToText(eventType)];
}

// Function to format the expiration time
function formatExpirationTime(expirationTime) {
	const expirationDate = new Date(expirationTime);
	const now = new Date();
	const timeDiff = expirationDate - now;
	const minutes = Math.floor(timeDiff / 60000);
	const seconds = Math.floor((timeDiff % 60000) / 1000);
	return `${minutes}m ${seconds}s`;
}

// Function to get the popup text based on the feature
function getPopupText(feature) {
	let weatherEvent = feature.properties.event;

	if (weatherEvent.includes("Tornado")) {
		console.log(feature);
	}

	return asText(getSevereStorm(feature));
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
			// Sort alerts
			data.features.sort((a, b) => {
				const order = [
					"Tornado",
					"Severe Thunderstorm",
					"Special Weather Statement",
				];
				const aIndex = order.findIndex((type) =>
					a.properties.event.includes(type)
				);
				const bIndex = order.findIndex((type) =>
					b.properties.event.includes(type)
				);
				return (
					(aIndex === -1 ? order.length : aIndex) -
					(bIndex === -1 ? order.length : bIndex)
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
						fillOpacity: config.opacity.polygon_fill, // Make the polygon fill transparent
					};
				},
				onEachFeature: function (feature, layer) {
					if (feature.properties) {
						layer.bindPopup(getPopupText(feature));
					}
				},
				id: "weather-alerts",
			}).addTo(map).bringToFront();
		});
}

// Function to fetch and update the watches
function updateWatches() {
	fetch("https://api.weather.gov/alerts/active?event=Watch", {
		headers: {
			"User-Agent": "WIP Web Weather App (admin@arch1010.dev)",
		},
	})
		.then((response) => response.json())
		.then((data) => {
			// Clear existing watch layers
			clearLayers(["weather-watches"]);

			// Add the watch layer
			L.geoJSON(data, {
				style: function (feature) {
					return {
						color: getColor(feature.properties.event), // Border color
						weight: 3, // Border width
						fillOpacity: config.opacity.polygon_fill, // Make the polygon fill transparent
					};
				},
				onEachFeature: function (feature, layer) {
					if (feature.properties) {
						layer.bindPopup(asText(getDefaults(feature)));
					}
				},
				id: "watch-alerts",
			}).addTo(map);
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
function updateCountdown() {
	const countdownElement = document.getElementById("countdown");
	let timeLeft = 60;

	setInterval(() => {
		timeLeft -= 1;
		countdownElement.innerText = `Next update in: ${timeLeft}s`;

		if (timeLeft <= 0) {
			timeLeft = 60;
			updateWeatherAlerts();
			updateRadarLayer();
			updateWatches();
		}
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

// Initial fetch and update
setTimeout(() => {
	updateRadarLayer();
	addCountyBorders();
	updateWeatherAlerts();
	updateWatches();
	updateCountdown();
}, 500);

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

function matchesAny(text) {
	for (let i = 0; i < declaredAlerts.length; i++) {
		if (text.includes(declaredAlerts[i])) {
			return true;
		}
	}
	return false;
}
