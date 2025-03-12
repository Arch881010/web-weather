/** @format */

// Creates a new map
const map = L.map("map").setView([39.8283, -98.5795], 5); // Centered on the US

// Add a dark-themed tile layer to the map (using CartoDB Dark Matter tiles)
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
	attribution:
		'&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

document.dispatchEvent(mapLoadedEvent);
