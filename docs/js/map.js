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
function ensurePane(name, zIndex, pointerEvents) {
	let pane = map.getPane(name);
	if (!pane) {
		pane = map.createPane(name);
	}
	if (zIndex !== undefined) {
		pane.style.zIndex = zIndex;
	}
	if (pointerEvents) {
		pane.style.pointerEvents = pointerEvents;
	}
	return pane;
}

ensurePane('radarPane', 350, 'none');
ensurePane('labelsPane', 500);
ensurePane('placefilesPane', 750);
ensurePane('alertsPane', 900);
ensurePane('mdPane', 860);
ensurePane('placefileMarkerPane', 940);
ensurePane('radarIconsPane', 1060);
ensurePane('userMarkersPane', 1100);
ensurePane('alertsPopupPane', 1200);

map.on('zoomend', addCountyBorders);

const key = "cb1_2n4c_1_0cf2c99937b681df75182f67";

const baseLayer = L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png?key=${key}`, {
	attribution:
		'&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	updateWhenIdle: true,
}).addTo(map);

const labelsLayer = L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png?key=${key}`, {
	attribution: '',
	pane: 'labelsPane',
	updateWhenIdle: true,
}).addTo(map);

document.dispatchEvent(mapLoadedEvent);
