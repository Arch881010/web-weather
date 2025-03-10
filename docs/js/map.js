/** @format */

// Initialize the map

const log_features = ['Tornado Watch', 'Severe Thunderstorm Watch'];

// Our current features so we can cache them locally so we don't have to fetch them every time.
let current_features, counties, countyBordersLayer;
// Some dev shenangians
if (config.dev) {
  console.info('Development mode is enabled.');
  console.info(
    'Logging these features (warnings):',
    (log_features || ['None']).toString()
  );
}

// Creates a new map
const map = L.map('map').setView([39.8283, -98.5795], 5); // Centered on the US

// Add state borders to the map
map.on('zoomend', addCountyBorders);
window.countyBordersShown = false;

async function fetchCountyBorders() {
  counties = await (await fetch('./json/counties.json')).json();
}

function addCountyBorders() {
  // If the zoom is < 9, that means we are zoomed out and can hide the county borders
  if (map.getZoom() < 9) {
    if (countyBordersLayer) {
      map.removeLayer(countyBordersLayer);
      countyBordersLayer = null;
      console.info('Hiding county borders.');
    }
    window.countyBordersShown = false;
  } else {
    if (!countyBordersLayer) {
      countyBordersLayer = L.geoJSON(counties, {
        style: {
          color: getColor('county'), // Light gray for border color
          weight: 3 * (map.getZoom() / 9), // Border width
          opacity: config.opacity.countyBorders, // low opacity
          fillOpacity: 0, // Make the polygon fill transparent
        },
        id: 'county-borders',
        interactive: false,
      })
        .addTo(map)
        .bringToFront();
      console.info('Showing county borders.');
    }
    window.countyBordersShown = true;
  }
}

// Add a dark-themed tile layer to the map (using CartoDB Dark Matter tiles)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution:
    '&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Function to format the expiration time
function formatExpirationTime(expirationTime) {
  const expirationDate = new Date(expirationTime);
  const now = new Date();
  const timeDiff = expirationDate - now;

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

  let formattedTime = '';
  if (days > 0) {
    formattedTime += `${days}d `;
  }
  if (hours > 0 || days > 0) {
    formattedTime += `${hours}h `;
  }
  formattedTime += `${minutes}m ${seconds}s`;

  return formattedTime.trim();
}

// Function to get the popup text based on the feature
function getPopupText(feature) {
  let weatherEvent = feature.properties.event;

  if (log_features.matchesAny(weatherEvent) && config.dev) {
    console.info(feature);
  }

  const popupContent = `
        ${asText(getSevereStorm(feature))}
		<div id="btn-div" style="align-items: center; display: flex; justify-content: center; padding: 0px;">
        <button id="show-alert-text" style="margin-top: 10px; border-radius: 5px; background-color: #007bff; color: white; border: none; cursor: pointer;">
            Show Alert Text
        </button>
		</div>
    `;

  return popupContent;
}

function timePassedAsSeconds(time) {
  const now = new Date();
  const timeDiff = now - time;
  const seconds = Math.floor(timeDiff / 1000);
  return seconds;
}

// Function to fetch and update weather alerts
function updateWeatherAlerts(firstTime) {
  if (userSettings.opacity.polygon == 0) {
    if (firstTime || false) {
      let alreadyTriggered = window.alreadyTriggered || false;
      if (!alreadyTriggered) {
        document.dispatchEvent(mapLoadedEvent);
      } else {
        console.warn('mapLoadedEvent already triggered, skipping.');
      }

      window.alreadyTriggered = true;
    }
    console.error(
      'Polygon opacity is set to 0, no need to load new weather alerts, skipping.'
    );
    clearLayers(['weather-alerts', 'weather-alerts-border']);
    current_features = [];
    return;
  }

  fetch(
    'https://api.weather.gov/alerts/active?status=actual&urgency=Immediate,Expected,Future,Past,Unknown&limit=250',
    {
      headers: {
        'User-Agent': 'WIP Web Weather App (admin@arch1010.dev)',
      },
    }
  )
    .then((response) => response.json())
    .then(async (data) => {
      // Remove features with null geometry
      data.features = data.features.filter(
        (feature) => feature.geometry !== null
      );

      // Exclude Flood Warnings
      data.features = data.features.filter(
        (feature) => feature.properties.event.toLowerCase() !== 'flood warning'
      );

      // Exclude Flood Advisories
      data.features = data.features.filter(
        (feature) => feature.properties.event.toLowerCase() !== 'flood advisory'
      );

      console.log(config.show.watches);
      if (config.show.watches) {
        const watches = await getWatches();
        console.warn("Watches " + watches.toString());
        for (const watch of watches) {
          data.features.push(watch);
        }
      }

      // Sort alerts and watches
      data.features.sort((a, b) => {
        const order = ['Watch', 'Advisory', 'Statement', 'Warning'];
        const aIndex = order.findIndex((type) =>
          a.properties.event.includes(type)
        );
        const bIndex = order.findIndex((type) =>
          b.properties.event.includes(type)
        );

        // If event types are different, sort by event type
        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }

        // If event types are the same, sort by time issued
        const aTime = new Date(a.properties.sent).getTime();
        const bTime = new Date(b.properties.sent).getTime();
        return aTime - bTime;
      });

      drawAlerts(data);
      current_features = data;
      if (firstTime || false) {
        let alreadyTriggered = window.alreadyTriggered || false;
        if (!alreadyTriggered) {
          document.dispatchEvent(mapLoadedEvent);
        } else {
          console.warn('mapLoadedEvent already triggered, skipping.');
        }

        window.alreadyTriggered = true;
      }
    });
}

// Function to clear existing layers
function clearLayers(layerIds) {
  map.eachLayer((layer) => {
    if (layer.options && layerIds.includes(layer.options.id)) {
      map.removeLayer(layer);
    }
  });
}

// Function to fetch and update radar layer
function updateRadarLayer() {
  // Clear existing radar layers
  clearLayers(['radar-layer']);

  if (userSettings.opacity.radar == 0) {
    console.error(
      'Radar layer opacity is set to 0, no need to load new radar data, skipping.'
    );
    return;
  }

  // Add the radar layer
  radarTileMap = userSettings.radar_tilemap;
  if (radarTileMap == undefined) radarTileMap = 'n0q';
  L.tileLayer
    .wms(
      `https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/${radarTileMap}.cgi`,
      {
        layers: `nexrad-${radarTileMap}-900913`,
        //layers: radarTileMap,
        format: 'image/png',
        transparent: true,
        attribution: 'Weather data © 2024 IEM Nexrad',
        id: 'radar-layer',
        opacity: config.opacity.radar, // Set the opacity of the radar layer
      }
    )
    .addTo(map);
}

// Function to update the countdown timer
function updateCountdown(force) {
  force = force || false;
  if (window.countdownIsRunning && !force) {
    return console.warn('The countdown is already active, skipping.');
  }
  const countdownElement = document.getElementById('countdown');
  let timeLeft = 60;
  window.timeUntilNextUpdate = timeLeft;
  window.countdownIsRunning = true;
  window.lastUpdate = new Date();

  setInterval(() => {
    timeLeft = window.timeUntilNextUpdate;
    timeLeft -= 1;
    countdownElement.innerText = `Next update in: ${timeLeft}s`;

    if (timeLeft <= 0) {
      timeLeft = 60;
      window.timeUntilNextUpdate = timeLeft;
      updateWeatherAlerts();
      updateRadarLayer();
    }
    window.timeUntilNextUpdate = timeLeft;
  }, 1000);
}

function drawAlerts(data) {
  // Add the black border around each polygon
  clearLayers(['weather-alerts', 'weather-alerts-border']);

  if (config.opacity.polygon == 0) return;

  L.geoJSON(data, {
    style: function (feature) {
      return {
        color: 'black', // Outer border color
        weight: 5, // Outer border width
        opacity: config.opacity.polygon, // Outer border opacity
        fillOpacity: 0, // Make the polygon fill transparent
      };
    },
    id: 'weather-alerts-border',
  }).addTo(map);

  // Add the GeoJSON layer to the map with color coding
  L.geoJSON(data, {
    style: function (feature) {
      return {
        color: getColor(feature.properties.event), // Border color
        weight: 3, // Border width
        opacity: config.opacity.polygon, // Outer border opacity
        fillOpacity: config.opacity.polygon_fill, // Polygon fill opacity
      };
    },
    onEachFeature: function (feature, layer) {
      if (feature.properties) {
        layer.bindPopup(getPopupText(feature));
      }

      layer.on('popupopen', function () {
        console.log('Popup opened for feature:', feature);
        window.cachedAlertText = getAlertText(feature);
      });
    },
    id: 'weather-alerts',
  })
    .addTo(map)
    .bringToFront();
}

function redrawAlerts() {
  if (current_features.length <= 0) updateWeatherAlerts();
  else drawAlerts(current_features);
}

// Copilot wrote this constant and the function for .onAdd
// Add countdown timer to the map
const countdownDiv = L.control({ position: 'bottomright' });
countdownDiv.onAdd = function () {
  const div = L.DomUtil.create('div', 'countdown');
  div.id = 'countdown';
  div.innerText = 'Next update in: 60s';
  div.style.padding = '5px';
  div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  div.style.color = 'white';
  div.style.fontSize = '14px';
  div.style.borderRadius = '5px';
  div.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
  return div;
};
countdownDiv.addTo(map);

function getSevereStorm(feature) {
  try {
    let weatherEvent = feature.properties.event;
    let weatherParams = feature.properties.parameters || {};
    if (feature.properties.description == undefined)
      throw new Error('No description found.');
    let hailSize = weatherParams.maxHailSize || ['N/A'];
    let windSpeed = weatherParams.maxWindGust || ['N/A'];
    let tornadoPossible = weatherParams.tornadoDetection || ['N/A'];
    let hailSource = weatherParams.hailThreat || ['Radar Indicated'];
    let windSource = weatherParams.windThreat || ['Radar Indicated'];
    let torSeverity = weatherParams.tornadoDamageThreat || [''];

    let params = {
      event: weatherEvent,
      expires: feature.properties.expires,
      isDefault: false,
      description: feature.properties.description,
      parameters: {
        hail: {
          maxHail: hailSize[0],
          radarIndicated: hailSource[0].toTitleCase(),
        },
        wind: {
          windSpeed: windSpeed[0],
          radarIndicated: windSource[0].toTitleCase(),
        },
        tornado: {
          possible: tornadoPossible[0].toTitleCase(),
          severity: torSeverity[0].toTitleCase(),
        },
        origionalFeature: feature,
      },
    };

    // In case no hail or is 0.00"
    if (params.parameters.hail.maxHail == '0.00') {
      params.parameters.hail.maxHail = 'N/A';
    }

    // In case no wind or is 0mph
    if (params.parameters.wind.windSpeed == '0mph') {
      params.parameters.wind.windSpeed = 'N/A';
    }

    // In case hail has bugged with SWS
    if (
      !params.parameters.hail.maxHail.includes('"') &&
      params.parameters.hail.maxHail != 'N/A'
    ) {
      params.parameters.hail.maxHail += '"';
    }

    return params;
  } catch (e) {
    console.error(e);
    return {
      event: 'Error',
      expires: 'N/A',
      description: 'An error occurred while parsing the storm data.',
      isDefault: false,
      parameters: {
        hail: { maxHail: 'N/A', radarIndicated: 'Radar Indicated' },
        wind: { windSpeed: 'N/A', radarIndicated: 'Radar Indicated' },
        tornado: { possible: 'N/A', severity: '' },
        origionalFeature: feature,
      },
    };
  }
}

function getDefaults(feature) {
  let params = {
    event: feature.properties.event,
    expires: feature.properties.expires,
    description: feature.properties.description,
    isDefault: true,
    origionalFeature: feature,
  };
  return params;
}

function asText(json) {
  let weatherEvent = json.event;
  let expireTime = json.expires;
  let popupContent = `
    <strong>${weatherEvent}</strong><br>
    Expires: ${formatExpirationTime(expireTime)}<br>
`;

  const hail = json.parameters.hail.maxHail || 'N/A';
  const wind = json.parameters.wind.windSpeed || 'N/A';
  let hailSource = json.parameters.wind.radarIndicated || 'Radar Indicated';
  let windSource = json.parameters.hail.radarIndicated || 'Radar Indicated';
  const tornado = json.parameters.tornado.possible || 'N/A';
  const torSeverity = json.parameters.tornado.severity || '';

  if (weatherEvent.includes('Special Weather Statement')) {
    windSource = hailSource = 'Radar Indicated';
  }

  if (!json.description.includes('weakened below severe')) {
    if (hail.toUpperCase() != 'N/A') {
      popupContent += `Hail: ${hail}, ${hailSource}<br>`;
    }
    if (wind.toUpperCase() != 'N/A') {
      popupContent += `Wind: ${wind}, ${windSource}<br>`;
    }
    if (tornado.toUpperCase() != 'N/A') {
      popupContent += `Tornado: ${tornado}<br>`;
      if (torSeverity != '') {
        popupContent += `Threat: ${torSeverity}<br>`;
      }
    }
  } else {
    popupContent += `This storm has weakened below severe limits.\nThis warning will expire soon.\n<br>`;
  }

  return popupContent;
}

function forceUpdate() {
  window.timeUntilNextUpdate = 1;
}
