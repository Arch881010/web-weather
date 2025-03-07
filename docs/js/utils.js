/** @format */

function timePassedAsSeconds(time) {
	const now = new Date();
	const timeDiff = now - time;
	const seconds = Math.floor(timeDiff / 1000);
	return seconds;
}

/** @format */

function convertToText(text) {
	text = text.trim().toTitleCase(); // <- This is here because I'm probably gonna make a mistake somewhere
	if (
		text.includes("Avalanche") ||
		text.includes("Blizzard") ||
		text.includes("Snow") ||
		text.includes("Winter") ||
		text.includes("Winter")
	) {
		return "Cold";
	}

	if (text.includes("Tornado Watch")) {
		return "Tornado Watch";
	}

	if (text.includes("Severe Thunderstorm Watch")) {
		return "Severe Thunderstorm Watch";
	}

	if (text.includes("Flood Watch")) {
		return "Flood Watch";
	}

	if (text.includes("Watch")) {
		//return "Watch";
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

	if (text.includes("County")) {
		return "County";
	}

	if (text.includes("Dust")) {
		return "Dust";
	}

	if (text.includes("Snow")) {
		return "Snow";
	}

	console.warn(
		"Could not find alert type for",
		text + ", so we went with default."
	);
	return "Default";
}

// Define a function to get the color based on the type of the alert
function getColor(text) {
	return colorsArray[convertToText(text)];
}

const colorsArray = {
	"Severe Thunderstorm": "#ff9900",
	"Tornado": "#ff0000",
	"Flood": "#00ff00",
	"Weather Statement": "#add8e6",
	"Marine": "#E0B0FF",
	"Tornado Watch": "#990f02",
	"Severe Thunderstorm Watch": "#8B8000",
	"Flood Watch": "#006400",
	"Watch": "#ff00d8",
	"Cold": "#ffffff",
	"County": "#A9A9A9",
	"Dust": "#BDB76B",
	"Snow": "#ffffff",
	"Default": "#ffffff",
};
