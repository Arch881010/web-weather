/** @format */

const default_config = {
	opacity: {
		radar: 0.75,
		polygon_fill: 0,
		polygon: 1,
		countyBorders: 0.01,
	},
	countyBordersZoomOnly: false,
	show: {
		watches: true,
		mds: true,
	},
	mdsUrl: "https://placefiles.arch1010.dev/mds.php?full=true",
	alertSound: false,
	radarTilemap: "n0q",
	placefiles: [],
	dev: {
		"status": false,
		"warnings_file": "2023/real-fake.json"
	},
	//api: "https://api.weather.gov/alerts/active",
	api: "https://data.arch1010.dev/alerts",
	radarApi: {
		base: "https://radar.arch1010.dev",
		imagePath: "/api/radar/image",
		product: "reflectivity",
		level: 2,
		cmap: "NWSRef",
		colormaps: {},
		pollIntervalMs: 60000,
		mode: "wms",
		site: "KLZK",
	},
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
	const savedSettingsRaw = localStorage.getItem("weatherAppSettings");
	let savedSettings = JSON.parse(savedSettingsRaw);
	if (!savedSettings || savedSettings == "") savedSettings = config;
	if (!savedSettings.radarApi) savedSettings.radarApi = {};
	if (!savedSettings.radarApi.colormaps) savedSettings.radarApi.colormaps = {};
	savedSettings.radarApi = {
		...default_config.radarApi,
		...savedSettings.radarApi,
	};
	if (savedSettingsRaw && (savedSettings.radarApi.site || "").trim()) {
		savedSettings.radarApi.site = savedSettings.radarApi.site.trim().toUpperCase();
		savedSettings.radarApi.mode = "site";
	}
	document.getElementById("opacity-radar").value =
		savedSettings.opacity.radar * 100;
	document.getElementById("opacity-polygon-fill").value =
		savedSettings.opacity.polygon_fill * 100;
	document.getElementById("opacity-polygon").value =
		savedSettings.opacity.polygon * 100;
	document.getElementById("opacity-county-borders").value =
		savedSettings.opacity.countyBorders * 100;

	const countyZoomToggle = document.getElementById("county-borders-zoom-toggle");
	if (countyZoomToggle) countyZoomToggle.checked = !!savedSettings.countyBordersZoomOnly;
	document.getElementById("radar-tilemap").value =
		savedSettings.radarTilemap;
	document.getElementById("radar-mode").value =
		savedSettings.radarApi.mode || "wms";
	document.getElementById("radar-site").value =
		(savedSettings.radarApi.site || "KLZK").toUpperCase();
	document.getElementById("radar-data-level").value =
		String(savedSettings.radarApi.level || 2);

	// Populate product dropdown based on current level, then select saved product
	if (typeof syncProductDropdownsToLevel === "function") {
		// Temporarily set config.radarApi so getRadarLevel() works
		config.radarApi = { ...default_config.radarApi, ...savedSettings.radarApi };
		syncProductDropdownsToLevel(savedSettings.radarApi.site);
	}
	const normalizedSavedProduct = typeof normalizeProductForSite === "function"
		? normalizeProductForSite(savedSettings.radarApi.product || "reflectivity", savedSettings.radarApi.site)
		: (savedSettings.radarApi.product || "reflectivity");
	document.getElementById("radar-site-product").value = normalizedSavedProduct;
	savedSettings.radarApi.product = normalizedSavedProduct;

	// Alert sound toggle
	const alertSoundPref = savedSettings.alertSound === true;
	const alertSoundToggle = document.getElementById("alert-sound-toggle");
	if (alertSoundToggle) alertSoundToggle.checked = alertSoundPref;

	// Radar hover tooltip toggle
	const hoverPref = savedSettings.radarHoverEnabled === true;
	const hoverToggle = document.getElementById("radar-hover-toggle");
	if (hoverToggle) hoverToggle.checked = hoverPref;
	if (typeof radarHoverEnabled !== "undefined") radarHoverEnabled = hoverPref;

	// Populate colormap dropdown based on current product
	if (typeof updateColormapDropdown === "function") {
		updateColormapDropdown(savedSettings.radarApi.product || "reflectivity");
	} else {
		document.getElementById("radar-cmap").value =
			savedSettings.radarApi.cmap || "NWSRef";
	}

	// Update config object
	config.opacity.radar = savedSettings.opacity.radar;
	config.opacity.polygon_fill = savedSettings.opacity.polygon_fill;
	config.opacity.polygon = savedSettings.opacity.polygon;
	config.opacity.countyBorders = savedSettings.opacity.countyBorders;
	config.countyBordersZoomOnly = !!savedSettings.countyBordersZoomOnly;
	config.radarTilemap = savedSettings.radarTilemap;
	config.radarApi = {
		...default_config.radarApi,
		...savedSettings.radarApi,
	};

	config.show.watches = true;
	config.alertSound = alertSoundPref;

	// Mesoscale Discussions toggle
	const mdsPref = savedSettings.show && savedSettings.show.mds !== undefined ? savedSettings.show.mds : true;
	const mdsToggle = document.getElementById("mds-toggle");
	if (mdsToggle) mdsToggle.checked = mdsPref;
	config.show.mds = mdsPref;

	// Placefiles
	config.placefiles = savedSettings.placefiles || [];

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
	const countyBordersZoomOnly =
		document.getElementById("county-borders-zoom-toggle").checked === true;
	const radarTilemap = document.getElementById("radar-tilemap").value;
	const radarMode = document.getElementById("radar-mode").value;
	const radarSite =
		document.getElementById("radar-site").value.trim().toUpperCase() ||
		config.radarApi.site ||
		"KLZK";
	const radarSiteProduct =
		document.getElementById("radar-site-product").value ||
		"reflectivity";
	const normalizedSiteProduct = typeof normalizeProductForSite === "function"
		? normalizeProductForSite(radarSiteProduct, radarSite)
		: radarSiteProduct;
	const radarDataLevel =
		parseInt(document.getElementById("radar-data-level").value, 10) || 2;
	const radarCmap = document.getElementById("radar-cmap").value || "NWSRef";

	// Update config object
	config.saveSettings = true;
	config.opacity.radar = opacityRadar;
	config.opacity.polygon_fill = opacityPolygonFill;
	config.opacity.polygon = opacityPolygon;
	config.opacity.countyBorders = opacityCountyBorders;
	config.countyBordersZoomOnly = countyBordersZoomOnly;
	config.radarTilemap = radarTilemap;
	config.radarApi.mode = radarMode;
	config.radarApi.site = radarSite;
	config.radarApi.product = normalizedSiteProduct;
	config.radarApi.level = radarDataLevel;
	config.radarApi.cmap = radarCmap;

	// Alert sound preference
	const alertSoundToggle = document.getElementById("alert-sound-toggle");
	config.alertSound = alertSoundToggle ? alertSoundToggle.checked : false;

	// Radar hover tooltip preference
	const hoverToggle = document.getElementById("radar-hover-toggle");
	config.radarHoverEnabled = hoverToggle ? hoverToggle.checked : false;

	// Save colormap per-product
	if (!config.radarApi.colormaps) config.radarApi.colormaps = {};
	const normalizedProduct = typeof normalizeRadarProduct === "function"
		? normalizeRadarProduct(normalizedSiteProduct)
		: normalizedSiteProduct;
	config.radarApi.colormaps[normalizedProduct] = radarCmap;

	document.getElementById("radar-site").value = radarSite;

	userSettings = config;

	localStorage.setItem("weatherAppSettings", JSON.stringify(config));

	redrawPolygons();
	updateRadarLayer();
	addCountyBorders();
};
