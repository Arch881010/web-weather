/** @format */

function timePassedAsSeconds(time) {
	const now = new Date();
	const timeDiff = now - time;
	const seconds = Math.floor(timeDiff / 1000);
	return seconds;
}

/** @format */

function convertToText(text) {
	textArr = text.split("#");
	if (textArr.length > 1) text = textArr[0];
	text = text.trim().toTitleCase(); // <- This is here because I'm probably gonna make a mistake somewhere
	return text;
}

// Define a function to get the color based on the type of the alert
function getColor(text) {
	const color = colorsArray[convertToText(text)];
	return (color || colorsArray["Default"]);
}

const colorsArray = {
    "Tornado Warning": "#ff0000",
    "Severe Thunderstorm Warning": "#ffa500",
    "Flash Flood Warning": "#8b0000",
    "Tsunami Warning": "#fd6347",
    "Inland Hurricane Wind Warning": "#cd5c5c",
    "Hurricane Force Wind Warning": "#cd5c5c",
    "Hurricane Warning": "#dc143c",
    "Typhoon Warning": "#dc143c",
    "Storm Warning": "#dda0dd",
    "Blizzard Warning": "#ff4500",
    "Ice Storm Warning": "#8b008b",
    "Heavy Snow Warning": "#8a2be2",
    "Tropical Storm Warning": "#b22222",
    "Winter Storm Warning": "#ff69b4",
    "Inland Tropical Storm Warning": "#b22222",
    "Coastal Flood Warning": "#228b22",
    "Lakeshore Flood Warning": "#228b22",
    "High Surf Warning": "#228b22",
    "Heavy Sleet Warning": "#87ceeb",
    "Flood Warning": "#00ff00",
	"Flood Advisory": "#00ff7f",
    "High Wind Warning": "#daa520",
    "Lake Effect Snow Warning": "#008b8b",
    "Excessive Heat Warning": "#c71585",
    "Red Flag Warning": "#ff1493",
    "Wind Chill Warning": "#b0c4de",
    "Avalanche Warning": "#1e90ff",
    "Dust Storm Warning": "#BDB76B",
    "Freeze Warning": "#00ffff",
    "Gale Warning": "#9400d3",
    "Flash Flood Statement": "#9acd32",
    "Special Marine Warning": "#db7093",
    "Severe Weather Statement": "#00ffff",
    "Tornado Watch": "#ffff00",
	"Severe Thunderstorm Watch": "#8B8000",
    "Flash Flood Watch": "#32cd32",
    "Hurricane Watch": "#ff00ff",
    "Typhoon Watch": "#ff00ff",
    "Hurricane Local Statement": "#9370db",
    "Typhoon Local Statement": "#9370db",
    "Snow And Blowing Snow Advisory": "#b0e0e6",
    "Freezing Rain Advisory": "#6a5acd",
    "Freezing Drizzle Advisory": "#6a5acd",
    "Sleet Advisory": "#7b68ee",
    "Winter Weather Advisory": "#deb887",
    "Lake Effect Snow Advisory": "#48d1cc",
    "Wind Chill Advisory": "#afeeee",
    "Heat Advisory": "#ff7f50",
    "High Surf Advisory": "#ba55d3",
    "Blowing Snow Advisory": "#add8e6",
    "Snow Advisory": "#6699cc",
    "Heavy Freezing Spray Warning": "#00bfff",
    "Dense Smoke Advisory": "#f0e68c",
    "Small Craft Advisory": "#d8bfd8",
    "Dense Fog Advisory": "#708090",
    "Marine Weather Statement": "#9932cc",
    "Lake Wind Advisory": "#d2b48c",
    "Wind Advisory": "#90ee90",
    "Blowing Dust Advisory": "#BDB76B",
	"Dust Advisory": "#BDB76B",
    "Frost Advisory": "#6495ed",
    "Ashfall Advisory": "#a9a9a9",
    "Freezing Fog Advisory": "#008080",
    "Air Stagnation Advisory": "#808080",
    "Tsunami Watch": "#ff00ff",
    "Coastal Flood Watch": "#66cdaa",
    "Lakeshore Flood Watch": "#66cdaa",
    "Flood Watch": "#2e8b57",
    "Blizzard Watch": "#adff2f",
    "Inland Tropical Storm Watch": "#f08080",
    "Tropical Storm Watch": "#f08080",
    "Inland Hurricane Wind Watch": "#ffa07a",
    "Winter Storm Watch": "#00008b",
    "Lake Effect Snow Watch": "#cd853f",
    "High Wind Watch": "#b8860b",
    "Excessive Heat Watch": "#800000",
    "Wind Chill Watch": "#5f9ea0",
    "Freeze Watch": "#000080",
    "Fire Weather Watch": "#ffdead",
    "Avalanche Watch": "#f4a460",
    "Earthquake Warning": "#8b4513",
    "Local Area Emergency": "#c0c0c0",
    "Law Enforcement Warning": "#c0c0c0",
    "911 Telephone Outage": "#c0c0c0",
    "Hazardous Materials Warning": "#4b0082",
    "Nuclear Hazard Warning": "#4b0082",
    "Radiological Hazard Warning": "#4b0082",
    "Civil Danger Warning": "#ffb6c1",
    "Civil Emergency Message": "#ffb6c1",
    "Evacuation - Immediate": "#7fff00",
	"Evacuation Immediate": "#7fff00",
    "Fire Warning": "#a0522d",
    "Shelter In Place Warning": "#fa8072",
    "Volcano Warning": "#696969",
    "Coastal Flood Statement": "#6b8e23",
    "Lakeshore Flood Statement": "#6b8e23",
    "Flood Statement": "#00ff7f",
    "Special Weather Statement": "#add8e6",
    "Short Term Forecast": "#8fbc8f",
    "Fire Danger Statement": "#e9967a",
    "Hazardous Weather Outlook": "#eee8aa",
    "Child Abduction Emergency": "#ffd700",
    "Test": "#f0ffff",
    "Default": "#ffffff"
};


const log_features = ["Tornado Watch", "Severe Thunderstorm Watch"];

// Our current features so we can cache them locally so we don't have to fetch them every time.
let current_features, counties, countyBordersLayer;
// Some dev shenangians
if (config.dev) {
	console.info("Development mode is enabled.");
	console.info(
		"Logging these features (warnings):",
		(log_features || ["None"]).toString()
	);
}

// Add state borders to the map
window.countyBordersShown = false;

async function fetchCountyBorders() {
	counties = await (await fetch("./json/counties.json")).json();
}

function getZoom() {
	try {
		return map.getZoom();
	} catch (e) {
		return 9;
	}
}

function addCountyBorders() {
	// If the zoom is < 9, that means we are zoomed out and can hide the county borders
	if (getZoom() < 9) {
		if (countyBordersLayer) {
			map.removeLayer(countyBordersLayer);
			countyBordersLayer = null;
			console.info("Hiding county borders.");
		}
		window.countyBordersShown = false;
	} else {
		if (!countyBordersLayer) {
			countyBordersLayer = L.geoJSON(counties, {
				style: {
					color: getColor("county"), // Light gray for border color
					weight: 3 * (map.getZoom() / 9), // Border width
					opacity: config.opacity.countyBorders, // low opacity
					fillOpacity: 0, // Make the polygon fill transparent
				},
				id: "county-borders",
				interactive: false,
			})
				.addTo(map)
				.bringToFront();
			console.info("Showing county borders.");
		}
		window.countyBordersShown = true;
	}
}

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

	if (log_features.matchesAny(weatherEvent) && config.dev) {
		console.info(feature);
	}

	const popupContent = `
		  ${asText(getSevereStorm(feature))}
		  <div id="btn-div" style="align-items: center; display: flex; justify-content: center; padding: 0px;">
		  <button id="show-alert-text" style="margin-top: 10px; border-radius: 5px; background-color: #007bff; color: white; border: none; cursor: pointer;">
			  Show Alert Text
		  </button>
		  </div>
	  `;

	return popupContent;
}

// Function to clear existing layers
function clearLayers(layerIds) {
	try {
		map.eachLayer((layer) => {
			if (layer.options && layerIds.includes(layer.options.id)) {
				map.removeLayer(layer);
			}
		});
	} catch (e) {
		console.warn(e);
	}
}

// Function to fetch and update radar layer
function updateRadarLayer() {
	// Clear existing radar layers
	clearLayers(["radar-layer"]);

	if (userSettings.opacity.radar == 0) {
		console.error(
			"Radar layer opacity is set to 0, no need to load new radar data, skipping."
		);
		return;
	}

	// Add the radar layer
	radarTileMap = userSettings.radar_tilemap;
	if (radarTileMap == undefined) radarTileMap = "n0q";
	L.tileLayer
		.wms(
			`https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/${radarTileMap}.cgi`,
			{
				layers: `nexrad-${radarTileMap}-900913`,
				//layers: radarTileMap,
				format: "image/png",
				transparent: true,
				attribution: "Weather data © 2024 IEM Nexrad",
				id: "radar-layer",
				opacity: config.opacity.radar, // Set the opacity of the radar layer
			}
		)
		.addTo(map);
}

async function addCountdown() {
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

function drawPolygons(data) {
	// Add the black border around each polygon
	clearLayers(["weather-alerts", "weather-alerts-border"]);

	if (config.opacity.polygon == 0) return;

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
}

function redrawPolygons() {
	if (current_features.length <= 0) updateWeatherAlerts();
	else drawPolygons(current_features);
}

function getSevereStorm(feature) {
	try {
		let weatherEvent = feature.properties.event;
		let weatherParams = feature.properties.parameters || {};
		if (feature.properties.description == undefined)
			throw new Error("No description found.");
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
	} catch (e) {
		console.error(e);
		return {
			event: "Error",
			expires: "N/A",
			description: "An error occurred while parsing the storm data.",
			isDefault: false,
			parameters: {
				hail: { maxHail: "N/A", radarIndicated: "Radar Indicated" },
				wind: { windSpeed: "N/A", radarIndicated: "Radar Indicated" },
				tornado: { possible: "N/A", severity: "" },
				origionalFeature: feature,
			},
		};
	}
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
		popupContent += `This storm has weakened below severe limits.\nThis warning will expire soon.\n<br>`;
	}

	return popupContent;
}

function forceUpdate() {
	window.timeUntilNextUpdate = 1;
}
