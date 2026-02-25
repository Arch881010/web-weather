/** @format */
document.addEventListener("DOMContentLoaded", () => {
	loadSettings();

	const settingsPanel = document.getElementById("settings-panel");

	const openSettingsPanel = (focusId = null) => {
		if (!settingsPanel) return;
		settingsPanel.style.display = "flex";
		document.body.classList.add("settings-open");
		if (!focusId) return;

		requestAnimationFrame(() => {
			const target = document.getElementById(focusId);
			if (!target) return;
			if (typeof target.scrollIntoView === "function") {
				target.scrollIntoView({ block: "center", behavior: "smooth" });
			}
			if (typeof target.focus === "function") {
				target.focus();
			}
		});
	};

	// Load settings on page load
	loadSettings();

	// Open settings panel
	document.getElementById("open-settings").addEventListener("click", () => {
		openSettingsPanel();
	});

	// Close settings panel and save settings
	document.getElementById("close-settings").addEventListener("click", () => {
		console.info("Settings saved");
		saveSettings();
		window.timeUntilNextUpdate = 60;
		const countdownElement =
			document.getElementById("radar-runtime-timer") ||
			document.getElementById("countdown");
		if (countdownElement) {
			countdownElement.innerText = "Next update in: 60s";
		}
		settingsPanel.style.display = "none";
		document.body.classList.remove("settings-open");
	});

	const radarSiteInput = document.getElementById("radar-site");
	if (radarSiteInput) {
		radarSiteInput.addEventListener("input", () => {
			radarSiteInput.value = radarSiteInput.value.toUpperCase();
		});
	}

	const quickMode = document.getElementById("quick-radar-mode");
	if (quickMode) {
		quickMode.addEventListener("click", () => {
			openSettingsPanel("radar-mode");
		});
	}

	const quickProduct = document.getElementById("quick-radar-product");
	if (quickProduct) {
		quickProduct.addEventListener("click", () => {
			openSettingsPanel("radar-site-product");
		});
	}

	const quickCmap = document.getElementById("quick-radar-cmap");
	if (quickCmap) {
		quickCmap.addEventListener("click", () => {
			openSettingsPanel("radar-cmap");
		});
	}

	// ── Colormap: update dropdown when product changes ──
	const productSelect = document.getElementById("radar-site-product");
	if (productSelect) {
		productSelect.addEventListener("change", () => {
			if (typeof updateColormapDropdown === "function") {
				updateColormapDropdown(productSelect.value);
			}
		});
	}

	// ── Colormap: upload custom colormap ──
	const uploadCmapBtn = document.getElementById("upload-cmap-btn");
	const cmapFileInput = document.getElementById("cmap-file-input");
	if (uploadCmapBtn && cmapFileInput) {
		uploadCmapBtn.addEventListener("click", () => {
			cmapFileInput.click();
		});
		cmapFileInput.addEventListener("change", async (e) => {
			const file = e.target.files[0];
			if (!file) return;
			try {
				const product = document.getElementById("radar-site-product")?.value || "reflectivity";
				const name = await importColormapFromFile(product, file);
				updateColormapDropdown(product);
				// Select the newly uploaded one
				const cmapSelect = document.getElementById("radar-cmap");
				if (cmapSelect) cmapSelect.value = name;
				setColormapForProduct(product, name);
				alert(`Colormap "${name}" uploaded successfully for ${radarProductLabel(product)}!`);
			} catch (error) {
				alert(`Failed to upload colormap: ${error.message}`);
			}
			cmapFileInput.value = "";
		});
	}

	// ── Colormap: export selected custom colormap ──
	const exportCmapBtn = document.getElementById("export-cmap-btn");
	if (exportCmapBtn) {
		exportCmapBtn.addEventListener("click", () => {
			const cmapSelect = document.getElementById("radar-cmap");
			const product = document.getElementById("radar-site-product")?.value || "reflectivity";
			const colormapName = cmapSelect?.value;
			if (!colormapName) return;
			try {
				exportColormap(product, colormapName);
			} catch (error) {
				alert(error.message || "Cannot export this colormap.");
			}
		});
	}

	// ── Colormap: delete custom colormap ──
	const deleteCmapBtn = document.getElementById("delete-cmap-btn");
	if (deleteCmapBtn) {
		deleteCmapBtn.addEventListener("click", () => {
			const cmapSelect = document.getElementById("radar-cmap");
			const product = document.getElementById("radar-site-product")?.value || "reflectivity";
			const colormapName = cmapSelect?.value;
			if (!colormapName) return;
			if (!isCustomColormap(product, colormapName)) {
				alert("Only custom colormaps can be deleted.");
				return;
			}
			if (!confirm(`Delete custom colormap "${colormapName}"?`)) return;
			deleteCustomColormap(product, colormapName);
			updateColormapDropdown(product);
			// Re-apply default after deletion
			const newCmap = document.getElementById("radar-cmap")?.value;
			if (newCmap) setColormapForProduct(product, newCmap);
			alert(`Colormap "${colormapName}" deleted.`);
		});
	}

	// ── Initialize colormap dropdown on load ──
	if (typeof updateColormapDropdown === "function") {
		const currentProduct = document.getElementById("radar-site-product")?.value || "reflectivity";
		updateColormapDropdown(currentProduct);
	}
});
