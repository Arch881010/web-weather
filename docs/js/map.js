
// Creates a new map
const map = L.map("map", {
	preferCanvas: true,
	inertia: true,
	zoomAnimation: true,
	fadeAnimation: false,
	markerZoomAnimation: true,
	minZoom: 6,
}).setView([39.8283, -98.5795], 6); // Centered on the US

// Create custom panes after map is initialized
if (!map.getPane('alertsPane')) {
	map.createPane('alertsPane');
	map.getPane('alertsPane').style.zIndex = 800;
}
if (!map.getPane('alertsPopupPane')) {
	map.createPane('alertsPopupPane');
	map.getPane('alertsPopupPane').style.zIndex = 1000;
}
if (!map.getPane('radarIconsPane')) {
	map.createPane('radarIconsPane');
	map.getPane('radarIconsPane').style.zIndex = 900;
}

map.on('zoomend', addCountyBorders);

// Add a dark-themed tile layer to the map with brighter labels
const baseLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
	attribution:
		'&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	updateWhenIdle: true,
}).addTo(map);

// Add bright labels layer on top
const labelsLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
	attribution: '',
	pane: 'overlayPane',
	updateWhenIdle: true,
}).addTo(map);

document.dispatchEvent(mapLoadedEvent);
