/** @format */

async function fetchKMZToGeoJSON(kmzUrl) {
	try {
		const response = await fetch(kmzUrl);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const buffer = await response.arrayBuffer();
		const zip = await JSZip.loadAsync(buffer);
		const kmlFile = Object.keys(zip.files).find((filename) =>
			filename.endsWith(".kml")
		);
		if (!kmlFile) {
			throw new Error("No KML file found in the KMZ archive");
		}
		const kmlText = await zip.files[kmlFile].async("string");

		const parser = new DOMParser();
		const kml = parser.parseFromString(kmlText, "application/xml");

		const geojson = toGeoJSON.kml(kml);
		return geojson.features;
	} catch (error) {
		console.error("Error fetching or processing KMZ file:", error);
		return [];
	}
}

async function getWatches() {
    let kmzUrl = "https://www.spc.noaa.gov/products/watch/ActiveWW.kmz";
    if (config.dev) kmzUrl = "./test-data/ww/2025/WW0008_SAW.kmz";

	try {
		const geojsonArray = await fetchKMZToGeoJSON(kmzUrl);
		const result = await Promise.all(
			geojsonArray.map(async (feature) => {
				const properties = {
					id: feature.id,
					type: "wx:Alert",
					event: feature.properties.name,
					description: feature.properties.description,
					// Add other properties from the KML file as needed
				};

				// Extract additional information from the KML file
				const extendedData = feature.properties.ExtendedData || {};
				for (const [key, value] of Object.entries(extendedData)) {
					properties[key] = value;
				}

				// Fetch the full description
				const idMatch = properties.event.match(/WW (\d+)/);
				if (idMatch) {
					const id = idMatch[1];
					properties.full_desc = await fetchWatchDescription(id);
				} else {
					properties.full_desc = "No description available";
				}

				properties.description = properties.full_desc;

				const currentEvent = properties.event.toTitleCase();
				const watchNumber = currentEvent.match(/\d+/);
				const watchType = currentEvent.match(/(Tornado|Severe Thunderstorm)/);

				// Extract end time from the event string
				const currentEventTime = currentEvent.split(" ");
				const endTimeString = currentEventTime.pop();
				currentEventTime.pop();
				const startTimeString = currentEventTime.pop();
				const startDay = startTimeString.slice(0, 2);
				const startTimeStr = startTimeString.slice(2);
				const endDay = endTimeString.slice(0, 2);
				const endTimeStr = endTimeString.slice(2);
				const dat = new Date();
				const startTime = new Date(
					`${dat.getFullYear()}-${String(dat.getMonth() + 1).padStart(
						2,
						"0"
					)}-${startDay}T${startTimeStr.slice(0, 2)}:${startTimeStr.slice(
						2,
						4
					)}:00Z`
				).toISOString();
				const endTime = new Date(
					`${dat.getFullYear()}-${String(dat.getMonth() + 1).padStart(
						2,
						"0"
					)}-${endDay}T${endTimeStr.slice(0, 2)}:${endTimeStr.slice(2, 4)}:00Z`
				).toISOString();

				return {
					id: feature.id,
					type: "Feature",
					geometry: feature.geometry,
					properties: {
						event: `${watchType[0]} Watch #${watchNumber}`,
						senderName: "Storm Prediction Center",
						sent: startTime,
						expires: endTime,
						headline: "",
						isDefault: false,
						description: properties.description,
						parameters: {
							hail: {
								maxHail: properties.maxHailSize || "N/A",
								radarIndicated: (
									properties.hailThreat || "Radar Indicated"
								).toTitleCase(),
							},
							wind: {
								windSpeed: properties.maxWindGust || "N/A",
								radarIndicated: (
									properties.windThreat || "Radar Indicated"
								).toTitleCase(),
							},
							tornado: {
								possible: (properties.tornadoDetection || "N/A").toTitleCase(),
								severity: (properties.tornadoDamageThreat || "").toTitleCase(),
							},
							origionalFeature: feature,
						},
					},
				};
			})
		);
		return result;
	} catch (error) {
		console.error("Error fetching or processing KMZ file:", error);
		return [];
	}
}

async function fetchWatchDescription(id) {
	try {
		const watchURL = `https://www.spc.noaa.gov/products/watch/${new Date().getFullYear()}/ww${id.padStart(
			4,
			"0"
		)}.html`;
		const response = await fetch(watchURL);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const text = await response.text();
		const doc = new DOMParser().parseFromString(text, "text/html");
		const fullDesc = doc.querySelectorAll("pre")[0].innerHTML;
		return fullDesc;
	} catch (error) {
		console.error("Error fetching watch description:", error);
		return "No description available";
	}
}
