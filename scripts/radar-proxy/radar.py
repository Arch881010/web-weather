#!/usr/bin/env python3
import argparse
import base64
import gzip
import importlib
import json
import threading
import re
import subprocess
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, List, Optional, Set
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


S3_BASE = "https://unidata-nexrad-level2.s3.amazonaws.com"
LEVEL3_S3_BASE = "https://unidata-nexrad-level3.s3.amazonaws.com"
NOMADS_LEVEL2_BASE = "https://nomads.ncep.noaa.gov/pub/data/nccf/radar/nexrad_level2"


@dataclass
class RadarCacheEntry:
    site: str
    key: str
    object_url: str
    local_path: str
    size_bytes: int
    updated_at_utc: str
    next_poll_utc: str


class RadarCacheManager:
    def __init__(
        self,
        cache_dir: Path,
        poll_interval_seconds: int = 90,
        timeout_seconds: int = 20,
        enable_srv_dealias: bool = False,
    ):
        self.cache_dir = cache_dir
        self.poll_interval_seconds = poll_interval_seconds
        self.timeout_seconds = timeout_seconds

        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.entries: Dict[str, RadarCacheEntry] = {}
        self.entries_meta_path = self.cache_dir / "index.json"
        self.tracked_sites: Set[str] = set()
        self.disabled_sites: Set[str] = set()
        self.refresh_failures: Dict[str, int] = {}
        self.lock = threading.RLock()
        self.stop_event = threading.Event()
        self.worker: Optional[threading.Thread] = None
        self.max_background_refresh_failures = 5
        self.auto_products = ["reflectivity", "srv"]
        self.enable_srv_dealias = bool(enable_srv_dealias)
        self._extract_inflight: Set[str] = set()
        # Only allow one extraction subprocess at a time to prevent OOM
        self._extract_semaphore = threading.Semaphore(1)
        # Level III file cache: { "SITE:MNEMONIC": { "path": Path, "key": str, "ts": datetime } }
        self._level3_cache: Dict[str, dict] = {}
        self._level3_cache_ttl = timedelta(minutes=5)

        self._load_index()

    def start(self) -> None:
        if self.worker and self.worker.is_alive():
            return
        self.worker = threading.Thread(
            target=self._background_loop, name="radar-cache-worker", daemon=True
        )
        self.worker.start()

    def stop(self) -> None:
        self.stop_event.set()
        if self.worker and self.worker.is_alive():
            self.worker.join(timeout=2)

    def register_site(self, site: str) -> str:
        normalized = self._normalize_site(site)
        with self.lock:
            self.disabled_sites.discard(normalized)
            self.refresh_failures[normalized] = 0
            self.tracked_sites.add(normalized)
        return normalized

    def list_status(self) -> dict:
        with self.lock:
            return {
                "trackedSites": sorted(self.tracked_sites),
                "disabledSites": sorted(self.disabled_sites),
                "refreshFailures": dict(self.refresh_failures),
                "autoProducts": list(self.auto_products),
                "pollIntervalSeconds": self.poll_interval_seconds,
                "entries": {k: asdict(v) for k, v in self.entries.items()},
            }

    def get_or_refresh(self, site: str, force: bool = False) -> RadarCacheEntry:
        site = self.register_site(site)
        with self.lock:
            existing = self.entries.get(site)
            now = self._utcnow()
            if existing and not force:
                next_poll = self._parse_iso(existing.next_poll_utc)
                if now < next_poll and Path(existing.local_path).exists():
                    return existing

        return self._refresh_site(site, force=force)

    def get_cached_path(self, site: str) -> Optional[Path]:
        site = self._normalize_site(site)
        with self.lock:
            entry = self.entries.get(site)
            if not entry:
                return None
            path = Path(entry.local_path)
            if not path.exists():
                return None
            return path

    # ── Sweep data extraction (client-side canvas rendering) ──

    def _sweep_cache_path(self, site: str, key_name: str, product: str) -> Path:
        safe_product = self._sanitize_name(product)
        return self.cache_dir / f"{site}_{key_name}_sweep_{safe_product}.json.gz"

    def get_or_extract_sweep(
        self, site: str, product_name: Optional[str] = None, force: bool = False
    ) -> Path:
        site = self._normalize_site(site)
        resolved_product = self._resolve_product_name(product_name)

        # Classification uses Level III (N0H) — separate flow avoids Level II download
        if resolved_product == "classification":
            return self._get_or_extract_classification(site, force=force)

        cache_entry = self.get_or_refresh(site, force=force)
        key_name = Path(cache_entry.key).name
        sweep_path = self._sweep_cache_path(site, key_name, resolved_product)

        if sweep_path.exists() and not force:
            return sweep_path

        self._extract_sweep_via_subprocess(
            Path(cache_entry.local_path),
            sweep_path,
            resolved_product,
            site,
            cache_entry.key,
        )

        return sweep_path

    def _get_or_extract_classification(self, site: str, force: bool = False) -> Path:
        """Handle classification via Level III N0H — avoids downloading Level II."""
        l3_path, l3_key = self._get_or_refresh_level3(site, "N0H", force=force)
        sweep_path = self._sweep_cache_path(site, l3_key, "classification")

        if sweep_path.exists() and not force:
            return sweep_path

        self._extract_sweep_via_subprocess(
            l3_path, sweep_path, "classification", site, l3_key
        )
        return sweep_path

    def _get_or_refresh_level3(
        self, site: str, mnemonic: str, force: bool = False
    ) -> tuple[Path, str]:
        """Download and cache a Level III file on disk.  Returns (local_path, key_name)."""
        cache_key = f"{site}:{mnemonic}"
        now = self._utcnow()

        with self.lock:
            cached = self._level3_cache.get(cache_key)
            if cached and not force:
                age = now - cached["ts"]
                if age < self._level3_cache_ttl and cached["path"].exists():
                    return cached["path"], cached["key"]

        data = _fetch_level3_file(site, mnemonic)
        if data is None:
            raise RuntimeError(
                f"Level III product {mnemonic} not available for {site}"
            )

        # Derive a short key name from the S3 key (for sweep cache filenames)
        station_3 = site[1:].upper() if len(site) == 4 else site.upper()
        key_name = f"{station_3}_{mnemonic}_{now.strftime('%Y%m%d_%H%M%S')}"

        local_path = self.cache_dir / f"{site}_L3_{mnemonic}_{key_name}"
        local_path.write_bytes(data)
        print(f"[radar] cached Level III {mnemonic} for {site}: {local_path.name} ({len(data)} bytes)")

        with self.lock:
            # Clean up old cached file
            old = self._level3_cache.get(cache_key)
            if old and old["path"].exists() and old["path"] != local_path:
                try:
                    old["path"].unlink()
                except OSError:
                    pass
            self._level3_cache[cache_key] = {
                "path": local_path,
                "key": key_name,
                "ts": now,
            }

        return local_path, key_name

    def _extract_sweep_via_subprocess(
        self,
        local_path: Path,
        output_path: Path,
        product_name: str,
        site: str,
        key: str = "",
    ) -> None:
        """Extract sweep data in a child process so all memory is reclaimed.
        Uses a semaphore to ensure only one extraction runs at a time (OOM prevention).
        Retries once on OOM-kill (exit -9)."""
        task = json.dumps(
            {
                "local_path": str(local_path),
                "output_path": str(output_path),
                "product_name": product_name,
                "site": site,
                "key": key,
                "enable_srv_dealias": self.enable_srv_dealias,
            }
        )
        max_attempts = 2
        for attempt in range(1, max_attempts + 1):
            acquired = self._extract_semaphore.acquire(timeout=300)
            if not acquired:
                raise RuntimeError(
                    f"Sweep extraction timed out waiting for semaphore ({site} {product_name})"
                )
            try:
                result = subprocess.run(
                    [sys.executable, str(Path(__file__).resolve()), "--render-task", task],
                    capture_output=True,
                    text=True,
                    timeout=180,
                )
            finally:
                self._extract_semaphore.release()

            if result.returncode == 0:
                print(f"[radar] extracted sweep {site} {product_name}: {output_path.name}")
                return

            # Exit code -9 = SIGKILL (OOM killer)
            if result.returncode == -9 and attempt < max_attempts:
                import time
                print(
                    f"[radar] extraction OOM-killed for {site} {product_name}, "
                    f"retrying (attempt {attempt + 1}/{max_attempts})..."
                )
                time.sleep(2)  # brief pause to let memory settle
                continue

            stderr = result.stderr.strip() if result.stderr else "(no stderr)"
            raise RuntimeError(
                f"Sweep extraction failed (exit {result.returncode}): {stderr}"
            )

    def _schedule_background_extraction(self, cache_entry: RadarCacheEntry) -> None:
        """Pre-extract sweep data for all auto_products after new data arrives."""
        site = self._normalize_site(cache_entry.site)
        key_name = Path(cache_entry.key).name

        for product in self.auto_products:
            token = f"{site}:{key_name}:{product}"
            with self.lock:
                if token in self._extract_inflight:
                    continue
                self._extract_inflight.add(token)

            t = threading.Thread(
                target=self._run_background_extraction,
                args=(cache_entry, product, token),
                name=f"radar-extract-{site}-{product}",
                daemon=True,
            )
            t.start()

    def _run_background_extraction(
        self, cache_entry: RadarCacheEntry, product: str, token: str
    ) -> None:
        site = self._normalize_site(cache_entry.site)
        key_name = Path(cache_entry.key).name
        try:
            sweep_path = self._sweep_cache_path(site, key_name, product)
            if not sweep_path.exists():
                self._extract_sweep_via_subprocess(
                    Path(cache_entry.local_path),
                    sweep_path,
                    product,
                    site,
                    cache_entry.key,
                )
        except Exception as exc:
            print(
                f"[radar] background sweep extraction failed for {site} {product}: {exc}"
            )
        finally:
            with self.lock:
                self._extract_inflight.discard(token)

    # ── Background polling loop ──

    def _background_loop(self) -> None:
        while not self.stop_event.is_set():
            try:
                with self.lock:
                    sites = list(self.tracked_sites)
                for site in sites:
                    if self.stop_event.is_set():
                        break
                    try:
                        self._refresh_site(site, force=False)
                    except Exception as exc:
                        self._record_background_refresh_failure(site, exc)
                        print(f"[radar] background refresh failed for {site}: {exc}")
            finally:
                self.stop_event.wait(
                    timeout=max(5, min(self.poll_interval_seconds, 60))
                )

    def _record_background_refresh_failure(self, site: str, exc: Exception) -> None:
        with self.lock:
            failures = self.refresh_failures.get(site, 0) + 1
            self.refresh_failures[site] = failures

            if failures < self.max_background_refresh_failures:
                return

            if site in self.tracked_sites:
                self.tracked_sites.remove(site)
            self.disabled_sites.add(site)
            self._save_index()

        print(
            f"[radar] disabled background refresh for {site} after {failures} failures: {exc}"
        )

    def _refresh_site(self, site: str, force: bool = False) -> RadarCacheEntry:
        site = self._normalize_site(site)
        with self.lock:
            current = self.entries.get(site)

        latest_key, object_url = self._find_latest_key(site)
        if not latest_key or not object_url:
            raise RuntimeError(f"No Level 2 files found for site {site}")

        now = self._utcnow()
        next_poll = now + timedelta(seconds=self.poll_interval_seconds)

        if current and current.key == latest_key and not force:
            updated = RadarCacheEntry(
                site=current.site,
                key=current.key,
                object_url=current.object_url,
                local_path=current.local_path,
                size_bytes=current.size_bytes,
                updated_at_utc=current.updated_at_utc,
                next_poll_utc=next_poll.isoformat(),
            )
            with self.lock:
                self.entries[site] = updated
                self._save_index()
            return updated

        payload = self._download_url(object_url)
        local_path = self.cache_dir / f"{site}_{Path(latest_key).name}"
        local_path.write_bytes(payload)

        entry = RadarCacheEntry(
            site=site,
            key=latest_key,
            object_url=object_url,
            local_path=str(local_path),
            size_bytes=len(payload),
            updated_at_utc=now.isoformat(),
            next_poll_utc=next_poll.isoformat(),
        )

        with self.lock:
            self.entries[site] = entry
            self.refresh_failures[site] = 0
            self.disabled_sites.discard(site)
            self._save_index()

        print(f"[radar] cached {site}: {Path(latest_key).name} ({len(payload)} bytes)")

        return entry

    # ── Data source helpers ──

    def _find_latest_key(self, site: str) -> tuple[Optional[str], Optional[str]]:
        try:
            s3_key = self._find_latest_key_from_s3(site)
            if s3_key:
                return s3_key, f"{S3_BASE}/{s3_key}"
        except Exception as exc:
            print(
                f"[radar] S3 listing failed for {site}: {exc}; falling back to NOMADS"
            )

        nomads_name = self._find_latest_name_from_nomads(site)
        if nomads_name:
            return nomads_name, f"{NOMADS_LEVEL2_BASE}/{site}/{nomads_name}"

        return None, None

    def _find_latest_key_from_s3(self, site: str) -> Optional[str]:
        now = self._utcnow()
        candidate_dates = [now.date(), (now - timedelta(days=1)).date()]
        keys: List[str] = []

        for candidate in candidate_dates:
            prefix = f"{candidate.year:04d}/{candidate.month:02d}/{candidate.day:02d}/{site}/"
            keys.extend(self._list_keys(prefix))

        keys = [key for key in keys if self._is_usable_level2_key(key, site)]

        if not keys:
            return None
        keys.sort()
        return keys[-1]

    def _find_latest_name_from_nomads(self, site: str) -> Optional[str]:
        directory_url = f"{NOMADS_LEVEL2_BASE}/{site}/"
        request = Request(
            directory_url, headers={"User-Agent": "web-weather-radar-cache/1.0"}
        )
        with urlopen(request, timeout=self.timeout_seconds) as response:
            html = response.read().decode("utf-8", errors="ignore")

        candidates = re.findall(
            r'href="([A-Z0-9]{4}[0-9]{8}_[0-9]{6}_[^"/]+)"', html
        )
        candidates = [
            name for name in candidates if self._is_usable_level2_key(name, site)
        ]
        if not candidates:
            return None
        candidates.sort()
        return candidates[-1]

    def _list_keys(self, prefix: str) -> List[str]:
        query = f"{S3_BASE}?list-type=2&prefix={prefix}&max-keys=1000"
        request = Request(
            query, headers={"User-Agent": "web-weather-radar-cache/1.0"}
        )
        with urlopen(request, timeout=self.timeout_seconds) as response:
            body = response.read()

        root = ET.fromstring(body)
        ns = "{http://s3.amazonaws.com/doc/2006-03-01/}"
        keys = []
        for key_node in root.findall(f"{ns}Contents/{ns}Key"):
            text = (key_node.text or "").strip()
            if text and not text.endswith("/"):
                keys.append(text)
        return keys

    def _download_url(self, url: str) -> bytes:
        request = Request(
            url, headers={"User-Agent": "web-weather-radar-cache/1.0"}
        )
        with urlopen(request, timeout=self.timeout_seconds) as response:
            return response.read()

    # ── Static helpers used by both server and subprocess ──

    @staticmethod
    def _pick_sweep_for_field(radar, field: str, np) -> int:
        try:
            total_sweeps = int(getattr(radar, "nsweeps", 0) or 0)
        except Exception:
            total_sweeps = 0

        if total_sweeps <= 1:
            return 0

        fallback = 0
        for sweep_index in range(total_sweeps):
            try:
                sweep_data = radar.get_field(sweep_index, field, copy=False)
            except Exception:
                continue

            if sweep_data is None:
                continue

            try:
                if np.ma.count(sweep_data) > 0:
                    return sweep_index
            except Exception:
                if getattr(sweep_data, "size", 0):
                    return sweep_index

            fallback = sweep_index

        return fallback

    @staticmethod
    def _estimate_environmental_wind_component(
        radar, field: str, sweep_index: int, np
    ):
        """
        Use a VAD-like least-squares sinusoidal fit across several range rings
        to estimate the mean environmental wind's radial component at each gate.
        Returns an array shaped (n_rays, n_gates) for the requested sweep,
        or None if there is insufficient data for a reliable fit.
        """
        try:
            start_idx = int(radar.sweep_start_ray_index["data"][sweep_index])
            end_idx = int(radar.sweep_end_ray_index["data"][sweep_index]) + 1

            azimuths_deg = radar.azimuth["data"][start_idx:end_idx]
            az_rad = np.radians(azimuths_deg).astype(np.float64)

            sweep_data = radar.get_field(sweep_index, field, copy=False)
            n_rays, n_gates = sweep_data.shape

            ring_fractions = [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75]
            all_az: list = []
            all_vel: list = []

            for frac in ring_fractions:
                ri = int(n_gates * frac)
                if ri >= n_gates:
                    continue
                ring = sweep_data[:, ri]
                valid = ~np.ma.getmaskarray(ring)
                if valid.sum() < 20:
                    continue
                all_az.append(az_rad[valid])
                all_vel.append(np.asarray(ring[valid], dtype=np.float64))

            if not all_az:
                return None

            all_az_arr = np.concatenate(all_az)
            all_vel_arr = np.concatenate(all_vel)

            if all_vel_arr.size < 60:
                return None

            design = np.column_stack(
                [
                    np.cos(all_az_arr),
                    np.sin(all_az_arr),
                    np.ones(all_az_arr.size),
                ]
            )
            coeffs, *_ = np.linalg.lstsq(design, all_vel_arr, rcond=None)
            A, B, _C = coeffs

            env = (A * np.cos(az_rad) + B * np.sin(az_rad))[:, np.newaxis]
            return np.broadcast_to(env, (n_rays, n_gates)).copy()
        except Exception:
            return None

    @staticmethod
    def _pick_field_and_effective_product(
        radar, requested_product: str
    ) -> tuple[Optional[str], str]:
        requested = (requested_product or "reflectivity").lower()

        srv_fields = [
            "storm_relative_velocity",
            "storm_relative_radial_velocity",
            "SRV",
            "SRM",
            "srm",
            "storm_motion_velocity",
        ]
        velocity_fields = [
            "velocity",
            "VEL",
            "VR",
            "corrected_velocity",
            "radial_velocity",
        ]
        reflectivity_fields = [
            "reflectivity",
            "DBZ",
            "REF",
            "base_reflectivity",
            "corrected_reflectivity",
        ]
        cc_fields = [
            "cross_correlation_ratio",
            "cross_correlation_ratio_hv",
            "RHOHV",
            "RHO",
        ]
        class_fields = [
            "radar_echo_classification",
            "hydrometeor_classification",
            "classification",
            "HCLASS",
            "EC",
        ]

        def first_existing(candidates: List[str]) -> Optional[str]:
            for candidate in candidates:
                if candidate in radar.fields:
                    return candidate
            return None

        if requested == "srv":
            srv_field = first_existing(srv_fields)
            if srv_field:
                return srv_field, "srv"
            velocity_field = first_existing(velocity_fields)
            if velocity_field:
                return velocity_field, "srv"
            return None, "srv"

        if requested == "velocity":
            velocity_field = first_existing(velocity_fields)
            if velocity_field:
                return velocity_field, "velocity"
            srv_field = first_existing(srv_fields)
            if srv_field:
                return srv_field, "srv"
            return None, "velocity"

        lookup = {
            "reflectivity": reflectivity_fields,
            "cc": cc_fields,
            "classification": class_fields,
        }
        candidates = lookup.get(requested, reflectivity_fields)
        field = first_existing(candidates)
        return field, requested

    @staticmethod
    def _resolve_product_name(product_name: Optional[str]) -> str:
        normalized = (product_name or "").strip().lower()
        aliases = {
            "": "reflectivity",
            "ref": "reflectivity",
            "reflectivity": "reflectivity",
            "n0q": "reflectivity",
            "n0r": "reflectivity",
            "srv": "srv",
            "srm": "srv",
            "velocity": "velocity",
            "vel": "velocity",
            "v": "velocity",
            "cc": "cc",
            "corr": "cc",
            "classification": "classification",
            "class": "classification",
            "hydrometeor": "classification",
        }
        return aliases.get(normalized, "reflectivity")

    @staticmethod
    def _sanitize_name(name: str) -> str:
        return re.sub(r"[^A-Za-z0-9_-]+", "_", name)

    @staticmethod
    def _is_usable_level2_key(key: str, site: str) -> bool:
        name = Path(key).name.upper()
        normalized_site = site.upper()
        if not name.startswith(normalized_site):
            return False

        parts = name.split("_")
        if len(parts) < 3:
            return False

        if "MDM" in parts[2:]:
            return False

        return bool(re.match(rf"^{normalized_site}[0-9]{{8}}_[0-9]{{6}}_", name))

    # ── Persistence ──

    def _load_index(self) -> None:
        if not self.entries_meta_path.exists():
            return
        try:
            raw = json.loads(self.entries_meta_path.read_text(encoding="utf-8"))
            entries = raw.get("entries", {})
            tracked = raw.get("trackedSites", [])
            disabled = raw.get("disabledSites", [])
            failures = raw.get("refreshFailures", {})
            auto_products = raw.get("autoProducts", self.auto_products)
            for site, payload in entries.items():
                self.entries[site] = RadarCacheEntry(**payload)
            self.tracked_sites = set(
                [self._normalize_site(x) for x in tracked]
            )
            self.disabled_sites = set(
                [self._normalize_site(x) for x in disabled]
            )
            self.refresh_failures = {
                self._normalize_site(site): int(count)
                for site, count in failures.items()
            }
            if isinstance(auto_products, list):
                sanitized_auto = [
                    self._resolve_product_name(str(x)) for x in auto_products
                ]
                unique_auto = list(dict.fromkeys(sanitized_auto))
                if unique_auto:
                    self.auto_products = unique_auto
        except Exception as exc:
            print(f"[radar] failed loading cache index: {exc}")

    def _save_index(self) -> None:
        snapshot = {
            "trackedSites": sorted(self.tracked_sites),
            "disabledSites": sorted(self.disabled_sites),
            "refreshFailures": dict(self.refresh_failures),
            "autoProducts": list(self.auto_products),
            "entries": {
                site: asdict(entry) for site, entry in self.entries.items()
            },
        }
        self.entries_meta_path.write_text(
            json.dumps(snapshot, indent=2), encoding="utf-8"
        )

    @staticmethod
    def _normalize_site(site: str) -> str:
        if not site:
            raise ValueError("Missing radar site code")
        value = site.strip().upper()
        if len(value) != 4:
            raise ValueError(
                "Radar site code must be 4 characters (e.g. KLZK)"
            )
        return value

    @staticmethod
    def _utcnow() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _parse_iso(iso_value: str) -> datetime:
        return datetime.fromisoformat(iso_value)


class RadarAPIHandler(BaseHTTPRequestHandler):
    manager: Optional[RadarCacheManager] = None

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = "/" + parsed.path.lstrip("/")
        if path.startswith("/radar/"):
            path = "/" + path[len("/radar/"):]
        query = parse_qs(parsed.query)
        manager = self._get_manager()

        try:
            if path == "/health":
                self._send_json(200, {"ok": True, "service": "radar-cache-api"})
                return

            if path == "/api/radar/status":
                self._send_json(200, manager.list_status())
                return

            if path == "/api/radar/latest":
                site = self._require_site(query)
                force = self._is_true(query.get("force", ["0"])[0])
                entry = manager.get_or_refresh(site, force=force)
                self._send_json(200, {"site": site, "cache": asdict(entry)})
                return

            if path == "/api/radar/raw":
                site = self._require_site(query)
                force = self._is_true(query.get("force", ["0"])[0])
                entry = manager.get_or_refresh(site, force=force)
                file_path = Path(entry.local_path)
                payload = file_path.read_bytes()

                self.send_response(200)
                self._set_cors_headers()
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("X-Radar-Site", site)
                self.send_header("X-Radar-Key", entry.key)
                self.end_headers()
                self.wfile.write(payload)
                return

            if path == "/api/radar/sweep":
                site = self._require_site(query)
                force = self._is_true(query.get("force", ["0"])[0])
                product_name = self._get_optional_product(query)
                sweep_path = manager.get_or_extract_sweep(
                    site,
                    product_name=product_name,
                    force=force,
                )
                payload = sweep_path.read_bytes()  # already gzipped

                accept_enc = self.headers.get("Accept-Encoding", "")
                if "gzip" in accept_enc:
                    self.send_response(200)
                    self._set_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Encoding", "gzip")
                    self.send_header("Content-Length", str(len(payload)))
                    self.send_header("Cache-Control", "public, max-age=60")
                    self.end_headers()
                    self.wfile.write(payload)
                else:
                    decompressed = gzip.decompress(payload)
                    self.send_response(200)
                    self._set_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.send_header(
                        "Content-Length", str(len(decompressed))
                    )
                    self.send_header("Cache-Control", "public, max-age=60")
                    self.end_headers()
                    self.wfile.write(decompressed)
                return

            self._send_json(404, {"error": "Not found"})
        except Exception as exc:
            import traceback
            print(f"[radar-api] 500 error: {exc}")
            traceback.print_exc()
            self._send_json(500, {"error": str(exc)})

    def log_message(self, format: str, *args):
        print(f"[radar-api] {self.address_string()} - {format % args}")

    def _send_json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header(
            "Access-Control-Expose-Headers",
            "X-Radar-Site, X-Radar-Key",
        )

    @staticmethod
    def _require_site(query: dict) -> str:
        values = query.get("site", [])
        if not values:
            raise ValueError("Missing required query parameter: site")
        return values[0]

    @staticmethod
    def _is_true(value: str) -> bool:
        return value.lower() in {"1", "true", "yes", "on"}

    @staticmethod
    def _get_optional_product(query: dict) -> Optional[str]:
        values = query.get("product", [])
        if not values:
            return None
        return values[0]

    def _get_manager(self) -> RadarCacheManager:
        if self.manager is None:
            raise RuntimeError("Radar cache manager is not initialized")
        return self.manager


# ── Subprocess entry point ──


def _extract_sweep_task(task: dict) -> None:
    """Subprocess: extract sweep data from a Level 2 file, write gzipped JSON.
    Memory-optimized: frees the full radar object as soon as sweep data is extracted."""
    import gc
    np = importlib.import_module("numpy")
    pyart = importlib.import_module("pyart")

    local_path = Path(task["local_path"])
    output_path = Path(task["output_path"])
    product_name = task["product_name"]
    enable_srv_dealias = task.get("enable_srv_dealias", False)
    site = task.get("site", "")
    key = task.get("key", "")

    # Determine which fields we actually need so pyart can skip the rest.
    # read_nexrad_archive supports `exclude_fields` to reduce memory.
    _product = RadarCacheManager._resolve_product_name(product_name)

    # Classification is a Level III product (N0H/HHC) — fetch separately
    if _product == "classification":
        _extract_classification_from_level3(task)
        return

    _desired_fields = _get_desired_fields_for_product(_product)

    try:
        radar = pyart.io.read_nexrad_archive(
            str(local_path),
            exclude_fields=[f for f in _all_nexrad_fields() if f not in _desired_fields],
        )
    except Exception:
        # Fallback: if exclude_fields causes issues, read everything
        radar = pyart.io.read_nexrad_archive(str(local_path))

    field, effective_product = RadarCacheManager._pick_field_and_effective_product(
        radar, product_name
    )
    if not field:
        available = sorted(radar.fields.keys()) if hasattr(radar, 'fields') else []
        raise RuntimeError(
            f"No {product_name} field found in Level II file. "
            f"Available fields: {', '.join(available) if available else 'none'}. "
            f"Note: classification/hydrometeor data is only available in Level III products."
        )

    sweep_index = RadarCacheManager._pick_sweep_for_field(radar, field, np)

    lat = float(radar.latitude["data"][0])
    lon = float(radar.longitude["data"][0])

    start_idx = int(radar.sweep_start_ray_index["data"][sweep_index])
    end_idx = int(radar.sweep_end_ray_index["data"][sweep_index]) + 1

    azimuths = radar.azimuth["data"][start_idx:end_idx].tolist()

    range_data = radar.range["data"]
    first_gate = float(range_data[0])
    gate_width = (
        float(range_data[1] - range_data[0]) if len(range_data) > 1 else 250.0
    )
    num_gates = int(len(range_data))
    max_range = float(range_data[-1] + gate_width)

    sweep_data = radar.get_field(sweep_index, field, copy=True)

    # ── Product-specific processing ──
    vmin, vmax = -20.0, 80.0
    needs_radar = False  # track if we still need the full radar object

    if effective_product == "reflectivity":
        vmin, vmax = -20.0, 80.0
        sweep_data = np.ma.masked_less(sweep_data, 5.0)

    elif effective_product in ("srv", "velocity"):
        needs_radar = True  # may need for dealias and env wind
        nyquist_velocity = None
        try:
            nyquist_raw = radar.get_nyquist_vel(sweep_index)
            if hasattr(nyquist_raw, "__len__"):
                nyquist_velocity = float(np.median(nyquist_raw))
            else:
                nyquist_velocity = float(nyquist_raw)
        except Exception:
            nyquist_velocity = None

        try:
            sweep_compressed = sweep_data.compressed()
            data_abs_max = (
                float(np.abs(sweep_compressed).max())
                if sweep_compressed.size > 0
                else 0.0
            )
            del sweep_compressed
        except Exception:
            data_abs_max = 0.0

        if (
            not nyquist_velocity
            or nyquist_velocity <= 0
            or (data_abs_max > 0 and nyquist_velocity < data_abs_max * 0.5)
        ):
            nyquist_velocity = (
                max(data_abs_max * 1.05, 30.0) if data_abs_max > 0 else 30.0
            )

        vmin = -80.0
        vmax = 80.0

        if effective_product == "srv" and enable_srv_dealias:
            try:
                corrected_field = pyart.correct.dealias_region_based(
                    radar,
                    vel_field=field,
                    keep_original=False,
                )
                corrected_data = corrected_field.get("data")
                if corrected_data is not None:
                    sweep_data = corrected_data
            except Exception as e:
                print(f"[radar] dealias skipped: {e}", file=sys.stderr)

        if effective_product == "srv":
            srv_applied = False

            # — Method 1: Official storm motion from N0S Level 3 product —
            try:
                storm_motion = _fetch_storm_motion_from_n0s(site)
                if storm_motion is not None:
                    speed_ms, direction_deg = storm_motion
                    az_arr = np.array(azimuths, dtype=np.float64)
                    az_rad = np.radians(az_arr)
                    storm_dir_rad = np.radians(direction_deg)
                    # Project storm motion onto each radial (AtticRadar formula)
                    storm_component = speed_ms * np.cos(storm_dir_rad - az_rad)
                    # Broadcast (n_rays,) → (n_rays, n_gates) and add
                    sweep_data = sweep_data + storm_component[:, np.newaxis]
                    srv_applied = True
                    print(
                        f"[radar] SRV using N0S storm motion for {site} "
                        f"(speed={speed_ms:.1f} m/s, dir={direction_deg:.0f}°)",
                        file=sys.stderr,
                    )
            except Exception as e:
                print(
                    f"[radar] N0S storm motion fetch failed for {site}: {e}",
                    file=sys.stderr,
                )

            # — Method 2: VAD-based environmental wind estimation (fallback) —
            if not srv_applied:
                try:
                    env_wind = (
                        RadarCacheManager._estimate_environmental_wind_component(
                            radar, field, sweep_index, np
                        )
                    )
                    if env_wind is not None:
                        wind_mag = float(np.abs(env_wind).mean())
                        sweep_data = sweep_data - env_wind
                        del env_wind
                        srv_applied = True
                        print(
                            f"[radar] SRV using VAD fallback for {site} "
                            f"(mean |env_wind| = {wind_mag:.2f} m/s)",
                            file=sys.stderr,
                        )
                    else:
                        print(
                            f"[radar] SRV: both N0S and VAD unavailable for {site}, "
                            f"serving raw velocity as SRV",
                            file=sys.stderr,
                        )
                except Exception as e:
                    print(
                        f"[radar] SRV VAD fallback also failed for {site}: {e}",
                        file=sys.stderr,
                    )

    elif effective_product == "cc":
        vmin, vmax = 0.2, 1.05
        sweep_data = np.ma.masked_less(sweep_data, 0.2)

    elif effective_product == "classification":
        vmin, vmax = 0.0, 20.0

    del radar
    gc.collect()

    # ── Quantize to uint8: 0-254 = data, 255 = no data ──
    # Use float32 instead of float64 to halve memory
    filled = np.ma.filled(sweep_data, np.nan).astype(np.float32)
    del sweep_data
    quantized = np.full(filled.shape, 255, dtype=np.uint8)
    valid = ~np.isnan(filled)
    if valid.any():
        normalized = (filled[valid] - vmin) / (vmax - vmin)
        normalized = np.clip(normalized * 254, 0, 254)
        quantized[valid] = normalized.astype(np.uint8)
        del normalized
    del filled, valid
    gc.collect()

    # ── Speckle filter: remove isolated single-gate outliers ──
    if effective_product in ("reflectivity", "velocity", "srv"):
        has_data = quantized != 255
        # Check along range axis (axis=1)
        prev_range = np.roll(has_data, 1, axis=1)
        next_range = np.roll(has_data, -1, axis=1)
        prev_range[:, 0] = True   # don't remove first gate
        next_range[:, -1] = True  # don't remove last gate
        # Check along azimuth axis (axis=0)
        prev_az = np.roll(has_data, 1, axis=0)
        next_az = np.roll(has_data, -1, axis=0)
        # Isolated = has data but ALL 4 neighbors are no-data
        isolated = has_data & ~prev_range & ~next_range & ~prev_az & ~next_az
        n_removed = int(isolated.sum())
        if n_removed > 0:
            quantized[isolated] = 255
            print(
                f"[radar] Speckle filter removed {n_removed} isolated gates",
                file=sys.stderr,
            )
        del has_data, prev_range, next_range, prev_az, next_az, isolated

    data_b64 = base64.b64encode(quantized.tobytes()).decode("ascii")

    result = {
        "site": site,
        "key": key,
        "product": effective_product,
        "latitude": round(lat, 6),
        "longitude": round(lon, 6),
        "azimuths": [round(a, 2) for a in azimuths],
        "firstGateRange": round(first_gate, 1),
        "gateWidth": round(gate_width, 1),
        "numGates": num_gates,
        "numRadials": len(azimuths),
        "maxRange": round(max_range, 1),
        "vmin": round(vmin, 2),
        "vmax": round(vmax, 2),
        "noDataValue": 255,
        "data": data_b64,
    }

    json_bytes = json.dumps(result).encode("utf-8")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(str(output_path), "wb") as f:
        f.write(json_bytes)

    del quantized
    gc.collect()

    print(json.dumps({"status": "ok", "product": effective_product}))


def _extract_classification_from_level3(task: dict) -> None:
    """Extract classification data from a locally-cached Level III N0H file.

    The main process downloads and caches the Level III file, passing its
    path via task['local_path'] so this subprocess avoids network I/O."""
    import gc

    np = importlib.import_module("numpy")
    pyart = importlib.import_module("pyart")

    local_path = Path(task["local_path"])
    output_path = Path(task["output_path"])
    site = task.get("site", "")
    key = task.get("key", "")

    radar = pyart.io.read_nexrad_level3(str(local_path))

    # Find classification field — pyart names it based on product code
    field = None
    class_candidates = [
        "radar_echo_classification",
        "hydrometeor_classification",
        "classification",
        "HCLASS",
        "EC",
    ]
    for candidate in class_candidates:
        if candidate in radar.fields:
            field = candidate
            break

    if not field:
        # Fall back to whatever field pyart created
        available = sorted(radar.fields.keys())
        if available:
            field = available[0]
            print(
                f"[radar] classification: using field '{field}' from Level III "
                f"(available: {available})",
                file=sys.stderr,
            )
        else:
            raise RuntimeError(
                "No fields found in Level III classification product"
            )

    # Level III products typically have a single sweep
    sweep_index = 0

    lat = float(radar.latitude["data"][0])
    lon = float(radar.longitude["data"][0])

    start_idx = int(radar.sweep_start_ray_index["data"][sweep_index])
    end_idx = int(radar.sweep_end_ray_index["data"][sweep_index]) + 1

    azimuths = radar.azimuth["data"][start_idx:end_idx].tolist()

    range_data = radar.range["data"]
    first_gate = float(range_data[0])
    gate_width = (
        float(range_data[1] - range_data[0]) if len(range_data) > 1 else 250.0
    )
    num_gates = int(len(range_data))
    max_range = float(range_data[-1] + gate_width)

    sweep_data = radar.get_field(sweep_index, field, copy=True)

    del radar
    gc.collect()

    # HHC categories: 0=ND, 10=BI, 20=GC, 30=IC, 40=DS, 50=WS,
    # 60=RA, 70=HR, 80=BD, 90=GR, 100=HA, 140=UK, 150=RF
    vmin, vmax = 0.0, 160.0

    # Quantize to uint8: 0-254 = data, 255 = no data
    filled = np.ma.filled(sweep_data, np.nan).astype(np.float32)
    del sweep_data
    quantized = np.full(filled.shape, 255, dtype=np.uint8)
    valid = ~np.isnan(filled)
    if valid.any():
        normalized = (filled[valid] - vmin) / (vmax - vmin)
        normalized = np.clip(normalized * 254, 0, 254)
        quantized[valid] = normalized.astype(np.uint8)
        del normalized
    del filled, valid
    gc.collect()

    data_b64 = base64.b64encode(quantized.tobytes()).decode("ascii")

    result = {
        "site": site,
        "key": key,
        "product": "classification",
        "latitude": round(lat, 6),
        "longitude": round(lon, 6),
        "azimuths": [round(a, 2) for a in azimuths],
        "firstGateRange": round(first_gate, 1),
        "gateWidth": round(gate_width, 1),
        "numGates": num_gates,
        "numRadials": len(azimuths),
        "maxRange": round(max_range, 1),
        "vmin": round(vmin, 2),
        "vmax": round(vmax, 2),
        "noDataValue": 255,
        "data": data_b64,
    }

    json_bytes = json.dumps(result).encode("utf-8")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(str(output_path), "wb") as f:
        f.write(json_bytes)

    del quantized
    gc.collect()

    print(json.dumps({"status": "ok", "product": "classification"}))


def _fetch_level3_file(
    site: str, product_mnemonic: str, timeout: int = 15
) -> Optional[bytes]:
    """Fetch the latest Level III product file from the Unidata S3 bucket.

    Returns the raw file bytes, or None if not available.
    `product_mnemonic` is the 3-char S3 key prefix, e.g. 'N0S', 'N0H'.
    """
    station_3 = site[1:].upper() if len(site) == 4 else site.upper()
    now = datetime.now(timezone.utc)

    for days_back in range(2):
        d = now - timedelta(days=days_back)
        prefix = f"{station_3}_{product_mnemonic}_{d.year}_{d.month:02d}_{d.day:02d}"
        list_url = f"{LEVEL3_S3_BASE}/?prefix={prefix}"

        try:
            req = Request(
                list_url, headers={"User-Agent": "web-weather-radar/1.0"}
            )
            with urlopen(req, timeout=timeout) as resp:
                body = resp.read()

            root = ET.fromstring(body)
            ns = "{http://s3.amazonaws.com/doc/2006-03-01/}"
            keys = []
            for key_node in root.findall(f"{ns}Contents/{ns}Key"):
                text = (key_node.text or "").strip()
                if text:
                    keys.append(text)

            if not keys:
                continue

            keys.sort()
            latest_key = keys[-1]
            file_url = f"{LEVEL3_S3_BASE}/{latest_key}"

            req = Request(
                file_url, headers={"User-Agent": "web-weather-radar/1.0"}
            )
            with urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except Exception:
            continue

    return None


def _fetch_storm_motion_from_n0s(site: str, timeout: int = 10):
    """
    Fetch the official storm motion vector from the latest N0S (SRM, product 56)
    Level 3 product on the Unidata S3 bucket.

    Returns (speed_m_s, direction_degrees) or None.

    The storm motion is embedded in the Product Description Block:
      - dep8 (halfword 50): storm speed in knots × 10
      - dep9 (halfword 51): storm direction in degrees × 10

    This is the same method AtticRadar uses (PR #12 by @slash2314).
    """
    data = _fetch_level3_file(site, "N0S", timeout=timeout)
    if data is None:
        return None
    return _parse_level3_storm_motion(data)


def _parse_level3_storm_motion(data: bytes):
    """
    Parse storm motion from a NEXRAD Level 3 SRM (product code 56) binary file.

    NEXRAD Level 3 message layout (each halfword = 2 bytes, big-endian):
      HW 1:     Message code (== 56 for SRM)
      HW 2-9:   Rest of Message Header Block
      HW 10:    Block divider (-1)
      HW 11-61: Product Description Block
        HW 51:  dep8 = storm speed (knots × 10)
        HW 52:  dep9 = storm direction (degrees × 10)

    dep8 byte offset from message start = (51-1)*2 = 100
    dep9 byte offset from message start = (52-1)*2 = 102

    Files from S3 have a WMO header + AWIPS ID line before the binary message.
    Returns (speed_m_s, direction_degrees) or None.
    """
    import struct

    if len(data) < 110:
        return None

    # Build candidate offsets for the binary message start.
    # S3 Level 3 files have: WMO header \r\r\n AWIPS-ID \r\r\n <binary>
    offsets_to_try = [0]
    pos = 0
    while True:
        idx = data.find(b"\r\r\n", pos)
        if idx == -1 or idx > 200:
            break
        offsets_to_try.append(idx + 3)
        pos = idx + 1

    for offset in offsets_to_try:
        if offset + 104 > len(data):
            continue

        msg_code = struct.unpack_from(">h", data, offset)[0]
        if msg_code != 56:
            continue

        # Verify block divider at HW 10
        divider = struct.unpack_from(">h", data, offset + 18)[0]
        if divider != -1:
            continue

        dep8 = struct.unpack_from(">h", data, offset + 100)[0]  # HW51: speed × 10 kts
        dep9 = struct.unpack_from(">h", data, offset + 102)[0]  # HW52: dir × 10 deg

        if dep8 == 0 and dep9 == 0:
            return None  # no storm motion data in this product

        speed_ms = (dep8 / 10.0) * 0.514444  # knots → m/s
        direction_deg = dep9 / 10.0

        return (speed_ms, direction_deg)

    return None


def _get_desired_fields_for_product(product: str) -> set:
    """Return the set of field names pyart might need for a given product."""
    common = {
        "reflectivity", "DBZ", "REF", "base_reflectivity", "corrected_reflectivity",
    }
    velocity = {
        "velocity", "VEL", "VR", "corrected_velocity", "radial_velocity",
        "storm_relative_velocity", "storm_relative_radial_velocity",
        "SRV", "SRM", "srm", "storm_motion_velocity",
    }
    cc = {
        "cross_correlation_ratio", "cross_correlation_ratio_hv", "RHOHV", "RHO",
    }
    classification = {
        "radar_echo_classification", "hydrometeor_classification",
        "classification", "HCLASS", "EC",
    }
    lookup = {
        "reflectivity": common,
        "velocity": velocity,
        "srv": velocity,  # SRV uses velocity fields
        "cc": cc,
        "classification": classification,
    }
    return lookup.get(product, common)


def _all_nexrad_fields() -> set:
    """Return all known NEXRAD field names that pyart might encounter."""
    return {
        "reflectivity", "DBZ", "REF", "base_reflectivity", "corrected_reflectivity",
        "velocity", "VEL", "VR", "corrected_velocity", "radial_velocity",
        "storm_relative_velocity", "storm_relative_radial_velocity",
        "SRV", "SRM", "srm", "storm_motion_velocity",
        "cross_correlation_ratio", "cross_correlation_ratio_hv", "RHOHV", "RHO",
        "radar_echo_classification", "hydrometeor_classification",
        "classification", "HCLASS", "EC",
        "spectrum_width", "differential_reflectivity", "differential_phase",
        "specific_differential_phase", "clutter_filter_power_removed",
        "corrected_differential_reflectivity",
    }


# ── CLI ──


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Local cached NEXRAD Level 2 polling API"
    )
    parser.add_argument("--host", default="127.0.0.1", help="HTTP bind host")
    parser.add_argument(
        "--port", type=int, default=8765, help="HTTP bind port"
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=90,
        help="Polling interval in seconds",
    )
    parser.add_argument(
        "--cache-dir",
        default=str(Path(__file__).resolve().parent / ".radar-cache"),
        help="Directory for cached radar files",
    )
    parser.add_argument(
        "--sites",
        default="",
        help="Comma-separated startup radar sites to track (e.g. KLZK,KSHV)",
    )
    parser.add_argument(
        "--srv-dealias",
        action="store_true",
        help="Enable SRV de-aliasing (higher CPU/RAM usage). Disabled by default.",
    )
    parser.add_argument(
        "--render-task", default="", help=argparse.SUPPRESS
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.render_task:
        task = json.loads(args.render_task)
        _extract_sweep_task(task)
        return

    cache_dir = Path(args.cache_dir)

    manager = RadarCacheManager(
        cache_dir=cache_dir,
        poll_interval_seconds=max(10, args.poll_interval),
        enable_srv_dealias=args.srv_dealias,
    )
    if args.sites.strip():
        for raw_site in args.sites.split(","):
            site = raw_site.strip()
            if site:
                manager.register_site(site)

    manager.start()

    RadarAPIHandler.manager = manager
    server = ThreadingHTTPServer((args.host, args.port), RadarAPIHandler)

    print(f"[radar] API listening on http://{args.host}:{args.port}")
    print(
        "[radar] endpoints: /health, /api/radar/status, "
        "/api/radar/latest?site=KLZK, /api/radar/sweep?site=KLZK"
    )

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        manager.stop()
        server.server_close()
        print("[radar] API stopped")


if __name__ == "__main__":
    main()
 