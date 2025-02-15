async function fetchKMZToGeoJSON(kmzUrl) {
    try {
        console.log(`Fetching KMZ from URL: ${kmzUrl}`);
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
        console.log("KML Text:", kmlText);

        const parser = new DOMParser();
        const kml = parser.parseFromString(kmlText, "application/xml");
        console.log("Parsed KML:", kml);

        const networkLinks = kml.getElementsByTagName("NetworkLink");
        const geojsonFeatures = [];

        for (const link of networkLinks) {
            const href = link.getElementsByTagName("href")[0].textContent;
            console.log(`Fetching linked KMZ from URL: ${href}`);
            const linkedGeojson = await fetchKMZToGeoJSON(href);
            geojsonFeatures.push(...linkedGeojson);
        }

        const geojson = toGeoJSON.kml(kml);
        geojsonFeatures.push(...geojson.features);

        console.log(`Fetched ${geojsonFeatures.length} features from KMZ`);
        return geojsonFeatures;
    } catch (error) {
        console.error("Error fetching or processing KMZ file:", error);
        return [];
    }
}

const kmzUrl = "https://www.spc.noaa.gov/products/watch/ActiveWW.kmz";

async function getWatches() {
    try {
        const geojsonArray = await fetchKMZToGeoJSON(kmzUrl);
        const result = await Promise.all(geojsonArray.map(async (feature) => {
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
            const idMatch = properties.event.match(/Watch (\d+)/);
            if (idMatch) {
                const id = idMatch[1];
                properties.full_desc = await fetchWatchDescription(id);
            } else {
                properties.full_desc = "No description available";
            }

            if (properties.description === undefined) properties.description = "";
            properties.headline = "UTC";

            console.log("Feature properties:", properties);

            const currentEvent = properties.event.toTitleCase();
            const watchNumber = currentEvent.match(/\d+/);
            const watchType = currentEvent.match(/(Tornado|Severe Thunderstorm)/);

            // Extract end time from the event string
            const endTimeString = currentEvent.split(' ').pop();
            const day = endTimeString.slice(0, 2);
            const time = endTimeString.slice(2);
            const endTime = new Date(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${day}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`).toISOString();

            return {
                id: feature.id,
                type: "Feature",
                geometry: feature.geometry,
                properties: {
                    event: `${watchType[0]} Watch #${watchNumber}`,
                    expires: endTime,
                    headline: properties.headline,
                    isDefault: false,
                    description: properties.description,
                    parameters: {
                        hail: {
                            maxHail: properties.maxHailSize || "N/A",
                            radarIndicated: (properties.hailThreat || "Radar Indicated").toTitleCase(),
                        },
                        wind: {
                            windSpeed: properties.maxWindGust || "N/A",
                            radarIndicated: (properties.windThreat || "Radar Indicated").toTitleCase(),
                        },
                        tornado: {
                            possible: (properties.tornadoDetection || "N/A").toTitleCase(),
                            severity: (properties.tornadoDamageThreat || "").toTitleCase(),
                        },
                        origionalFeature: feature,
                    },
                },
            };
        }));
        console.log(`Processed ${result.length} features`);
        return result;
    } catch (error) {
        console.error("Error fetching or processing KMZ file:", error);
        return [];
    }
}

async function fetchWatchDescription(id) {
    try {
        const response = await fetch(`https://www.spc.noaa.gov/products/watch/ww${id.padStart(4, '0')}.html`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const fullDesc = doc.querySelectorAll('pre')[0].innerHTML;
        return fullDesc;
    } catch (error) {
        console.error("Error fetching watch description:", error);
        return "No description available";
    }
}
