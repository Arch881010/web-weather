async function addRadarMarkers() {
    let radarMarkersData = await (await fetch("./json/radars.json")).json();
    /*
    Example Feature:
    geometry: {type: 'Point', coordinates: Array(2)}
    id: "https://api.weather.gov/radar/stations/KMRX"
    name: "KMRX"
    type: "Feature"
    */
    for (feature of radarMarkersData["features"]) {
        let radarName = feature["name"];
        let coordinates = [feature["geometry"]["coordinates"][1], feature["geometry"]["coordinates"][0]];
        var radarIcon = L.divIcon({
            className: `radar`,
            html: radarName,
            iconSize: [40, 20],
            iconAnchor: [20, 10]
        });
        console.log(coordinates);
        var marker = L.marker(coordinates, { icon: radarIcon }).addTo(map);
        marker.on("click", (e) => {
            setRadarSitePreference(radarName, true);
            updateRadarLayer();
        })
    }
}

async function addUserMarkers() {

}

async function addAllMarkers() {
    addRadarMarkers();
    addUserMarkers();
}