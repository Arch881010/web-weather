
const S3_BASE          = 'https://unidata-nexrad-level2.s3.amazonaws.com';
const LEVEL3_S3_BASE   = 'https://unidata-nexrad-level3.s3.amazonaws.com';
const NOMADS_BASE      = 'https://nomads.ncep.noaa.gov/pub/data/nccf/radar/nexrad_level2';

// Product routing
const LEVEL3_ONLY_PRODUCTS = new Set(['reflectivity', 'classification', 'cc']);
// Level III mnemonics for products that ALSO have a Level III source.
// velocity and srv: used when level=3 (SR mode); level=2 falls through to Level II.
const LEVEL3_PRODUCT_MNEMONICS = {
  // TDWR reflectivity uses TZL; fall back to WSR-88D NZB/N0B ordering
  reflectivity:   ['NZB', 'N0B', 'TZL'],
  classification: ['N0H'],
  cc:             ['N0C'],
  // TDWR velocity uses TV0; WSR-88D super-res base velocity is N0G with legacy N0V fallback
  velocity:       ['TV0', 'N0G', 'N0V'],
  srv:            ['N0S'],   // Storm Relative Motion (WSR-88D)
};

function normalizeSite(site) {
  if (!site) throw new Error('Missing radar site code');
  const v = site.trim().toUpperCase();
  if (v.length !== 4) throw new Error(`Radar site code must be 4 characters (e.g. KLZK), got: "${site}"`);
  return v;
}

function isTdwrSite(site) {
  const v = (site || '').trim().toUpperCase();
  return v.length === 4 && v.startsWith('T');
}

function resolveProductName(name) {
  const n = (name || '').trim().toLowerCase();
  const aliases = {
    '': 'reflectivity', ref: 'reflectivity', reflectivity: 'reflectivity',
    n0q: 'reflectivity', n0r: 'reflectivity',
    nrot: 'nrot', rot: 'nrot',
    srv: 'srv', srm: 'srv',
    velocity: 'velocity', vel: 'velocity', v: 'velocity',
    cc: 'cc', corr: 'cc',
    classification: 'classification', class: 'classification', hydrometeor: 'classification',
  };
  return aliases[n] ?? 'reflectivity';
}

function level3StationPrefixes(site) {
  const trimmed = (site || '').trim().toUpperCase();
  if (!trimmed) throw new Error('Missing radar site code');

  const prefixes = new Set();
  if (trimmed.length === 4) prefixes.add(trimmed.slice(1));
  prefixes.add(trimmed);

  return [...prefixes].filter(Boolean);
}

function isLevel3Request(product) {
  return LEVEL3_ONLY_PRODUCTS.has(product);
}

function isUsableLevel2Key(key, site) {
  const name = key.split('/').pop().toUpperCase();
  if (!name.startsWith(site.toUpperCase())) return false;
  const parts = name.split('_');
  if (parts.length < 3) return false;
  if (parts.slice(2).includes('MDM')) return false;
  return /^[A-Z0-9]{4}\d{8}_\d{6}_/.test(name);
}

function uint8ToBase64(u8) {
  // Works in both browser and Worker contexts
  if (typeof btoa !== 'undefined') {
    let bin = '';
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return btoa(bin);
  }
  // Node (if ever used there)
  return Buffer.from(u8).toString('base64');
}

function utcNow() { return new Date(); }

function dateToYMD(d) {
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    dd: d.getUTCDate(),
  };
}

function pad2(n) { return String(n).padStart(2, '0'); }

async function fetchBinary(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'nexrad-browser/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'nexrad-browser/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function listS3Keys(bucketBase, prefix) {
  const listUrl = `${bucketBase}/?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=1000`;
  const xml = await fetchText(listUrl);
  const keys = [];
  const re = /<Key>([^<]+)<\/Key>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const k = m[1].trim();
    if (k && !k.endsWith('/')) keys.push(k);
  }
  return keys;
}

async function findLatestLevel2Key(site) {
  const now = utcNow();
  const days = [now, new Date(now - 86400000)];
  let keys = [];

  for (const d of days) {
    const { y, m, dd } = dateToYMD(d);
    const prefix = `${y}/${pad2(m)}/${pad2(dd)}/${site}/`;
    try {
      const found = await listS3Keys(S3_BASE, prefix);
      keys.push(...found);
    } catch { /* continue */ }
  }

  keys = keys.filter(k => isUsableLevel2Key(k, site));
  if (!keys.length) return null;
  keys.sort();
  return keys[keys.length - 1];
}

async function findLatestLevel2KeyNomads(site) {
  const dirUrl = `${NOMADS_BASE}/${site}/`;
  const html = await fetchText(dirUrl);
  const re = /href="([A-Z0-9]{4}\d{8}_\d{6}_[^"/]+)"/g;
  const candidates = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    if (isUsableLevel2Key(m[1], site)) candidates.push(m[1]);
  }
  if (!candidates.length) return null;
  candidates.sort();
  return candidates[candidates.length - 1];
}

async function fetchLatestLevel2(site) {
  let key = null;
  let fileUrl = null;

  try {
    key = await findLatestLevel2Key(site);
    if (key) fileUrl = `${S3_BASE}/${key}`;
  } catch (e) {
    console.warn(`[nexrad] S3 listing failed for ${site}:`, e.message);
  }

  if (!key) {
    try {
      key = await findLatestLevel2KeyNomads(site);
      if (key) fileUrl = `${NOMADS_BASE}/${site}/${key}`;
    } catch (e) {
      console.warn(`[nexrad] NOMADS fallback failed for ${site}:`, e.message);
    }
  }

  if (!fileUrl) throw new Error(`No Level II files found for site ${site}`);

  const data = await fetchBinary(fileUrl);
  return { data, key, url: fileUrl };
}

async function fetchLatestLevel3(site, mnemonic) {
  const stationPrefixes = level3StationPrefixes(site);
  const now = utcNow();

  for (let daysBack = 0; daysBack < 2; daysBack++) {
    const d = new Date(now - daysBack * 86400000);
    const { y, m, dd } = dateToYMD(d);

    for (const station of stationPrefixes) {
      const prefix = `${station}_${mnemonic}_${y}_${pad2(m)}_${pad2(dd)}`;
      try {
        const keys = await listS3Keys(LEVEL3_S3_BASE, prefix);
        if (!keys.length) continue;
        keys.sort();
        const latest = keys[keys.length - 1];
        const fileUrl = `${LEVEL3_S3_BASE}/${latest}`;
        const data = await fetchBinary(fileUrl);
        return { data, key: latest };
      } catch {
        continue;
      }
    }
  }
  return null;
}

//

class Level2Parser {
  constructor(raw) {
    this.raw = raw;
    this.view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    this.sweeps = {}; // fieldName → array of { azimuth, data, rangeInfo }
    this.siteLat  = null;
    this.siteLon  = null;
    this.siteAlt  = null;
    this.scanTime = null;
    this._parsed  = false;
  }

  parse() {
    if (this._parsed) return;
    this._parsed = true;

    const raw = this.raw;
    let offset = 0;

    const header = String.fromCharCode(...raw.subarray(0, 9));
    if (!header.startsWith('AR2V') && !header.startsWith('ARCHIVE2')) {
      // Try to skip a WMO/LDM text preamble (common in older files)
      const preambleEnd = this._findBinaryStart(raw);
      if (preambleEnd < 0) throw new Error('Not a valid NEXRAD Level II file');
      offset = preambleEnd;
    }
    offset += 24; // skip tape header

    const messages = this._decompressAllRecords(raw, offset);

    for (const msg of messages) {
      this._parseMessage(msg);
    }

    // Compatibility fallback: some feeds use slightly different message header
    // byte layouts. If strict parsing found no sweeps, retry with legacy offsets.
    if (!this._hasAnySweeps()) {
      for (const msg of messages) {
        this._parseMessageLegacy(msg);
      }
    }
  }

  _hasAnySweeps() {
    const fields = Object.keys(this.sweeps || {});
    for (const f of fields) {
      if (Array.isArray(this.sweeps[f]) && this.sweeps[f].length > 0) return true;
    }
    return false;
  }

  _findBinaryStart(raw) {
    // Look for the "AR2V" magic after possible text preamble
    for (let i = 0; i < Math.min(4096, raw.length - 4); i++) {
      if (raw[i] === 0x41 && raw[i+1] === 0x52 && raw[i+2] === 0x32 && raw[i+3] === 0x56) return i;
      // Also try ARCHIVE2
      if (raw[i] === 0x41 && raw[i+1] === 0x52 && raw[i+2] === 0x43) return i;
    }
    return -1;
  }

  _decompressAllRecords(raw, offset) {
    const messages = [];
    const len = raw.length;

    while (offset + 4 <= len) {
      // LDM control word: signed 32-bit big-endian
      const ctrl = this.view.getInt32(offset, false);
      offset += 4;

      if (ctrl === 0) break; // end sentinel

      const size = Math.abs(ctrl);
      const compressed = ctrl < 0;

      if (offset + size > len) break;
      const chunk = raw.subarray(offset, offset + size);
      offset += size;

      let payload;
      if (compressed) {
        try {
          payload = this._bzipDecompress(chunk);
        } catch {
          // Skip unreadable records
          continue;
        }
      } else {
        payload = chunk;
      }

      // Each decompressed payload contains 2432-byte message records.
      // Archive II files have NO CTM header — message starts at byte 0 of each record.
      let pos = 0;
      while (pos + 28 <= payload.length) {
        const slice = payload.subarray(pos, pos + 2432);
        messages.push(slice);
        pos += 2432;
      }
    }
    return messages;
  }

  _bzipDecompress(compressed) {
    // NEXRAD uses BZip2. Browsers don't natively support BZip2 in
    // DecompressionStream (only gzip/deflate). We ship a minimal BZip2 decoder.
    return BZip2.decompress(compressed);
  }

  _parseMessage(slice) {
    // Some Level II streams include a 12-byte CTM header per 2432-byte record,
    // others begin directly with the message header. Accept both layouts.
    if (slice.length < 28) return;

    const view = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);

    const candidates = [];
    const t12 = slice.length > 14 ? slice[14] : -1;
    const t0  = slice.length > 2  ? slice[2]  : -1;
    if (t12 === 1 || t12 === 31) candidates.push({ msgStart: 12, msgType: t12 });
    if (t0 === 1 || t0 === 31)   candidates.push({ msgStart: 0,  msgType: t0  });

    let chosen = null;
    for (const c of candidates) {
      if (this._isValidLevel2MessageCandidate(slice, view, c.msgStart, c.msgType)) {
        chosen = c;
        break;
      }
    }
    if (!chosen) {
      return;
    }

    const { msgStart, msgType } = chosen;

    if (msgType === 31) {
      this._parseType31(slice, view, msgStart);
    } else if (msgType === 1) {
      this._parseType1(slice, view, msgStart);
    }
    // Types 2,3,5,7,13 etc. are metadata — skip for sweep extraction
  }

  _isValidLevel2MessageCandidate(slice, view, msgStart, msgType) {
    if (msgStart < 0 || msgStart + 28 > slice.length) return false;

    const julianDay = view.getUint16(msgStart + 6, false);
    const msOfDay = view.getUint32(msgStart + 8, false);
    if (julianDay < 1 || julianDay > 366) return false;
    if (msOfDay >= 86400000) return false;

    if (msgType === 1) {
      const d = msgStart + 100;
      if (d + 62 >= slice.length) return false;

      const refPtr = view.getUint16(d + 4, false);
      const velPtr = view.getUint16(d + 6, false);
      if (refPtr === 0 && velPtr === 0) return false;

      const nRef = view.getUint16(d + 8, false);
      const refGW = view.getUint16(d + 10, false);
      const firstRef = view.getUint16(d + 12, false);
      const nVel = view.getUint16(d + 14, false);
      const velGW = view.getUint16(d + 16, false);
      const elevNum = view.getUint16(d + 40, false);
      const nyq = view.getInt16(d + 60, false) / 100.0;

      if (elevNum > 30) return false;
      if (!Number.isFinite(nyq) || Math.abs(nyq) > 100) return false;
      if (nRef > 6000 || nVel > 6000) return false;
      if (refGW > 2000 || velGW > 2000) return false;
      if (firstRef > 200000) return false;

      const refPtrOk = refPtr > 0 && (msgStart + refPtr) < slice.length;
      const velPtrOk = velPtr > 0 && (msgStart + velPtr) < slice.length;
      return refPtrOk || velPtrOk;
    }

    if (msgType === 31) {
      const o = msgStart + 28;
      if (o + 32 >= slice.length) return false;
      const numBlocks = view.getUint16(o + 28, false);
      const elevNum = view.getUint16(o + 20, false);
      if (numBlocks < 1 || numBlocks > 64) return false;
      if (elevNum > 30) return false;
      const firstPtr = view.getUint32(o + 30, false);
      if (firstPtr === 0 || msgStart + firstPtr >= slice.length) return false;
      return true;
    }

    return false;
  }

  _parseMessageLegacy(slice) {
    if (slice.length < 28) return;
    const view = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);

    const attempts = [
      { msgStart: 12, typeOffset: 2 },
      { msgStart: 0,  typeOffset: 2 },
      { msgStart: 12, typeOffset: 1 },
      { msgStart: 0,  typeOffset: 1 },
    ];

    for (const a of attempts) {
      const idx = a.msgStart + a.typeOffset;
      if (idx < 0 || idx >= slice.length) continue;
      const msgType = slice[idx];
      if (msgType !== 1 && msgType !== 31) continue;

      if (msgType === 31) this._parseType31(slice, view, a.msgStart);
      else this._parseType1(slice, view, a.msgStart);
      return;
    }
  }

  _parseType1(slice, view, msgStart) {
    if (slice.length < msgStart + 100) return;

    // Standard message header at msgStart (12 bytes CTM already skipped).
    // The 28-byte MSG header + 72-byte MSG1-specific block = 100 bytes before data header.
    // d = start of MSG1 observation data header.
    const d = msgStart + 100;

    const julianDay = view.getUint16(msgStart + 6, false);
    const msOfDay   = view.getUint32(msgStart + 8, false);
    const scanTime  = this._julianToDate(julianDay, msOfDay);
    if (!this.scanTime) this.scanTime = scanTime;

    const rawAz   = view.getUint16(d,      false);
    const azimuth = (rawAz / 8.0) * (360.0 / 4096.0);

    // Pointers are byte offsets from msgStart
    const refPtr  = view.getUint16(d + 4, false);
    const velPtr  = view.getUint16(d + 6, false);

    // Elevation number for multi-elevation filtering
    const elevNum = view.getUint16(d + 40, false);

    if (!this._loggedMsg1) {
      this._loggedMsg1 = true;
      const nrg = view.getUint16(d + 8,  false);
      const rgw = view.getUint16(d + 10, false);
      const fg  = view.getUint16(d + 12, false);
      const nvg = view.getUint16(d + 14, false);
      const vgw = view.getUint16(d + 16, false);
      const nyq = view.getInt16( d + 60, false);
      console.log(`[L2] MSG1 az=${azimuth.toFixed(1)}° elev=${elevNum} refPtr=${refPtr} velPtr=${velPtr} nRef=${nrg} refGW=${rgw}m firstG=${fg}m nVel=${nvg} velGW=${vgw}m nyq=${(nyq/100).toFixed(1)}m/s`);
    }

    if (refPtr > 0 && msgStart + refPtr < slice.length) {
      const refOffset   = msgStart + refPtr;
      const numRefGates = view.getUint16(d + 8,  false);
      const refGateSize = view.getUint16(d + 10, false);
      const firstGate   = view.getUint16(d + 12, false);

      const refData = new Float32Array(numRefGates);
      for (let i = 0; i < numRefGates; i++) {
        const raw = slice[refOffset + i];
        refData[i] = raw === 0 || raw === 1 ? NaN : (raw - 66.0) / 2.0;
      }
      this._addRadial('reflectivity', azimuth, refData, firstGate, refGateSize, elevNum);

      if (this.siteLat === null) {
        const lat = view.getInt32(d + 48, false) / 1000.0;
        const lon = view.getInt32(d + 52, false) / 1000.0;
        if (lat !== 0 && Math.abs(lat) <= 90) {
          this.siteLat = lat;
          this.siteLon = lon;
        }
      }
    }

    if (velPtr > 0 && msgStart + velPtr < slice.length) {
      const velOffset   = msgStart + velPtr;
      const numVelGates = view.getUint16(d + 14, false);
      const velGateSize = view.getUint16(d + 16, false);
      const firstGate   = view.getUint16(d + 18, false);
      const nyquist     = view.getInt16( d + 60, false) / 100.0;

      const velData = new Float32Array(numVelGates);
      for (let i = 0; i < numVelGates; i++) {
        const raw = slice[velOffset + i];
        if (raw === 0 || raw === 1) {
          velData[i] = NaN;
        } else {
          velData[i] = (raw - 129.0) / 2.0;
        }
      }
      this._addRadial('velocity', azimuth, velData, firstGate, velGateSize, elevNum);
    }
  }


  _parseType31(slice, view, msgStart) {
    if (slice.length < msgStart + 60) return;

    const o = msgStart + 28; // message payload start

    const collectionMs = view.getUint32(o + 4,  false);
    const julianDay    = view.getUint16(o + 8,  false);
    const azRaw        = view.getUint16(o + 12, false);
    const azimuth      = azRaw * (360.0 / 65536.0);
    const numBlocks    = view.getUint16(o + 28, false);
    this._currentElevNum = view.getUint16(o + 20, false); // elevation number

    const scanTime = this._julianToDate(julianDay, collectionMs);
    if (!this.scanTime) this.scanTime = scanTime;

    // Block pointers (4 bytes each, relative to start of message payload)
    for (let bi = 0; bi < numBlocks && bi < 10; bi++) {
      const ptrOffset = o + 30 + bi * 4;
      if (ptrOffset + 4 > slice.length) break;
      const blockPtr = view.getUint32(ptrOffset, false);
      const blockAbs = msgStart + blockPtr;
      if (blockAbs + 4 > slice.length) continue;

      // Block ID is a 1-char type + 2-char name = 3 ASCII bytes
      const blockType = String.fromCharCode(slice[blockAbs]);
      const blockName = String.fromCharCode(slice[blockAbs + 1], slice[blockAbs + 2]);
      const blockName3 = String.fromCharCode(slice[blockAbs + 1], slice[blockAbs + 2], slice[blockAbs + 3]);

      if (!this._loggedBlocks && bi === 0) {
        // Log block layout on first radial to aid debugging
        const allBlocks = [];
        for (let _bi = 0; _bi < numBlocks && _bi < 10; _bi++) {
          const _pOff = o + 30 + _bi * 4;
          if (_pOff + 4 > slice.length) break;
          const _ptr = view.getUint32(_pOff, false);
          const _abs = msgStart + _ptr;
          if (_abs + 4 > slice.length) { allBlocks.push(`[${_bi}:OOB ptr=${_ptr}]`); continue; }
          const _t = String.fromCharCode(slice[_abs]);
          const _n = String.fromCharCode(slice[_abs+1],slice[_abs+2],slice[_abs+3]).replace(/ /g,'');
          allBlocks.push(`${_t}/${_n}@${_ptr}`);
        }
        console.log(`[L2] MSG31 blocks (first radial): ${allBlocks.join(', ')}`);
        this._loggedBlocks = true;
      }

      if (blockType === 'R') {
        if (blockName === 'VOL') {
          this._parseVolBlock(slice, view, blockAbs);
        }
      } else if (blockType === 'D') {
        this._parseDataBlock31(slice, view, blockAbs, azimuth);
      }
    }
  }

  _parseVolBlock(slice, view, abs) {
    if (abs + 20 > slice.length) return;
    const lat = view.getFloat32(abs + 8,  false);
    const lon = view.getFloat32(abs + 12, false);
    if (this.siteLat === null && lat !== 0) {
      this.siteLat = lat;
      this.siteLon = lon;
    }
  }

  _parseDataBlock31(slice, view, abs, azimuth) {
    if (abs + 28 > slice.length) return;

    const name      = String.fromCharCode(slice[abs+1], slice[abs+2], slice[abs+3]).replace(/\0/g, '').trim();
    const numGates  = view.getUint16(abs + 8,  false);
    const firstGate = view.getUint16(abs + 10, false); // metres
    const gateSize  = view.getUint16(abs + 12, false); // metres
    const wordSize  = slice[abs + 19]; // bits
    const scale     = view.getFloat32(abs + 20, false);
    const offset    = view.getFloat32(abs + 24, false);

    if (numGates === 0 || abs + 28 + numGates * (wordSize / 8) > slice.length) return;

    const fieldData = new Float32Array(numGates);
    const bytesPerGate = wordSize === 16 ? 2 : 1;

    for (let g = 0; g < numGates; g++) {
      const dataAbs = abs + 28 + g * bytesPerGate;
      let raw;
      if (wordSize === 16) {
        raw = view.getUint16(dataAbs, false);
      } else {
        raw = slice[dataAbs];
      }
      // 0 = below SNR, 1 = range folded → no data
      if (raw <= 1) {
        fieldData[g] = NaN;
      } else {
        fieldData[g] = (raw - offset) / scale;
      }
    }

    // Normalise field name to internal convention
    const normalised = this._normaliseFieldName(name);
    if (normalised) {
      const elevNum31 = this._currentElevNum || 0;
      this._addRadial(normalised, azimuth, fieldData, firstGate, gateSize, elevNum31);
    }
  }

  _normaliseFieldName(name) {
    const map = {
      REF: 'reflectivity', DBZ: 'reflectivity',
      VEL: 'velocity',     VR:  'velocity',
      SW:  'spectrum_width',
      ZDR: 'differential_reflectivity',
      PHI: 'differential_phase',
      RHO: 'cc', CC: 'cc',
      CFP: 'clutter_filter_power_removed',
    };
    return map[name.toUpperCase()] ?? null;
  }

  _addRadial(field, azimuth, data, firstGate, gateSize, elevNum = 0) {
    if (!this.sweeps[field]) this.sweeps[field] = [];
    this.sweeps[field].push({ azimuth, data, firstGate, gateSize, elevNum });
  }

  _julianToDate(julianDay, msOfDay) {
    // NEXRAD Julian day 1 = 1 Jan 1970
    const epochMs = (julianDay - 1) * 86400000 + msOfDay;
    return new Date(epochMs);
  }

  getAvailableElevations(field) {
    const radials = this.sweeps[field];
    if (!radials || radials.length === 0) return [];

    const elevGroups = new Map();
    for (const r of radials) {
      const e = r.elevNum || 0;
      if (!elevGroups.has(e)) elevGroups.set(e, []);
      elevGroups.get(e).push(r);
    }

    // Return sorted array of { elevNum, radialCount } for UI display
    return [...elevGroups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([elevNum, radials]) => ({ elevNum, radialCount: radials.length }));
  }

  getSweep(field, requestedElevNum = null) {
    const radials = this.sweeps[field];
    if (!radials || radials.length === 0) return null;

    // Group by elevation number
    const elevGroups = new Map();
    for (const r of radials) {
      const e = r.elevNum || 0;
      if (!elevGroups.has(e)) elevGroups.set(e, []);
      elevGroups.get(e).push(r);
    }

    let bestElev = null;

    // If a specific elevation is requested, use it if available
    if (requestedElevNum !== null && elevGroups.has(requestedElevNum)) {
      bestElev = requestedElevNum;
    } else {
      // Auto-select: pick the lowest elevation with the most radials
      const sortedElevs = [...elevGroups.keys()].sort((a, b) => a - b);
      bestElev = sortedElevs[0];
      for (const e of sortedElevs) {
        if (elevGroups.get(e).length >= 180) { bestElev = e; break; }
      }
      // Among groups with similar radial counts, prefer lowest elevation
      let maxCount = 0;
      for (const [e, g] of elevGroups) {
        if (g.length > maxCount) { maxCount = g.length; bestElev = e; }
      }
      // Re-pick: lowest elevation that has at least 80% of the max count
      for (const e of sortedElevs) {
        if (elevGroups.get(e).length >= maxCount * 0.8) { bestElev = e; break; }
      }
    }

    // Log elevation group info
    const elevInfo = [...elevGroups.entries()].sort((a,b)=>a[0]-b[0]).map(([e,g])=>`elev${e}:${g.length}`).join(' ');
    console.log(`[nexrad] getSweep(${field}): ${elevInfo} → bestElev=${bestElev} (${elevGroups.get(bestElev).length} radials)`);
    const elevRadials = elevGroups.get(bestElev);

    // Sort by azimuth
    elevRadials.sort((a, b) => a.azimuth - b.azimuth);

    // Prefer super-resolution (250m gates) within this elevation
    const bySuperRes = elevRadials.filter(r => r.gateSize <= 300);
    const chosen = bySuperRes.length >= elevRadials.length * 0.5 ? bySuperRes : elevRadials;

    const numGates  = chosen.reduce((mx, r) => Math.max(mx, r.data.length), 0);
    const firstGate = chosen[0].firstGate;
    const gateSize  = chosen[0].gateSize;
    const azimuths  = chosen.map(r => r.azimuth);

    // Pack into a single 2D Float32Array (radials × gates)
    const packed = new Float32Array(chosen.length * numGates);
    packed.fill(NaN);
    for (let ri = 0; ri < chosen.length; ri++) {
      const src = chosen[ri].data;
      const offset = ri * numGates;
      for (let g = 0; g < src.length; g++) {
        packed[offset + g] = src[g];
      }
    }

    return { azimuths, data: packed, firstGateRange: firstGate, gateWidth: gateSize, numGates, numRadials: chosen.length };
  }

  availableFields() {
    return Object.keys(this.sweeps);
  }
}

//

class Level3Parser {
  constructor(raw, product) {
    this.raw      = raw;
    this.product  = product;
    this.view     = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    this.siteLat  = null;
    this.siteLon  = null;
    this.scanTime = null;
    this.stormSpeed     = null;
    this.stormDirection = null;
  }

  parse() {
    const msgOffset = this._findMessageOffset();
    console.log(`[L3] msgOffset=${msgOffset}, fileLen=${this.raw.length}`);

    const v = this.view;

    const msgCode  = v.getInt16(msgOffset,     false);
    const julianDay= v.getUint16(msgOffset + 2, false);
    const secOfDay = v.getUint32(msgOffset + 4, false);
    console.log(`[L3] msgCode=${msgCode}, julianDay=${julianDay}, secOfDay=${secOfDay}`);

    this.scanTime = new Date((julianDay - 1) * 86400000 + secOfDay * 1000);

    const pdb = msgOffset + 18;
    if (pdb + 102 > this.raw.length) throw new Error('Level III file too short for PDB');

    this.siteLat = v.getInt32(pdb + 2, false) * 0.001;
    this.siteLon = v.getInt32(pdb + 6, false) * 0.001;

    this.stormSpeed     = v.getInt16(pdb + 98,  false) / 10.0 * 0.514444;
    this.stormDirection = v.getInt16(pdb + 100, false) / 10.0;

    // Threshold halfwords for digital products (halfwords 31-33, byte offsets 60-64 from PDB).
    // thr1 = min level code (*0.1 = dBZ), thr2 = increment per level (*0.1 dBZ).
    // Standard reflectivity (product 94/153/N0B/NZB): thr1=-320, thr2=5 -> value=-32.0+(raw-2)*0.5
    this.thr1 = v.getInt16(pdb + 60, false); // halfword 31
    this.thr2 = v.getInt16(pdb + 62, false); // halfword 32

    // Try pdb+86 first (standard ICD layout), then pdb+90 (NZB/newer products).
    // Validate: symAbs must be within file bounds and > header size.
    let symOffsetHW = v.getInt32(pdb + 86, false);
    {
      const testAbs = msgOffset + symOffsetHW * 2;
      if (symOffsetHW <= 0 || testAbs < 120 || testAbs + 10 > this.raw.length) {
        const alt = v.getInt32(pdb + 90, false);
        const altAbs = msgOffset + alt * 2;
        if (alt > 0 && altAbs >= 120 && altAbs + 10 <= this.raw.length) {
          console.log(`[L3] pdb+86 invalid (${symOffsetHW}), using pdb+90 (${alt})`);
          symOffsetHW = alt;
        }
      }
    }
    console.log(`[L3] siteLat=${this.siteLat}, siteLon=${this.siteLon}, symOffsetHW=${symOffsetHW}`);

    if (symOffsetHW > 0) {
      // Try msg-relative first (per ICD), then file-relative
      const candidates = [
        msgOffset + symOffsetHW * 2,
        symOffsetHW * 2,
      ];
      for (const symAbs of candidates) {
        if (symAbs < 0 || symAbs + 4 > this.raw.length) continue;
        console.log(`[L3] trying symAbs=${symAbs}`);

        const firstByte = this.raw[symAbs];
        const nextByte  = this.raw[symAbs + 1];

        // BZip2-compressed symbology block (NZB/N0B products)
        // Data starts directly with BZh magic, no -1/blockId wrapper
        if (firstByte === 0x42 && nextByte === 0x5A) {
          console.log('[L3] BZip2-compressed symbology block detected, decompressing');
          return this._parseCompressedSymbologyBlock(symAbs);
        }

        // Standard uncompressed symbology block
        if (v.getInt16(symAbs, false) === -1) {
          return this._parseSymbologyBlock(symAbs);
        }
      }
      console.log('[L3] computed offsets did not find valid block, scanning');
    }

    // Full-file scan for standard symbology block header pattern
    const scanned = this._scanForSymbologyBlock(0, this.raw.length);
    if (scanned) return scanned;

    // Last resort: scan for BZip2 magic anywhere in file
    const compressed = this._scanForCompressedBlock();
    if (compressed) return compressed;

    throw new Error('No radial data found in Level III file');
  }

  _findMessageOffset() {
    const v   = this.view;
    const raw = this.raw;
    const limit = Math.min(512, raw.length - 40);

    for (let i = 0; i < limit; i++) {
      // PDB divider (-1) is at msgOffset+18
      if (v.getInt16(i + 18, false) !== -1) continue;
      const msgCode = v.getInt16(i, false);
      if (msgCode > 0 && msgCode < 300) {
        console.log(`[L3] _findMessageOffset: found msgCode=${msgCode} at i=${i}`);
        return i;
      }
    }

    // Hard fallback: scan for \r\r\n (end of last text header line) then skip it
    for (let i = 0; i < limit; i++) {
      if (raw[i] === 0x0D && raw[i+1] === 0x0D && raw[i+2] === 0x0A) {
        const candidate = i + 3;
        const msgCode = v.getInt16(candidate, false);
        if (msgCode > 0 && msgCode < 300) return candidate;
      }
    }

    console.warn('[L3] _findMessageOffset: defaulting to 0');
    return 0;
  }

  _parseSymbologyBlock(abs) {
    const v   = this.view;
    const raw = this.raw;

    if (abs + 10 > raw.length) throw new Error(`Symbology block truncated at ${abs}`);

    const divider  = v.getInt16(abs,     false);
    const blockId  = v.getInt16(abs + 2, false);
    const blockLen = v.getUint32(abs + 4, false);
    const numLayers= v.getUint16(abs + 8, false);

    console.log(`[L3] symbology: divider=${divider}, blockId=${blockId}, blockLen=${blockLen}, numLayers=${numLayers}`);

    if (divider !== -1) {
      console.log(`[L3] divider mismatch at abs=${abs}, running full scan`);
      const result = this._scanForSymbologyBlock(0, this.raw.length);
      if (result) return result;
      throw new Error(`Level III symbology block divider mismatch (got ${divider} at abs=${abs})`);
    }

    let layerOffset = abs + 10;
    for (let li = 0; li < numLayers && li < 10; li++) {
      if (layerOffset + 6 > raw.length) break;

      const layerDiv = v.getInt16(layerOffset, false);
      const layerLen = v.getUint32(layerOffset + 2, false);
      console.log(`[L3] layer ${li}: div=${layerDiv}, len=${layerLen}, offset=${layerOffset}`);

      const dataStart = layerOffset + 6;
      const dataEnd   = Math.min(dataStart + layerLen, raw.length);

      // Walk packets within the layer
      let pktOffset = dataStart;
      while (pktOffset + 2 <= dataEnd) {
        // Null padding marks end of real packet data — stop scanning
        if (this.view.getUint16(pktOffset, false) === 0) break;

        const result = this._tryParsePacket(pktOffset, dataEnd);
        if (result) return result;

        pktOffset = this._nextPacketOffset(pktOffset, dataEnd);
        if (pktOffset < 0) break;
      }

      layerOffset += 6 + layerLen;
    }

    throw new Error('No radial data found in Level III symbology block');
  }

  // Try to parse a recognised radial packet starting at `start`.
  // Returns parsed sweep object or null.
  _tryParsePacket(start, end) {
    if (start + 2 > this.raw.length) return null;
    const packetCode = this.view.getUint16(start, false);

    if (packetCode === 0xAF1F) return this._parseRadialPacketAF1F(start);
    if (packetCode === 16)     return this._parseRadialPacket16(start);
    if (packetCode === 28)     return this._parseGenericRadialPacket(start);

    if (packetCode !== 0) console.log(`[L3] skipping unrecognised packet code=0x${packetCode.toString(16)} at offset=${start}`);
    return null;
  }

  // Advance past a packet to find the start of the next one.
  // Returns new offset, or -1 if we can't advance.
  _nextPacketOffset(start, end) {
    if (start + 2 > this.raw.length) return -1;
    const v = this.view;
    const packetCode = v.getUint16(start, false);

    if (packetCode === 0xAF1F || packetCode === 16) {
      // Fixed header 14 bytes, then radials each with: uint16 numBytes, int16 startAngle, int16 deltaAngle, then numBytes of data
      if (start + 14 > this.raw.length) return -1;
      const numRadials = v.getUint16(start + 12, false);
      let off = start + 14;
      for (let ri = 0; ri < numRadials; ri++) {
        if (off + 6 > this.raw.length) return -1;
        const numBytes = packetCode === 0xAF1F
          ? v.getUint16(off, false) * 2   // AF1F: numHW half-words → bytes
          : v.getUint16(off, false);       // pkt16: numBytes directly
        off += 6 + numBytes;
      }
      return off;
    }

    if (packetCode === 28) {
      // Packet 28: bytes 4-7 = packet size
      if (start + 8 > this.raw.length) return -1;
      const pktSize = v.getUint32(start + 4, false);
      return start + 8 + pktSize;
    }

    // Unknown packet — scan byte-by-byte (slow but safe)
    return start + 2;
  }

  _parseCompressedSymbologyBlock(bzipStart) {
    // Decompress the BZip2 stream, then parse the resulting symbology block.
    // NZB/N0B products write the symbology block content directly as BZip2
    // with no -1/blockId wrapper — the decompressed bytes start with -1.
    const compressed = this.raw.subarray(bzipStart);
    let decompressed;
    try {
      decompressed = BZip2.decompress(compressed);
    } catch (e) {
      throw new Error(`BZip2 decompression failed: ${e.message}`);
    }
    console.log(`[L3] decompressed ${compressed.length} → ${decompressed.length} bytes`);

    // The decompressed data IS the symbology block (starts with -1 divider)
    const dv = new DataView(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength);
    const divider = dv.getInt16(0, false);
    console.log(`[L3] decompressed divider=${divider}, bytes[0..7]: ${Array.from(decompressed.subarray(0,8)).map(b=>'0x'+b.toString(16).padStart(2,'0')).join(' ')}`);

    const tempParser = new Level3Parser(decompressed, this.product);

    if (divider === -1) {
      return tempParser._parseSymbologyBlock(0);
    }

    // No -1 at byte 0 — scan the decompressed content for the block header,
    // then for packets directly as a fallback
    const scanned = tempParser._scanForSymbologyBlock(0, decompressed.length);
    if (scanned) return scanned;
    return tempParser._scanForRadialPacketDirect();
  }

  _scanForCompressedBlock() {
    const raw = this.raw;
    // Scan for BZip2 magic (BZh) anywhere after the header
    for (let i = 120; i < raw.length - 4; i++) {
      if (raw[i] === 0x42 && raw[i+1] === 0x5A && raw[i+2] === 0x68) {
        console.log(`[L3] found BZip2 magic at i=${i}`);
        return this._parseCompressedSymbologyBlock(i);
      }
    }
    return null;
  }

    _scanForSymbologyBlock(lo = 0, hi = this.raw.length) {
    const v   = this.view;
    const raw = this.raw;
    const end = Math.min(hi - 10, raw.length - 10);

    for (let i = lo; i < end; i++) {
      if (v.getInt16(i,     false) !== -1) continue;
      if (v.getInt16(i + 2, false) !== 1)  continue;
      const numLayers = v.getUint16(i + 8, false);
      if (numLayers < 1 || numLayers > 10) continue;
      console.log(`[L3] _scanForSymbologyBlock: candidate at i=${i}, numLayers=${numLayers}`);
      const result = this._parseSymbologyBlockAt(i);
      if (result) return result;
    }
    return null;
  }

  _parseSymbologyBlockAt(abs) {
    const v   = this.view;
    const raw = this.raw;
    const numLayers = v.getUint16(abs + 8, false);
    let layerOffset = abs + 10;

    for (let li = 0; li < numLayers && li < 10; li++) {
      if (layerOffset + 6 > raw.length) break;
      const layerLen  = v.getUint32(layerOffset + 2, false);
      const dataStart = layerOffset + 6;
      const dataEnd   = Math.min(dataStart + layerLen, raw.length);
      let pktOffset   = dataStart;

      while (pktOffset + 2 <= dataEnd) {
        // Null padding marks end of real packet data — stop scanning
        if (this.view.getUint16(pktOffset, false) === 0) break;
        const result = this._tryParsePacket(pktOffset, dataEnd);
        if (result) return result;
        pktOffset = this._nextPacketOffset(pktOffset, dataEnd);
        if (pktOffset < 0) break;
      }
      layerOffset += 6 + layerLen;
    }
    return null;
  }

  _scanForRadialPacketDirect() {
    const v   = this.view;
    const raw = this.raw;
    // Skip the header area (first 120 bytes from msgOffset is always header)
    const scanStart = 120;
    const end = raw.length - 8;

    for (let i = scanStart; i < end; i += 2) {
      const code = v.getUint16(i, false);

      if (code === 28) {
        // Validate: bytes 4-7 = packet data length, should be > 0 and < fileLen
        if (i + 8 > raw.length) continue;
        const pktLen = v.getUint32(i + 4, false);
        if (pktLen < 24 || pktLen > raw.length) continue;
        console.log(`[L3] direct pkt28 candidate at i=${i}, pktLen=${pktLen}`);
        const result = this._parseGenericRadialPacket(i);
        if (result && result.numRadials > 0 && result.numGates > 0) return result;
      }

      if (code === 0xAF1F || code === 16) {
        // Validate: numBins and numRadials at bytes 4 and 12 should be plausible
        if (i + 14 > raw.length) continue;
        const numBins    = v.getUint16(i + 4,  false);
        const numRadials = v.getUint16(i + 12, false);
        if (numBins < 1 || numBins > 4000) continue;
        if (numRadials < 100 || numRadials > 1000) continue;
        console.log(`[L3] direct pkt${code === 16 ? '16' : '0xAF1F'} candidate at i=${i}, numBins=${numBins}, numRadials=${numRadials}`);
        const result = code === 16 ? this._parseRadialPacket16(i) : this._parseRadialPacketAF1F(i);
        if (result && result.numRadials > 0) return result;
      }
    }
    return null;
  }

    _parseRadialPacketAF1F(start) {
    const v   = this.view;
    const raw = this.raw;

    if (start + 14 > raw.length) return null;

    const firstBin    = v.getInt16( start + 2,  false);
    const numBins     = v.getUint16(start + 4,  false);
    const scaleFactor = v.getInt16( start + 10, false); // pixels per km × 1000 in newer, or just pixels/km
    const numRadials  = v.getUint16(start + 12, false);

    console.log(`[L3] 0xAF1F: firstBin=${firstBin}, numBins=${numBins}, scale=${scaleFactor}, numRadials=${numRadials}`);

    if (numRadials === 0 || numBins === 0) return null;

    // Gate width: scale is stored as 1/1000 km per pixel in modern files
    // but older files use integer km.  Heuristic: if scale > 100, divide by 1000.
    let gateWidthM;
    if (scaleFactor <= 0) {
      gateWidthM = 1000;
    } else if (scaleFactor >= 100) {
      gateWidthM = Math.round((1.0 / (scaleFactor / 1000.0)) * 1000); // metres
    } else {
      gateWidthM = Math.round((1.0 / scaleFactor) * 1000);
    }
    const firstGateM = Math.max(0, firstBin) * gateWidthM;

    const azimuths = new Float32Array(numRadials);
    const packed   = new Float32Array(numRadials * numBins);
    packed.fill(NaN);

    let rOff = start + 14;
    for (let ri = 0; ri < numRadials; ri++) {
      if (rOff + 6 > raw.length) break;
      const numHW      = v.getUint16(rOff,     false);
      const startAngle = v.getInt16( rOff + 2, false) / 10.0;
      // angleDelta unused but keep for doc
      rOff += 6;

      azimuths[ri] = startAngle;

      const numBytes = numHW * 2;
      const radialEnd = Math.min(rOff + numBytes, raw.length);
      const radialBytes = raw.subarray(rOff, radialEnd);
      rOff += numBytes;

      // SupercellWX behavior: AF1F radials can include a trailing 0 pad byte.
      // Dropping it prevents false zero-run artifacts and radial gaps.
      let decodeLen = radialBytes.length;
      if (decodeLen > 0 && radialBytes[decodeLen - 1] === 0) decodeLen--;

      let bin = 0;
      for (let b = 0; b < decodeLen && bin < numBins; b++) {
        const byte  = radialBytes[b];
        // AF1F RLE packing: high nibble = run length, low nibble = level.
        // Keep raw nibble semantics: 0 means no output for this byte.
        const runNibble = (byte >> 4) & 0xF;
        const level = byte & 0xF;
        const count = runNibble;
        for (let c = 0; c < count && bin < numBins; c++, bin++) {
          packed[ri * numBins + bin] = level === 0 ? NaN : level;
        }
      }
    }

    return {
      azimuths:      Array.from(azimuths),
      data:          packed,
      firstGateRange:firstGateM,
      gateWidth:     gateWidthM,
      numGates:      numBins,
      numRadials,
      rawLevels:     true,
      isDigital8bit:  false,  // 4-bit RLE; but thresholds from PDB may apply to SRV/velocity
      thr1:           this.thr1,
      thr2:           this.thr2,
    };
  }

  // Packet 16 — Digital Radial Data Array (ICD 2620001Y)
  // Same 14-byte header as 0xAF1F; per-radial: uint16 numBytes, int16 startAngle×0.1°,
  // int16 deltaAngle×0.1°, then numBytes of direct 8-bit encoded gate values.
  // Values 0=below-threshold, 1=range-folded, 2-255=data (rawLevels=true).
  _parseRadialPacket16(start) {
    const v   = this.view;
    const raw = this.raw;

    if (start + 14 > raw.length) return null;

    const firstBin    = v.getInt16( start + 2,  false);
    const numBins     = v.getUint16(start + 4,  false);
    const scaleFactor = v.getInt16( start + 10, false);
    const numRadials  = v.getUint16(start + 12, false);

    console.log(`[L3] pkt16: firstBin=${firstBin}, numBins=${numBins}, scale=${scaleFactor}, numRadials=${numRadials}`);

    if (numRadials === 0 || numBins === 0) return null;

    // Packet 16 scale_factor is a DISPLAY scale (pixels per km), NOT gate width.
    // Per ICD 2620001Y all digital radial products (94, 153, NZB, N0B) use 250m gates.
    // Derive from numBins: standard ~920 bins = 230km range, super-res ~1840 = 460km.
    // Either way: gate width = 250m. firstBin is a range-bin index at that spacing.
    const gateWidthM  = 250;
    const firstGateM  = Math.max(0, firstBin) * gateWidthM;

    const azimuths = new Float32Array(numRadials);
    const packed   = new Float32Array(numRadials * numBins);
    packed.fill(NaN);

    let rOff = start + 14;
    for (let ri = 0; ri < numRadials; ri++) {
      if (rOff + 6 > raw.length) break;
      const numBytes   = v.getUint16(rOff,     false);
      const startAngle = v.getInt16( rOff + 2, false) / 10.0;
      rOff += 6;

      azimuths[ri] = startAngle;

      const base = ri * numBins;
      for (let g = 0; g < numBytes && g < numBins; g++, rOff++) {
        if (rOff >= raw.length) break;
        const val = raw[rOff];
        packed[base + g] = val <= 1 ? NaN : val;
      }
      // Skip any bytes beyond numBins (radial may be padded to even length)
      if (numBytes > numBins) rOff += numBytes - numBins;
    }

    return {
      azimuths:       Array.from(azimuths),
      data:           packed,
      firstGateRange: firstGateM,
      gateWidth:      gateWidthM,
      numGates:       numBins,
      numRadials,
      rawLevels:      true,
      isDigital8bit:  true,  // 8-bit values 2-255; use thr1/thr2 from PDB
      thr1:           this.thr1,
      thr2:           this.thr2,
    };
  }

  _parseGenericRadialPacket(start) {
    const v   = this.view;
    const raw = this.raw;

    if (start + 8 > raw.length) return null;

    const pktDataLen = v.getUint32(start + 4, false);
    console.log(`[L3] pkt28: pktDataLen=${pktDataLen}, start=${start}`);

    const dataEnd = Math.min(start + 8 + pktDataLen, raw.length);
    let offset = start + 8;

    while (offset + 4 <= dataEnd) {
      const compDesc = v.getUint32(offset, false);
      console.log(`[L3] pkt28 component descriptor=${compDesc} at offset=${offset}`);

      if (compDesc === 1) {
        const result = this._parseGenericRadialComponent(offset, dataEnd);
        if (result) return result;
      }

      // Advance past this component
      if (offset + 8 > dataEnd) break;
      const compLen = v.getUint32(offset + 4, false);
      offset += 8 + compLen;
    }
    return null;
  }

  _parseGenericRadialComponent(start, dataEnd) {
    const v   = this.view;
    const raw = this.raw;

    if (start + 26 > raw.length) return null;

    // Component header
    const compLen   = v.getUint32(start + 4,  false);
    const numGates  = v.getUint16(start + 8,  false);
    // first gate and gate size in × 0.001 km → convert to metres
    const firstGateKm = v.getUint16(start + 10, false) * 0.001;
    const gateSizeKm  = v.getUint16(start + 12, false) * 0.001;
    const numRadials  = v.getUint16(start + 14, false);
    const wordSizeBits= v.getUint16(start + 16, false);
    const scale       = v.getFloat32(start + 18, false);
    const offset_val  = v.getFloat32(start + 22, false);

    const firstGateM = Math.round(firstGateKm * 1000);
    const gateSizeM  = Math.max(1, Math.round(gateSizeKm * 1000));
    const bytesPerGate = Math.max(1, Math.ceil(wordSizeBits / 8));

    console.log(`[L3] pkt28 radial component: numGates=${numGates}, firstGate=${firstGateM}m, gateSize=${gateSizeM}m, numRadials=${numRadials}, wordSize=${wordSizeBits}, scale=${scale}, offset=${offset_val}`);

    if (numGates === 0 || numRadials === 0) return null;

    const azimuths = new Float32Array(numRadials);
    const packed   = new Float32Array(numRadials * numGates);
    packed.fill(NaN);

    // Radial header size = 12 bytes (3 floats)
    const radialHeaderBytes = 12;
    const radialDataBytes   = numGates * bytesPerGate;
    let rOff = start + 26; // skip component header (26 bytes)

    for (let ri = 0; ri < numRadials; ri++) {
      if (rOff + radialHeaderBytes > raw.length) break;
      const azimuth   = v.getFloat32(rOff,     false);
      const azWidth   = v.getFloat32(rOff + 4, false);
      const elevation = v.getFloat32(rOff + 8, false);
      rOff += radialHeaderBytes;
      azimuths[ri] = azimuth;

      const base = ri * numGates;
      for (let g = 0; g < numGates; g++) {
        if (rOff + bytesPerGate > raw.length) break;
        let raw_val;
        if (bytesPerGate === 2) {
          raw_val = v.getUint16(rOff, false);
        } else {
          raw_val = raw[rOff];
        }
        rOff += bytesPerGate;

        // 0 = below threshold / no data, 1 = range folded
        if (raw_val <= 1) {
          packed[base + g] = NaN;
        } else {
          // Physical value = (raw - offset) / scale
          packed[base + g] = (raw_val - offset_val) / scale;
        }
      }
    }

    return {
      azimuths:       Array.from(azimuths),
      data:           packed,
      firstGateRange: firstGateM,
      gateWidth:      gateSizeM,
      numGates,
      numRadials,
      rawLevels:      false, // already decoded to physical values
    };
  }
}

const BZip2 = (() => {
  // BZip2 decompressor — NEXRAD Level II/III use standard BZip2 blocks.
  // Rewritten for correctness and performance:
  //   - Flat array Huffman decode (no tree traversal, no allocations in hot path)
  //   - Typed-array MTF using a fixed 256-byte array with linear scan (fast for small alphabets)
  //   - Pre-allocated output buffer
  //   - Correct RUNA/RUNB accumulation (never reset mid-run)

  class BitReader {
    constructor(u8) {
      this.data = u8;
      this.pos  = 0;
      this.buf  = 0;
      this.bits = 0;
    }
    read(n) {
      let result = 0;
      while (n > 0) {
        if (this.bits === 0) {
          if (this.pos >= this.data.length) throw new Error('BZip2: premature end');
          this.buf  = this.data[this.pos++];
          this.bits = 8;
        }
        const take = n < this.bits ? n : this.bits;
        result = (result << take) | ((this.buf >> (this.bits - take)) & ((1 << take) - 1));
        this.bits -= take;
        n -= take;
      }
      return result >>> 0;
    }
    readBit() {
      if (this.bits === 0) {
        if (this.pos >= this.data.length) throw new Error('BZip2: premature end');
        this.buf  = this.data[this.pos++];
        this.bits = 8;
      }
      return (this.buf >> --this.bits) & 1;
    }
  }

  function buildTrieTable(lengths, alphaSize) {
    let minLen = 32, maxLen = 0;
    for (let i = 0; i < alphaSize; i++) {
      if (!lengths[i]) continue;
      if (lengths[i] < minLen) minLen = lengths[i];
      if (lengths[i] > maxLen) maxLen = lengths[i];
    }

    const blCount = new Int32Array(maxLen + 2);
    for (let i = 0; i < alphaSize; i++) if (lengths[i]) blCount[lengths[i]]++;

    // nextCode[b] = first canonical code of length b
    const nextCode = new Int32Array(maxLen + 2);
    let c = 0;
    for (let b = 1; b <= maxLen; b++) {
      nextCode[b] = c;
      c = (c + blCount[b]) << 1;
    }

    // limit[b] = largest code of length b; base[b] = perm offset - nextCode[b]
    const limit = new Int32Array(maxLen + 2).fill(-1);
    const base  = new Int32Array(maxLen + 2);
    const perm  = new Int32Array(alphaSize);

    let permIdx = 0;
    for (let b = 1; b <= maxLen; b++) {
      if (!blCount[b]) continue;
      limit[b] = nextCode[b] + blCount[b] - 1;
      base[b]  = permIdx - nextCode[b];
      for (let i = 0; i < alphaSize; i++) if (lengths[i] === b) perm[permIdx++] = i;
    }

    return { limit, base, perm, minLen, maxLen };
  }

  // Decode one symbol following bzip2 source (decompress.c GET_MTF_VAL).
  function decodeSym(br, table) {
    const { limit, base, perm, minLen, maxLen } = table;
    let zvec = 0;
    for (let i = 0; i < minLen; i++) zvec = (zvec << 1) | br.readBit();
    let zn = minLen;
    while (zvec > limit[zn]) {
      if (++zn > maxLen) throw new Error('BZip2: symbol not found');
      zvec = (zvec << 1) | br.readBit();
    }
    return perm[base[zn] + zvec];
  }

  function decompress(compressed) {
    const br = new BitReader(compressed);

    if (br.read(8) !== 0x42 || br.read(8) !== 0x5A || br.read(8) !== 0x68)
      throw new Error('BZip2: invalid magic');
    const blockSize100k = br.read(8) - 0x30;
    if (blockSize100k < 1 || blockSize100k > 9) throw new Error('BZip2: bad block size');

    const chunks = [];
    let totalLen = 0;

    while (true) {
      const magic1 = br.read(32);
      const magic2 = br.read(16);

      if (magic1 === 0x17724538 && magic2 === 0x5090) break; // EOS

      if (magic1 !== 0x31415926 || magic2 !== 0x5359)
        throw new Error(`BZip2: bad block magic 0x${magic1.toString(16)}${magic2.toString(16)}`);

      const block = decompressBlock(br, blockSize100k);
      chunks.push(block);
      totalLen += block.length;
    }

    const out = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  }

  function decompressBlock(br, blockSize100k) {
    br.read(32); // block CRC (skip)
    const randomised = br.readBit();
    const origPointer = br.read(24);

    // Symbol map
    const inUse16 = br.read(16);
    const inUse = new Uint8Array(256);
    for (let i = 0; i < 16; i++) {
      if (!((inUse16 >> (15 - i)) & 1)) continue;
      const row = br.read(16);
      for (let j = 0; j < 16; j++) {
        if ((row >> (15 - j)) & 1) inUse[i * 16 + j] = 1;
      }
    }
    const symMap = []; // symMap[mtf_index] = actual byte value
    for (let i = 0; i < 256; i++) if (inUse[i]) symMap.push(i);
    const alphaSize = symMap.length + 2; // RUNA(0), RUNB(1), sym0..symN-2(2..N), EOB(N+1)

    // Huffman trees
    const numTrees = br.read(3);
    const numSelectors = br.read(15);

    // Read selector list (MTF-encoded)
    const selList = new Uint8Array(numSelectors);
    for (let i = 0; i < numSelectors; i++) {
      let v = 0;
      while (br.readBit()) v++;
      selList[i] = v;
    }

    // MTF-decode selectors
    const selMtf = new Uint8Array(numTrees);
    for (let i = 0; i < numTrees; i++) selMtf[i] = i;
    const selectors = new Uint8Array(numSelectors);
    for (let i = 0; i < numSelectors; i++) {
      const v = selList[i];
      const s = selMtf[v];
      for (let j = v; j > 0; j--) selMtf[j] = selMtf[j - 1];
      selMtf[0] = s;
      selectors[i] = s;
    }

    // Read Huffman code lengths
    const codeLens = [];
    for (let t = 0; t < numTrees; t++) {
      let l = br.read(5);
      const lens = new Uint8Array(alphaSize);
      for (let i = 0; i < alphaSize; i++) {
        while (true) {
          if (!br.readBit()) break;
          l += br.readBit() ? -1 : 1;
          if (l < 1 || l > 20) throw new Error('BZip2: code length out of range');
        }
        lens[i] = l;
      }
      codeLens.push(lens);
    }

    const trees = codeLens.map(lens => buildTrieTable(lens, alphaSize));

    // Decode BWT data
    const blockMax = blockSize100k * 100000 + 10;
    const tt = new Uint32Array(blockMax);
    let nblock = 0;

    const GROUP_SIZE = 50;
    let groupNo = -1, groupPos = 0;
    let currentTable = trees[selectors[0]];

    // MTF state: use a typed array for O(n) but cache-friendly moves
    const mtf = new Uint16Array(alphaSize);
    for (let i = 0; i < alphaSize; i++) mtf[i] = i;

    let runLen = 0, runWeight = 1;

    while (true) {
      // Switch Huffman tree every GROUP_SIZE symbols
      if (groupPos === 0) {
        groupNo++;
        groupPos = GROUP_SIZE;
        currentTable = trees[selectors[Math.min(groupNo, numSelectors - 1)]];
      }
      groupPos--;

      const sym = decodeSym(br, currentTable);
      const EOB = alphaSize - 1;

      if (sym === EOB) {
        // Flush any pending run
        if (runLen > 0) {
          const byte = symMap[mtf[0]];
          for (let r = 0; r < runLen && nblock < blockMax; r++) tt[nblock++] = byte;
          runLen = 0; runWeight = 1;
        }
        break;
      }

      if (sym === 0 || sym === 1) {
        // RUNA (0) or RUNB (1): accumulate run of the current MTF[0] symbol
        if (sym === 0) runLen += runWeight;
        else           runLen += 2 * runWeight;
        runWeight <<= 1;
        continue;
      }

      // Non-run symbol: flush any pending run first
      if (runLen > 0) {
        const byte = symMap[mtf[0]];
        for (let r = 0; r < runLen && nblock < blockMax; r++) tt[nblock++] = byte;
        runLen = 0; runWeight = 1;
      }

      // MTF decode: sym 0/1 = RUNA/RUNB, sym 2+ = MTF index sym-1
      // Per bzip2 decompress.c: s = nextSym - 1 (not nextSym - 2)
      const mtfIdx = sym - 1;
      const val    = mtf[mtfIdx];
      // Shift mtf[0..mtfIdx-1] right by 1
      for (let j = mtfIdx; j > 0; j--) mtf[j] = mtf[j - 1];
      mtf[0] = val;

      if (nblock < blockMax) tt[nblock++] = symMap[val];
    }

    return inverseBWT(tt, nblock, origPointer);
  }

  function inverseBWT(tt, n, origPointer) {
    const counts = new Uint32Array(256);
    for (let i = 0; i < n; i++) counts[tt[i] & 0xFF]++;
    const starts = new Uint32Array(256);
    for (let i = 1; i < 256; i++) starts[i] = starts[i - 1] + counts[i - 1];

    // Build linked-list permutation in-place using high 24 bits of tt
    // Must mask tt[i] & 0xFF since earlier iterations may have already packed high bits
    const base = new Uint32Array(256);
    base.set(starts);
    for (let i = 0; i < n; i++) {
      const c = tt[i] & 0xFF;
      tt[base[c]++] |= (i << 8); // store next-index in high bits
    }

    // Walk the LF-mapping and apply bzip2's second-level byte RLE decoding.
    // bzip2 pre-encodes runs of 4+ identical bytes before BWT: 4x byte, then count byte.
    // (count=0 means exactly 4; count=N means 4+N copies.)
    // Matches the `run++ == 3` logic in unbzip2-stream / micro-bunzip.
    const out = [];
    let idx = tt[origPointer] >> 8;
    let run = -1, previous = -1;
    for (let i = 0; i < n; i++) {
      const current = tt[idx] & 0xFF;
      idx = tt[idx] >> 8;

      if (run++ === 3) {
        // 5th position in a run: current IS the extra-copies count byte
        for (let k = 0; k < current; k++) out.push(previous);
        run = 0;
        previous = -1;
      } else {
        out.push(current);
        if (current !== previous) { run = 0; previous = current; }
      }
    }
    return new Uint8Array(out);
  }

  return { decompress };
})();


const PRODUCT_CONFIG = {
  reflectivity: { vmin: -20.0, vmax: 80.0,  minVal: 5.0,  applyMin: true  },
  velocity:     { vmin: -80.0, vmax: 80.0,  minVal: null, applyMin: false },
  nrot:         { vmin: 0.0,   vmax: 80.0,  minVal: null, applyMin: false },
  srv:          { vmin: -80.0, vmax: 80.0,  minVal: null, applyMin: false },
  cc:           { vmin: 0.28,  vmax: 1.05,  minVal: 0.28, applyMin: true  },
  classification:{ vmin: 0.0,  vmax: 160.0, minVal: null, applyMin: false },
};

function quantise(data, vmin, vmax, applyMin, minVal) {
  const out = new Uint8Array(data.length);
  const range = vmax - vmin;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (isNaN(v) || (applyMin && minVal !== null && v < minVal)) {
      out[i] = 255;
    } else {
      const norm = (v - vmin) / range;
      out[i] = Math.max(0, Math.min(254, Math.round(norm * 254)));
    }
  }
  return out;
}

function speckleFilter(quantised, numRadials, numGates) {
  const hasData = new Uint8Array(quantised.length);
  for (let i = 0; i < quantised.length; i++) hasData[i] = quantised[i] !== 255 ? 1 : 0;

  let removed = 0;
  for (let ri = 0; ri < numRadials; ri++) {
    for (let gi = 1; gi < numGates - 1; gi++) {
      const idx = ri * numGates + gi;
      if (!hasData[idx]) continue;

      const prevRange = gi > 0             ? hasData[idx - 1] : 1;
      const nextRange = gi < numGates - 1  ? hasData[idx + 1] : 1;
      const prevAz    = ri > 0             ? hasData[(ri-1)*numGates+gi] : 1;
      const nextAz    = ri < numRadials-1  ? hasData[(ri+1)*numGates+gi] : 1;

      if (!prevRange && !nextRange && !prevAz && !nextAz) {
        quantised[idx] = 255;
        removed++;
      }
    }
  }
  if (removed > 0) console.log(`[nexrad] Speckle filter removed ${removed} isolated gates`);
  return quantised;
}

function parseLevel3StormMotion(data) {
  if (data.length < 110) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const offsetsToTry = [0];
  let pos = 0;
  while (true) {
    const idx = data.indexOf ? findBytes(data, [0x0D, 0x0D, 0x0A], pos) : -1;
    if (idx === -1 || idx > 200) break;
    offsetsToTry.push(idx + 3);
    pos = idx + 1;
  }

  for (const offset of offsetsToTry) {
    if (offset + 104 > data.length) continue;
    const msgCode = view.getInt16(offset, false);
    if (msgCode !== 56) continue;
    const divider = view.getInt16(offset + 18, false);
    if (divider !== -1) continue;
    const dep8 = view.getInt16(offset + 100, false);
    const dep9 = view.getInt16(offset + 102, false);
    if (dep8 === 0 && dep9 === 0) return null;
    // Dependent values encode meteorological storm-motion direction (FROM).
    // Convert to vector direction (TO) for radial projection math.
    const fromDirDeg = dep9 / 10.0;
    const toDirDeg = (fromDirDeg + 180.0) % 360.0;
    return { speedMs: (dep8 / 10.0) * 0.514444, directionDeg: toDirDeg };
  }
  return null;
}

function findBytes(arr, seq, start = 0) {
  for (let i = start; i <= arr.length - seq.length; i++) {
    let found = true;
    for (let j = 0; j < seq.length; j++) {
      if (arr[i + j] !== seq[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

const FIELD_CANDIDATES = {
  reflectivity:   ['reflectivity', 'DBZ', 'REF', 'base_reflectivity'],
  velocity:       ['velocity', 'VEL', 'VR', 'corrected_velocity'],
  nrot:           ['velocity', 'VEL', 'VR', 'corrected_velocity'],
  srv:            ['storm_relative_velocity', 'SRV', 'SRM', 'velocity', 'VEL'],
  cc:             ['cc', 'cross_correlation_ratio', 'RHOHV', 'RHO'],
  classification: ['radar_echo_classification', 'hydrometeor_classification', 'HCLASS', 'EC'],
};

function pickField(availableFields, product) {
  const candidates = FIELD_CANDIDATES[product] || FIELD_CANDIDATES.reflectivity;
  for (const c of candidates) {
    if (availableFields.includes(c)) return c;
  }
  return null;
}

function normalizeTdwrRange(sweep, site, product) {
  if (!isTdwrSite(site) || !sweep || !sweep.numGates) return sweep;

  let targetRange = null;
  if (product === 'reflectivity') targetRange = 460000;
  else if (product === 'velocity') targetRange = 300000;

  if (!targetRange) return sweep;

  const gateWidth = targetRange / sweep.numGates;
  return {
    ...sweep,
    firstGateRange: 0,
    gateWidth,
  };
}

class NexradClient {
  constructor(options = {}) {
    this._cache    = new Map(); // site → { key, sweeps, time }
    this._ttlMs    = (options.cacheTtlSeconds || 120) * 1000;
  }

  async getSweep(site, product = 'reflectivity', options = {}) {
    site    = normalizeSite(site);
    product = resolveProductName(product);

    // Routing:
    //   classification → always Level III (no Level II equivalent)
    //   reflectivity   → Level III unless level=2 (BR mode)
    //   velocity       → Level III when level=3 (SR), Level II otherwise
    //   nrot           → derived azimuthal-shear magnitude from velocity
    //   srv            → synthesized Level III SRV from N0G + N0S storm motion
    //   cc             → Level III when level=3 (dual-pol CC), Level II otherwise
    const level = options.level || null;
    if (product === 'srv') {
      return this._getSweepSrvSuperRes(site, options.force);
    }
    if (product === 'nrot') {
      return this._getSweepNrot(site, level, options.force);
    }
    const alwaysLevel3 = product === 'classification';
    const velocityPrefersLevel3 = product === 'velocity' && level === 3;
    const ccPrefersLevel3 = product === 'cc' && level === 3;
    const useLevel3 = alwaysLevel3 || velocityPrefersLevel3 || ccPrefersLevel3 || (isLevel3Request(product) && level !== 2);
    if (useLevel3) {
      try {
        return await this._getSweepLevel3(site, product, options.force);
      } catch (err) {
        const canFallbackToL2 = product === 'reflectivity' || product === 'velocity' || product === 'cc';
        if (canFallbackToL2 && product !== 'classification') {
          console.warn(`[nexrad] Level III ${product} failed for ${site}, falling back to Level II (${err.message})`);
          return this._getSweepLevel2(site, product, options.force);
        }
        throw err;
      }
    }
    return this._getSweepLevel2(site, product, options.force);
  }

  _deriveNrotFromVelocitySweep(velSweep) {
    const cfg = PRODUCT_CONFIG.nrot;
    const vmin = Number.isFinite(velSweep.vmin) ? velSweep.vmin : PRODUCT_CONFIG.velocity.vmin;
    const vmax = Number.isFinite(velSweep.vmax) ? velSweep.vmax : PRODUCT_CONFIG.velocity.vmax;
    const vrange = vmax - vmin || 160;

    const velQ = this._decodeBase64ToUint8(velSweep.data);
    const numRadials = velSweep.numRadials;
    const numGates = velSweep.numGates;
    const out = new Float32Array(velQ.length);

    for (let r = 0; r < numRadials; r++) {
      const rPrev = (r - 1 + numRadials) % numRadials;
      const rNext = (r + 1) % numRadials;
      for (let g = 0; g < numGates; g++) {
        const idx = r * numGates + g;
        const q = velQ[idx];
        if (q === 255) { out[idx] = NaN; continue; }

        const qPrev = velQ[rPrev * numGates + g];
        const qNext = velQ[rNext * numGates + g];

        if (qPrev === 255 || qNext === 255) {
          out[idx] = NaN;
          continue;
        }

        const vPrev = vmin + (qPrev / 254.0) * vrange;
        const vNext = vmin + (qNext / 254.0) * vrange;

        // Simple azimuthal shear proxy (m/s), absolute for normalized rotation display.
        out[idx] = Math.abs(vNext - vPrev) * 0.5;
      }
    }

    const outQ = quantise(out, cfg.vmin, cfg.vmax, cfg.applyMin, cfg.minVal);
    return {
      ...velSweep,
      product: 'nrot',
      vmin: cfg.vmin,
      vmax: cfg.vmax,
      data: uint8ToBase64(outQ),
    };
  }

  async _getSweepNrot(site, level, force = false) {
    const useLevel3Vel = Number(level) === 3;
    const velSweep = useLevel3Vel
      ? await this._getSweepLevel3Internal(site, 'velocity', force)
      : await this._getSweepLevel2(site, 'velocity', force);
    return this._deriveNrotFromVelocitySweep(velSweep);
  }

  async _getSweepLevel2(site, product, force = false) {
    const cached = this._cache.get(site);
    const now    = Date.now();

    let rawData, key;

    if (!force && cached && (now - cached.time) < this._ttlMs) {
      rawData = cached.raw;
      key     = cached.key;
    } else {
      const result = await fetchLatestLevel2(site);
      rawData = result.data;
      key     = result.key;
      this._cache.set(site, { raw: rawData, key, time: now });
    }

    const parser = new Level2Parser(rawData);
    parser.parse();

    const available = parser.availableFields();
    console.log(`[nexrad] L2 parsed fields for ${site}: [${available.join(', ')}]`);
    const field = pickField(available, product);
    if (!field) {
      throw new Error(
        `No data for "${product}" in Level II file for ${site}. ` +
        `Parsed fields: ${available.join(', ') || 'none'}. ` +
        `Velocity/SRV need a VCP that scans velocity.`
      );
    }

    const sweep = parser.getSweep(field, options.requestedElevNum);
    if (!sweep) throw new Error(`No sweep data for field "${field}" in ${site}`);

    const lat = parser.siteLat ?? 0;
    const lon = parser.siteLon ?? 0;
    const cfg = PRODUCT_CONFIG[product] || PRODUCT_CONFIG.reflectivity;

    let sweepData = sweep.data;

    let effectiveGates = sweep.numGates;
    {
      let lastValid = -1;
      for (let g = sweep.numGates - 1; g >= 0; g--) {
        let allMissing = true;
        for (let r = 0; r < sweep.numRadials; r++) {
          if (!isNaN(sweepData[r * sweep.numGates + g])) { allMissing = false; break; }
        }
        if (!allMissing) { lastValid = g; break; }
      }
      if (lastValid >= 0 && lastValid < sweep.numGates - 1) {
        effectiveGates = lastValid + 1;
        const trimmed = new Float32Array(sweep.numRadials * effectiveGates);
        for (let r = 0; r < sweep.numRadials; r++) {
          trimmed.set(
            sweepData.subarray(r * sweep.numGates, r * sweep.numGates + effectiveGates),
            r * effectiveGates
          );
        }
        sweepData = trimmed;
      }
    }

    let quantised = quantise(sweepData, cfg.vmin, cfg.vmax, cfg.applyMin, cfg.minVal);

    if (['reflectivity', 'velocity', 'srv'].includes(product)) {
      quantised = speckleFilter(quantised, sweep.numRadials, effectiveGates);
    }

    const maxRange = (sweep.firstGateRange + effectiveGates * sweep.gateWidth);

    // Get available elevations for tilt selector
    const availableElevations = parser.getAvailableElevations(field) || [];

    return {
      site,
      key:            key || '',
      product,
      latitude:       Math.round(lat * 1e6) / 1e6,
      longitude:      Math.round(lon * 1e6) / 1e6,
      azimuths:       sweep.azimuths.map(a => Math.round(a * 100) / 100),
      firstGateRange: Math.round(sweep.firstGateRange * 10) / 10,
      gateWidth:      Math.round(sweep.gateWidth * 10) / 10,
      numGates:       effectiveGates,
      numRadials:     sweep.numRadials,
      maxRange:       Math.round(maxRange * 10) / 10,
      vmin:           Math.round(cfg.vmin * 100) / 100,
      vmax:           Math.round(cfg.vmax * 100) / 100,
      noDataValue:    255,
      data:           uint8ToBase64(quantised),
      scanTime:       parser.scanTime ? parser.scanTime.toISOString() : null,
      availableElevations: availableElevations,
    };
  }

  async _getSweepLevel3(site, product, force = false) {
    return await this._getSweepLevel3Internal(site, product, force);
  }

  async _fetchLevel3Raw(site, mnemonic, force = false) {
    const cacheKey = `${site}:${mnemonic}`;
    const cached   = this._cache.get(cacheKey);
    const now      = Date.now();

    if (!force && cached && (now - cached.time) < this._ttlMs) {
      return { raw: cached.raw, key: cached.key || '' };
    }

    const result = await fetchLatestLevel3(site, mnemonic);
    if (!result) throw new Error(`Level III ${mnemonic} not available for ${site}`);
    this._cache.set(cacheKey, { raw: result.data, key: result.key, time: now });
    return { raw: result.data, key: result.key || '' };
  }

  _decodeBase64ToUint8(base64) {
    if (!base64) return new Uint8Array(0);
    if (typeof atob !== 'undefined') {
      const bin = atob(base64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  async _getSweepSrvSuperRes(site, force = false) {
    const velSweep = await this._getSweepLevel3Internal(site, 'velocity', force);
    const { raw: n0sRaw } = await this._fetchLevel3Raw(site, 'N0S', force);

    const storm = parseLevel3StormMotion(n0sRaw);
    if (!storm || !Number.isFinite(storm.speedMs)) {
      // Fall back to native N0S if storm motion cannot be extracted.
      return this._getSweepLevel3Internal(site, 'srv', force);
    }

    const velQ = this._decodeBase64ToUint8(velSweep.data);
    const cfg = PRODUCT_CONFIG.srv;
    const vmin = cfg.vmin;
    const vmax = cfg.vmax;
    const range = vmax - vmin;

    const outPhysical = new Float32Array(velQ.length);
    const numRadials = velSweep.numRadials;
    const numGates = velSweep.numGates;
    const az = velSweep.azimuths;

    let i = 0;
    for (let r = 0; r < numRadials; r++) {
      const azi = az[r] || 0;
      const theta = (storm.directionDeg - azi) * Math.PI / 180.0;
      const stormComponent = storm.speedMs * Math.cos(theta);
      for (let g = 0; g < numGates; g++, i++) {
        const q = velQ[i];
        if (q === 255) {
          outPhysical[i] = NaN;
        } else {
          const baseVel = vmin + (q / 254.0) * range;
          // Storm-relative = base radial velocity minus storm-motion component.
          outPhysical[i] = baseVel - stormComponent;
        }
      }
    }

    const outQ = quantise(outPhysical, cfg.vmin, cfg.vmax, cfg.applyMin, cfg.minVal);
    return {
      ...velSweep,
      product: 'srv',
      data: uint8ToBase64(outQ),
    };
  }

  async _getSweepLevel3Internal(site, product, force = false) {
    const mnemonics = LEVEL3_PRODUCT_MNEMONICS[product];
    if (!mnemonics) throw new Error(`No Level III mnemonics for product: ${product}`);

    let lastError;
    for (const mnemonic of mnemonics) {
      try {
        return await this._fetchAndParseLevel3(site, product, mnemonic, force);
      } catch (e) {
        console.warn(`[nexrad] Level III ${mnemonic} failed for ${site}: ${e.message}`);
        lastError = e;
      }
    }
    throw new Error(`All Level III mnemonics failed for ${product} on ${site}: ${lastError}`);
  }

  async _fetchAndParseLevel3(site, product, mnemonic, force) {
    const cacheKey = `${site}:${mnemonic}`;
    const cached   = this._cache.get(cacheKey);
    const now      = Date.now();

    let rawData, key;
    if (!force && cached && (now - cached.time) < this._ttlMs) {
      rawData = cached.raw;
      key     = cached.key;
    } else {
      const result = await fetchLatestLevel3(site, mnemonic);
      if (!result) throw new Error(`Level III ${mnemonic} not available for ${site}`);
      rawData = result.data;
      key     = result.key;
      this._cache.set(cacheKey, { raw: rawData, key, time: now });
    }

    const parser = new Level3Parser(rawData, product);
    let sweep  = parser.parse();
    sweep = normalizeTdwrRange(sweep, site, product);

    const cfg = PRODUCT_CONFIG[product] || PRODUCT_CONFIG.reflectivity;

    // classification (N0H): raw category codes 10-160 — pass through unchanged.
    // Other rawLevels: legacy 0xAF1F (0-15) or digital pkt16 (use thr1/thr2).
    // rawLevels===false: pkt28 — already physical values.
    let sweepData;
    if (product === 'classification') {
      sweepData = sweep.rawLevels ? Float32Array.from(sweep.data) : sweep.data;
    } else if (sweep.rawLevels) {
      sweepData = mapL3RawLevels(sweep.data, sweep, cfg.vmin, cfg.vmax, product);
    } else {
      sweepData = sweep.data;
    }

    let quantised = quantise(sweepData, cfg.vmin, cfg.vmax, cfg.applyMin, cfg.minVal);

    const maxRange = sweep.firstGateRange + sweep.numGates * sweep.gateWidth;

    return {
      site,
      key:            key || '',
      product,
      latitude:       Math.round((parser.siteLat || 0) * 1e6) / 1e6,
      longitude:      Math.round((parser.siteLon || 0) * 1e6) / 1e6,
      azimuths:       sweep.azimuths.map(a => Math.round(a * 100) / 100),
      firstGateRange: Math.round(sweep.firstGateRange * 10) / 10,
      gateWidth:      Math.round(sweep.gateWidth * 10) / 10,
      numGates:       sweep.numGates,
      numRadials:     sweep.numRadials,
      maxRange:       Math.round(maxRange * 10) / 10,
      vmin:           Math.round(cfg.vmin * 100) / 100,
      vmax:           Math.round(cfg.vmax * 100) / 100,
      noDataValue:    255,
      data:           uint8ToBase64(quantised),
      scanTime:       parser.scanTime ? parser.scanTime.toISOString() : null,
      availableElevations: [],  // Level 3 single-tilt, no elevation selection
    };
  }
}

function mapL3RawLevels(data, sweep, vmin, vmax, product = 'reflectivity') {
  const out = new Float32Array(data.length);
  if (sweep.isDigital8bit) {
    // ICD digital 8-bit products (packet 16): value = thr1*0.1 + (raw-2)*thr2*0.1
    // Standard reflectivity: thr1=-320, thr2=5  ->  -32.0 + (raw-2)*0.5
    const hasThresholds = sweep.thr1 !== undefined && sweep.thr2 !== undefined && sweep.thr1 !== 0 && sweep.thr2 !== 0;
    // Only velocity and SRV may use centered decode when thresholds are missing
    const shouldUseCenteredDecode = (product === 'velocity' || product === 'srv') && !hasThresholds;
    const minVal = (hasThresholds ? sweep.thr1 : -320) * 0.1;
    const incVal = (hasThresholds ? sweep.thr2 : 5)    * 0.1;

    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if (isNaN(raw)) { out[i] = NaN; continue; }

      if (product === 'cc') {
        // CC (rhoHV) should remain in a tight unitless range; map bins directly.
        if (raw <= 1) {
          out[i] = NaN;
        } else {
          const t = Math.max(0, Math.min(1, (raw - 2.0) / 253.0));
          out[i] = vmin + t * (vmax - vmin);
        }
      } else if (shouldUseCenteredDecode) {
        // Some N0G/N0S packet-16 files omit usable threshold words.
        // Use the canonical centered decode so inbound (negative) bins survive.
        out[i] = (raw - 129.0) / 2.0;
      } else {
        out[i] = minVal + (raw - 2) * incVal;
      }
    }
  } else {
    // Legacy 4-bit RLE (packet 0xAF1F): level 0 is no-data, levels 1-15 are data.
    // AF1F uses implicit level-to-value mapping, NOT threshold-based formula (unlike packet 16).
    // The PDB thresholds (thr1/thr2) are for other product layers and should NOT be used for AF1F.
    // Always use the legacy linear mapping for AF1F products.
    const isBipolar = vmin < 0 && vmax > 0;
    const range = vmax - vmin;
    
    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if (isNaN(raw)) { out[i] = NaN; continue; }

      if (product === 'cc') {
        // Legacy CC bins are 1..15; map uniformly into configured rhoHV range.
        const t = Math.max(0, Math.min(1, (raw - 1.0) / 14.0));
        out[i] = vmin + t * range;
        continue;
      }

      if (isBipolar) {
        // Map full range 1-15 across vmin to vmax for symmetric bipolar products
        out[i] = vmin + ((raw - 1.0) / 14.0) * range;
      } else {
        out[i] = vmin + (raw / 15.0) * range;
      }
    }
  }
  return out;
}

// ESM
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NexradClient, Level2Parser, Level3Parser, BZip2, resolveProductName, normalizeSite };
}

// Global (browser script tag)
if (typeof window !== 'undefined') {
  window.NexradClient = NexradClient;
  window.NexradLevel2Parser = Level2Parser;
  window.NexradLevel3Parser = Level3Parser;
}
