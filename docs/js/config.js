/** @format */

const default_config = {
	opacity: {
		radar: 0.5,
		polygon_fill: 0,
		polygon: 1,
		countyBorders: 0.1,
	},
	debug: {
		list: [],
		ww_url: "./dev/activeWW.kmz",
	},
	urls: {
		ww: "https://www.spc.noaa.gov/products/watch/ActiveWW.kmz",
		warnings: "https://api.weather.gov/alerts/active?status=actual&urgency=Immediate,Expected,Future,Past,Unknown&limit=400",
	}
};

const config = default_config;
