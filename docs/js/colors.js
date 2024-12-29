/** @format */

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
