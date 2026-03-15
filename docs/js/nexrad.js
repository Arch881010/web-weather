// Claude wrote this, so this is "AS IS" basis for this script.
// This was also idealized from AtticRadar's stuff, so go check it out!

const S3_BASE          = 'https://unidata-nexrad-level2.s3.amazonaws.com';
const LEVEL3_S3_BASE   = 'https://unidata-nexrad-level3.s3.amazonaws.com';
const NOMADS_BASE      = 'https://nomads.ncep.noaa.gov/pub/data/nccf/radar/nexrad_level2';

// Product routing
const LEVEL3_ONLY_PRODUCTS = new Set(['reflectivity', 'classification']);
const LEVEL3_PRODUCT_MNEMONICS = {
  reflectivity:   ['NZB', 'N0B'],
  classification: ['N0H'],
};

function normalizeSite(site) {
  if (!site) throw new Error('Missing radar site code');
  const v = site.trim().toUpperCase();
  if (v.length !== 4) throw new Error(`Radar site code must be 4 characters (e.g. KLZK), got: "${site}"`);
  return v;
}

function resolveProductName(name) {
  const n = (name || '').trim().toLowerCase();
  const aliases = {
    '': 'reflectivity', ref: 'reflectivity', reflectivity: 'reflectivity',
    n0q: 'reflectivity', n0r: 'reflectivity',
    srv: 'srv', srm: 'srv',
    velocity: 'velocity', vel: 'velocity', v: 'velocity',
    cc: 'cc', corr: 'cc',
    classification: 'classification', class: 'classification', hydrometeor: 'classification',
  };
  return aliases[n] ?? 'reflectivity';
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
  const station3 = site.length === 4 ? site.slice(1).toUpperCase() : site.toUpperCase();
  const now = utcNow();

  for (let daysBack = 0; daysBack < 2; daysBack++) {
    const d = new Date(now - daysBack * 86400000);
    const { y, m, dd } = dateToYMD(d);
    const prefix = `${station3}_${mnemonic}_${y}_${pad2(m)}_${pad2(dd)}`;
    try {
      const keys = await listS3Keys(LEVEL3_S3_BASE, prefix);
      if (!keys.length) continue;
      keys.sort();
      const latest = keys[keys.length - 1];
      const fileUrl = `${LEVEL3_S3_BASE}/${latest}`;
      const data = await fetchBinary(fileUrl);
      return { data, key: latest };
    } catch { continue; }
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

      // Each payload may contain multiple 2432-byte message records
      let pos = 0;
      while (pos + 28 <= payload.length) {
        const slice = payload.subarray(pos);
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
    // Each slice starts with a 12-byte CTM header, then the 28-byte message header.
    if (slice.length < 40) return;

    const view = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);

    // Skip CTM (12 bytes)
    const msgStart = 12;
    const msgType = slice[msgStart + 2]; // byte offset 14 = message type byte

    if (msgType === 31) {
      this._parseType31(slice, view, msgStart);
    } else if (msgType === 1) {
      this._parseType1(slice, view, msgStart);
    }
    // Types 2,3,5,7,13 etc. are metadata — skip for sweep extraction
  }

  _parseType1(slice, view, msgStart) {
    if (slice.length < msgStart + 100) return;
    const o = msgStart + 28; // skip 28-byte message header → data block

    const julianDay = view.getUint16(msgStart + 6, false);
    const msOfDay   = view.getUint32(msgStart + 8, false);
    const scanTime  = this._julianToDate(julianDay, msOfDay);
    if (!this.scanTime) this.scanTime = scanTime;

    // Data block starts 100 bytes after message start (legacy ICD)
    const dataOffset = msgStart + 100;

    const rawAz     = view.getUint16(dataOffset, false);
    const azimuth   = (rawAz / 8.0) * (360.0 / 4096.0);

    // Reflectivity pointer (halfword 5): offset from data block start
    const refPtr    = view.getUint16(dataOffset + 4, false);
    const velPtr    = view.getUint16(dataOffset + 6, false);

    if (refPtr > 0 && refPtr < slice.length - msgStart) {
      const refOffset   = msgStart + refPtr;
      const numRefGates = view.getUint16(dataOffset + 8,  false);
      const refGateSize = view.getUint16(dataOffset + 10, false);  // metres
      const firstGate   = view.getUint16(dataOffset + 12, false);  // metres

      const refData = new Float32Array(numRefGates);
      for (let i = 0; i < numRefGates; i++) {
        const raw = slice[refOffset + i];
        refData[i] = raw === 0 || raw === 1 ? NaN : (raw - 66.0) / 2.0; // dBZ
      }

      this._addRadial('reflectivity', azimuth, refData, firstGate, refGateSize);

      // Site coords in message
      if (this.siteLat === null) {
        this.siteLat = view.getInt32(dataOffset + 48, false) / 1000.0;
        this.siteLon = view.getInt32(dataOffset + 52, false) / 1000.0;
      }
    }

    if (velPtr > 0 && velPtr < slice.length - msgStart) {
      const velOffset   = msgStart + velPtr;
      const numVelGates = view.getUint16(dataOffset + 14, false);
      const velGateSize = view.getUint16(dataOffset + 16, false);
      const firstGate   = view.getUint16(dataOffset + 18, false);
      const nyquist     = view.getInt16 (dataOffset + 60, false) / 100.0; // m/s

      const velData = new Float32Array(numVelGates);
      for (let i = 0; i < numVelGates; i++) {
        const raw = slice[velOffset + i];
        if (raw === 0 || raw === 1) {
          velData[i] = NaN;
        } else {
          velData[i] = (raw - 129.0) / 2.0; // m/s for 0.5 m/s resolution
        }
      }

      this._addRadial('velocity', azimuth, velData, firstGate, velGateSize);
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

      if (blockType === 'R') {
        // Volume Header Block or Elevation Header Block — contains site info
        if (blockName === 'VOL') {
          this._parseVolBlock(slice, view, blockAbs);
        }
      } else if (blockType === 'D') {
        // Data Moment Block
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
      this._addRadial(normalised, azimuth, fieldData, firstGate, gateSize);
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

  _addRadial(field, azimuth, data, firstGate, gateSize) {
    if (!this.sweeps[field]) this.sweeps[field] = [];
    this.sweeps[field].push({ azimuth, data, firstGate, gateSize });
  }

  _julianToDate(julianDay, msOfDay) {
    // NEXRAD Julian day 1 = 1 Jan 1970
    const epochMs = (julianDay - 1) * 86400000 + msOfDay;
    return new Date(epochMs);
  }

  getSweep(field) {
    const radials = this.sweeps[field];
    if (!radials || radials.length === 0) return null;

    // Sort by azimuth
    radials.sort((a, b) => a.azimuth - b.azimuth);

    // Pick the set with the most radials (super-res preferred)
    // Group radials by gateSize (super-res = 250 m, legacy = 1000 m)
    const bySuperRes = radials.filter(r => r.gateSize <= 300);
    const chosen = bySuperRes.length >= radials.length * 0.5 ? bySuperRes : radials;

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
      let bin = 0;
      for (let b = 0; b < numBytes && bin < numBins; b++, rOff++) {
        if (rOff >= raw.length) break;
        const byte  = raw[rOff];
        const count = (byte >> 4) & 0xF;
        const level = byte & 0xF;
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
  srv:          { vmin: -80.0, vmax: 80.0,  minVal: null, applyMin: false },
  cc:           { vmin: 0.2,   vmax: 1.05,  minVal: 0.2,  applyMin: true  },
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

function estimateEnvWind(data, azimuths, numGates) {
  const numRadials = azimuths.length;
  const azRad = new Float32Array(numRadials);
  for (let i = 0; i < numRadials; i++) azRad[i] = (azimuths[i] * Math.PI) / 180;

  const ringFractions = [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75];
  const allAz = [], allVel = [];

  for (const frac of ringFractions) {
    const ri = Math.floor(numGates * frac);
    if (ri >= numGates) continue;
    const ring = [], ringAz = [];
    for (let r = 0; r < numRadials; r++) {
      const v = data[r * numGates + ri];
      if (!isNaN(v)) { ring.push(v); ringAz.push(azRad[r]); }
    }
    if (ring.length < 20) continue;
    allVel.push(...ring);
    allAz.push(...ringAz);
  }

  if (allVel.length < 60) return null;

  // Design matrix: [cos(az), sin(az), 1]
  let a11=0, a12=0, a13=0, a22=0, a23=0, a33=0, b1=0, b2=0, b3=0;
  for (let i = 0; i < allAz.length; i++) {
    const c = Math.cos(allAz[i]), s = Math.sin(allAz[i]), vel = allVel[i];
    a11 += c*c; a12 += c*s; a13 += c;
    a22 += s*s; a23 += s; a33 += 1;
    b1  += c*vel; b2 += s*vel; b3 += vel;
  }
  // Solve 3×3 system (Cramer's rule)
  const det = a11*(a22*a33-a23*a23) - a12*(a12*a33-a23*a13) + a13*(a12*a23-a22*a13);
  if (Math.abs(det) < 1e-10) return null;
  const A = (b1*(a22*a33-a23*a23) - a12*(b2*a33-a23*b3) + a13*(b2*a23-a22*b3)) / det;
  const B = (a11*(b2*a33-a23*b3) - b1*(a12*a33-a23*a13) + a13*(a12*b3-b2*a13)) / det;

  // Broadcast onto (numRadials × numGates)
  const env = new Float32Array(numRadials * numGates);
  for (let r = 0; r < numRadials; r++) {
    const component = A * Math.cos(azRad[r]) + B * Math.sin(azRad[r]);
    const base = r * numGates;
    for (let g = 0; g < numGates; g++) env[base + g] = component;
  }

  const mean = (A * A + B * B) ** 0.5;
  console.log(`[nexrad] VAD SRV: mean |env_wind| = ${mean.toFixed(2)} m/s`);
  return env;
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
    return { speedMs: (dep8 / 10.0) * 0.514444, directionDeg: dep9 / 10.0 };
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

class NexradClient {
  constructor(options = {}) {
    this._cache    = new Map(); // site → { key, sweeps, time }
    this._ttlMs    = (options.cacheTtlSeconds || 120) * 1000;
  }

  async getSweep(site, product = 'reflectivity', options = {}) {
    site    = normalizeSite(site);
    product = resolveProductName(product);

    if (isLevel3Request(product)) {
      return this._getSweepLevel3(site, product, options.force);
    }
    return this._getSweepLevel2(site, product, options.force);
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
    const field = pickField(available, product);
    if (!field) {
      throw new Error(
        `No ${product} field found. Available: ${available.join(', ') || 'none'}. ` +
        `Classification is only available via Level III products.`
      );
    }

    const sweep = parser.getSweep(field);
    if (!sweep) throw new Error(`No sweep data for field "${field}" in ${site}`);

    const lat = parser.siteLat ?? 0;
    const lon = parser.siteLon ?? 0;
    const cfg = PRODUCT_CONFIG[product] || PRODUCT_CONFIG.reflectivity;

    let sweepData = sweep.data;

    if (product === 'srv') {
      const env = estimateEnvWind(sweepData, sweep.azimuths, sweep.numGates);
      if (env) {
        // Subtract environmental wind
        const sub = new Float32Array(sweepData.length);
        for (let i = 0; i < sweepData.length; i++) {
          sub[i] = isNaN(sweepData[i]) ? NaN : sweepData[i] - env[i];
        }
        sweepData = sub;
      }
    }

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
    };
  }

  async _getSweepLevel3(site, product, force = false) {
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
    const sweep  = parser.parse();

    const cfg = PRODUCT_CONFIG[product] || PRODUCT_CONFIG.reflectivity;

    // For raw-level L3 products (RLE-encoded), map raw integer levels to physical values
    let sweepData;
    if (sweep.rawLevels) {
      sweepData = mapL3RawLevels(sweep.data, sweep, cfg.vmin, cfg.vmax);
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
    };
  }
}

function mapL3RawLevels(data, sweep, vmin, vmax) {
  const out = new Float32Array(data.length);
  if (sweep.isDigital8bit) {
    // ICD digital 8-bit products (packet 16): value = thr1*0.1 + (raw-2)*thr2*0.1
    // Standard reflectivity: thr1=-320, thr2=5  ->  -32.0 + (raw-2)*0.5
    const minVal = (sweep.thr1 !== undefined && sweep.thr1 !== 0 ? sweep.thr1 : -320) * 0.1;
    const incVal = (sweep.thr2 !== undefined && sweep.thr2 !== 0 ? sweep.thr2 : 5)    * 0.1;
    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if (isNaN(raw)) { out[i] = NaN; continue; }
      out[i] = minVal + (raw - 2) * incVal;
    }
  } else {
    // Legacy 4-bit RLE (packet 0xAF1F): levels 0-15, linearly mapped to [vmin, vmax]
    const range = vmax - vmin;
    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if (isNaN(raw)) { out[i] = NaN; continue; }
      out[i] = vmin + (raw / 15.0) * range;
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