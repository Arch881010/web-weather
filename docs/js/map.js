// Creates a new map
const map = L.map("map").setView([39.8283, -98.5795], 5); // Centered on the US

map.on('zoomend', addCountyBorders);

// Add a dark-themed tile layer to the map with brighter labels
const baseLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
	attribution:
		'&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Add bright labels layer on top
const labelsLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
	attribution: '',
	pane: 'overlayPane'
}).addTo(map);

document.dispatchEvent(mapLoadedEvent);
