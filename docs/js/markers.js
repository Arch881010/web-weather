async function addRadarMarkers() {
    let radarMarkersData = await (await fetch("./json/radars.json")).json();
    // Cache globally for coordinate lookups (e.g. placefile proxy)
    window.radarSitesData = radarMarkersData;
    for (feature of radarMarkersData["features"]) {
        let radarName = feature["name"];
        let coordinates = [feature["geometry"]["coordinates"][1], feature["geometry"]["coordinates"][0]];
        var radarIcon = L.divIcon({
            className: `radar`,
            html: radarName,
            iconSize: [40, 20],
            iconAnchor: [20, 20]
        });
        var marker = L.marker(coordinates, { icon: radarIcon }).addTo(map);
        marker.on("click", (e) => {
            setRadarSitePreference(radarName, true);
            updateRadarLayer();
        })
    }
}

// ── User-placeable markers ──
let userMarkerLayers = [];
const USER_MARKERS_KEY = "weatherAppUserMarkers";

// Available marker icon presets
const MARKER_ICONS = [
    { id: "pin",       fa: "fa-map-marker-alt", label: "Pin" },
    { id: "home",      fa: "fa-home",           label: "Home" },
    { id: "location",  fa: "fa-crosshairs",     label: "Current" },
    { id: "star",      fa: "fa-star",           label: "Star" },
    { id: "flag",      fa: "fa-flag",           label: "Flag" },
    { id: "bolt",      fa: "fa-bolt",           label: "Storm" },
    { id: "eye",       fa: "fa-eye",            label: "Watch" },
    { id: "circle",    fa: "fa-circle",         label: "Dot" },
];

const MARKER_COLORS = [
    "#ff4444", "#ff8800", "#ffcc00", "#44cc44",
    "#4488ff", "#aa44ff", "#ff44aa", "#ffffff",
];

function _getIconFA(iconId) {
    const entry = MARKER_ICONS.find((i) => i.id === iconId);
    return entry ? entry.fa : "fa-map-marker-alt";
}

function _loadUserMarkers() {
    try {
        const raw = localStorage.getItem(USER_MARKERS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.warn("Failed to load user markers:", e);
        return [];
    }
}

function _saveUserMarkers(markers) {
    localStorage.setItem(USER_MARKERS_KEY, JSON.stringify(markers));
}

// ── Inline UI dialog (replaces prompt/confirm) ──
function _createMarkerDialog() {
    let overlay = document.getElementById("marker-dialog-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "marker-dialog-overlay";
    overlay.innerHTML = `
        <div id="marker-dialog">
            <div id="marker-dialog-title">Place Marker</div>
            <label class="marker-dialog-label">Name</label>
            <input type="text" id="marker-dialog-name" maxlength="40" placeholder="My Marker" />
            <label class="marker-dialog-label">Icon</label>
            <div id="marker-dialog-icons"></div>
            <label class="marker-dialog-label">Color</label>
            <div id="marker-dialog-colors"></div>
            <div id="marker-dialog-buttons">
                <button id="marker-dialog-cancel">Cancel</button>
                <button id="marker-dialog-ok">OK</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    return overlay;
}

/**
 * Show the marker dialog for placing or editing a marker.
 * Returns a Promise that resolves with { name, icon, color } or null if cancelled.
 */
function showMarkerDialog(defaults = {}) {
    return new Promise((resolve) => {
        const overlay = _createMarkerDialog();
        const dialog = document.getElementById("marker-dialog");
        const titleEl = document.getElementById("marker-dialog-title");
        const nameInput = document.getElementById("marker-dialog-name");
        const iconsDiv = document.getElementById("marker-dialog-icons");
        const colorsDiv = document.getElementById("marker-dialog-colors");
        const okBtn = document.getElementById("marker-dialog-ok");
        const cancelBtn = document.getElementById("marker-dialog-cancel");

        titleEl.textContent = defaults.title || "Place Marker";
        nameInput.value = defaults.name || "";

        let selectedIcon = defaults.icon || "pin";
        let selectedColor = defaults.color || "#ff4444";

        // Build icon picker
        iconsDiv.innerHTML = "";
        MARKER_ICONS.forEach((ic) => {
            const btn = document.createElement("button");
            btn.className = "marker-icon-btn" + (ic.id === selectedIcon ? " selected" : "");
            btn.title = ic.label;
            btn.dataset.icon = ic.id;
            btn.innerHTML = `<i class="fas ${ic.fa}"></i>`;
            btn.addEventListener("click", () => {
                selectedIcon = ic.id;
                iconsDiv.querySelectorAll(".marker-icon-btn").forEach((b) => b.classList.remove("selected"));
                btn.classList.add("selected");
            });
            iconsDiv.appendChild(btn);
        });

        // Build color picker
        colorsDiv.innerHTML = "";
        MARKER_COLORS.forEach((c) => {
            const btn = document.createElement("button");
            btn.className = "marker-color-btn" + (c === selectedColor ? " selected" : "");
            btn.dataset.color = c;
            btn.style.background = c;
            btn.addEventListener("click", () => {
                selectedColor = c;
                colorsDiv.querySelectorAll(".marker-color-btn").forEach((b) => b.classList.remove("selected"));
                btn.classList.add("selected");
            });
            colorsDiv.appendChild(btn);
        });

        function cleanup() {
            overlay.style.display = "none";
            okBtn.removeEventListener("click", onOk);
            cancelBtn.removeEventListener("click", onCancel);
            overlay.removeEventListener("click", onOverlayClick);
            document.removeEventListener("keydown", onKey);
        }

        function onOk() {
            const name = nameInput.value.trim() || "Marker";
            cleanup();
            resolve({ name, icon: selectedIcon, color: selectedColor });
        }
        function onCancel() { cleanup(); resolve(null); }
        function onOverlayClick(e) { if (e.target === overlay) { cleanup(); resolve(null); } }
        function onKey(e) {
            if (e.key === "Escape") { cleanup(); resolve(null); }
            if (e.key === "Enter") onOk();
        }

        okBtn.addEventListener("click", onOk);
        cancelBtn.addEventListener("click", onCancel);
        overlay.addEventListener("click", onOverlayClick);
        document.addEventListener("keydown", onKey);

        overlay.style.display = "flex";
        nameInput.focus();
        nameInput.select();
    });
}

// ── Confirm dialog (replaces confirm()) ──
function showMarkerConfirm(message) {
    return new Promise((resolve) => {
        const overlay = _createMarkerDialog();
        const titleEl = document.getElementById("marker-dialog-title");
        const nameInput = document.getElementById("marker-dialog-name");
        const iconsDiv = document.getElementById("marker-dialog-icons");
        const colorsDiv = document.getElementById("marker-dialog-colors");
        const okBtn = document.getElementById("marker-dialog-ok");
        const cancelBtn = document.getElementById("marker-dialog-cancel");

        titleEl.textContent = message;
        nameInput.style.display = "none";
        iconsDiv.innerHTML = "";
        colorsDiv.innerHTML = "";
        // Hide labels
        overlay.querySelectorAll(".marker-dialog-label").forEach((l) => l.style.display = "none");

        function cleanup() {
            overlay.style.display = "none";
            nameInput.style.display = "";
            overlay.querySelectorAll(".marker-dialog-label").forEach((l) => l.style.display = "");
            okBtn.removeEventListener("click", onOk);
            cancelBtn.removeEventListener("click", onCancel);
            overlay.removeEventListener("click", onOverlayClick);
            document.removeEventListener("keydown", onKey);
        }
        function onOk() { cleanup(); resolve(true); }
        function onCancel() { cleanup(); resolve(false); }
        function onOverlayClick(e) { if (e.target === overlay) { cleanup(); resolve(false); } }
        function onKey(e) {
            if (e.key === "Escape") { cleanup(); resolve(false); }
            if (e.key === "Enter") { cleanup(); resolve(true); }
        }

        okBtn.addEventListener("click", onOk);
        cancelBtn.addEventListener("click", onCancel);
        overlay.addEventListener("click", onOverlayClick);
        document.addEventListener("keydown", onKey);

        overlay.style.display = "flex";
    });
}

// ── Marker popup with edit/delete buttons ──
function _userMarkerPopup(marker, idx) {
    const fa = _getIconFA(marker.icon);
    return `
        <div style="text-align:center">
            <i class="fas ${fa}" style="color:${marker.color || '#ff4444'};font-size:14px;margin-bottom:4px;"></i><br>
            <strong>${marker.name}</strong><br>
            <small>${marker.lat.toFixed(5)}, ${marker.lng.toFixed(5)}</small><br>
            <button class="user-marker-rename" data-idx="${idx}"
                style="margin-top:6px;padding:2px 8px;cursor:pointer;border-radius:3px;border:1px solid #888;background:#333;color:#fff;">
                Edit
            </button>
            <button class="user-marker-delete" data-idx="${idx}"
                style="margin-top:6px;padding:2px 8px;cursor:pointer;border-radius:3px;border:1px solid #c33;background:#c33;color:#fff;">
                Delete
            </button>
        </div>`;
}

function drawUserMarkers() {
    userMarkerLayers.forEach((m) => { try { map.removeLayer(m); } catch (_) {} });
    userMarkerLayers = [];

    const markers = _loadUserMarkers();
    markers.forEach((m, idx) => {
        const fa = _getIconFA(m.icon);
        const icon = L.divIcon({
            className: "user-marker",
            html: `<i class="fas ${fa}" style="color:${m.color || '#ff4444'};font-size:14px;"></i>`,
            iconSize: [14, 20],
            iconAnchor: [7, 10],
        });
        const layer = L.marker([m.lat, m.lng], { icon })
            .addTo(map)
            .bindPopup(_userMarkerPopup(m, idx));
        userMarkerLayers.push(layer);
    });
}

function addUserMarker(lat, lng, name, icon, color) {
    const markers = _loadUserMarkers();
    markers.push({ lat, lng, name: name || "Marker", icon: icon || "pin", color: color || "#ff4444" });
    _saveUserMarkers(markers);
    drawUserMarkers();
}

function deleteUserMarker(idx) {
    const markers = _loadUserMarkers();
    markers.splice(idx, 1);
    _saveUserMarkers(markers);
    drawUserMarkers();
}

function updateUserMarker(idx, data) {
    const markers = _loadUserMarkers();
    if (markers[idx]) Object.assign(markers[idx], data);
    _saveUserMarkers(markers);
    drawUserMarkers();
}

// Popup button delegation (uses custom dialogs)
document.addEventListener("click", async (e) => {
    const delBtn = e.target.closest(".user-marker-delete");
    if (delBtn) {
        const idx = parseInt(delBtn.dataset.idx, 10);
        const confirmed = await showMarkerConfirm("Delete this marker?");
        if (confirmed) {
            map.closePopup();
            deleteUserMarker(idx);
        }
        return;
    }
    const renBtn = e.target.closest(".user-marker-rename");
    if (renBtn) {
        const idx = parseInt(renBtn.dataset.idx, 10);
        const markers = _loadUserMarkers();
        const m = markers[idx] || {};
        map.closePopup();
        const result = await showMarkerDialog({
            title: "Edit Marker",
            name: m.name || "Marker",
            icon: m.icon || "pin",
            color: m.color || "#ff4444",
        });
        if (result) {
            updateUserMarker(idx, { name: result.name, icon: result.icon, color: result.color });
        }
        return;
    }
});

async function addUserMarkers() {
    drawUserMarkers();
}

async function addAllMarkers() {
    addRadarMarkers();
    addUserMarkers();
}

function getAllUserMarkerPoints() {
    // Example data [{"lat":37.19533058280065,"lng":-92.28515625000001,"name":"My Marker","icon":"bolt","color":"#aa44ff"}]
    const data = _loadUserMarkers();
    let objData = {};

    for (arr of data) {
        objData[arr["name"]] = {"lat":arr["lat"], "lng": arr["lng"]};
    }

    return objData
}