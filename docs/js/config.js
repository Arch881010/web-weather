/** @format */

const default_config = {
	opacity: {
		radar: 0.5,
		polygon_fill: 0,
		polygon: 1,
		countyBorders: 0.1,
	},
	show: {
		watches: true,
	},
	radarTilemap: "n0q",
	dev: {
		"status": false,
		"warnings_file": "2023/real-fake.json"
	},
	//api: "https://api.weather.gov/alerts/active",
	api: "https://data.arch1010.dev/alerts",
	devPresets: {
		"0": {
			"status": false,
		},
		"1": {
		"status": true,
		"warnings_file": "2023/real-fake.json"
		},
		"2": {
		"status": true,
		"warnings_file": "dev/main.json"
		},
		"savedSettings": true,
	}
};



const config = default_config;

const loadSettings = () => {
	let savedSettings = JSON.parse(localStorage.getItem("weatherAppSettings"));
	if (!savedSettings || savedSettings == "") savedSettings = config;
	document.getElementById("opacity-radar").value =
		savedSettings.opacity.radar * 100;
	document.getElementById("opacity-polygon-fill").value =
		savedSettings.opacity.polygon_fill * 100;
	document.getElementById("opacity-polygon").value =
		savedSettings.opacity.polygon * 100;
	document.getElementById("opacity-county-borders").value =
		savedSettings.opacity.countyBorders * 100;
	document.getElementById("radar-tilemap").value =
		savedSettings.radarTilemap;

	// Update config object
	config.opacity.radar = savedSettings.opacity.radar;
	config.opacity.polygon_fill = savedSettings.opacity.polygon_fill;
	config.opacity.polygon = savedSettings.opacity.polygon;
	config.opacity.countyBorders = savedSettings.opacity.countyBorders;
	config.radar = savedSettings.radarTilemap;

	config.show.watches = true;
	return savedSettings;
};

let userSettings = loadSettings();

// Function to save settings to local storage and update config
const saveSettings = () => {
	//const saveSettingsCheckbox = document.getElementById("save-settings").checked;
	const opacityRadar = document.getElementById("opacity-radar").value / 100;
	const opacityPolygonFill =
		document.getElementById("opacity-polygon-fill").value / 100;
	const opacityPolygon = document.getElementById("opacity-polygon").value / 100;
	const opacityCountyBorders =
		document.getElementById("opacity-county-borders").value / 100;
	const radarTilemap = document.getElementById("radar-tilemap").value;

	// Update config object
	config.saveSettings = true;
	config.opacity.radar = opacityRadar;
	config.opacity.polygon_fill = opacityPolygonFill;
	config.opacity.polygon = opacityPolygon;
	config.opacity.countyBorders = opacityCountyBorders;
	config.radarTilemap = radarTilemap;

	userSettings = config;

	localStorage.setItem("weatherAppSettings", JSON.stringify(config));

	redrawPolygons();
	updateRadarLayer();
	addCountyBorders();
};
