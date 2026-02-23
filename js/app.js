let T = { ...TARIFE.ewb.tarife.ewb_basis };
const tog = { wp: 'nein', em: 'nein', bo: 'nein', ma: 'nein', zv: 'nein', po: 'ja', iz: 'ja', be: 'ja' };

// Track source of each tariff component for the popup
let tariffSource = {
  sp: { value: 0, source: 'Noch nicht geladen', type: 'none' },
  ev: { value: 0, source: 'Noch nicht geladen', type: 'none' },
  zt: { value: 0, source: '80% des Bezugstarifs (StromVG)', type: 'none' }
};

function updateTariffPopup() {
  const grid = document.getElementById('tb-popup-grid');
  const footer = document.getElementById('tb-popup-footer');
  if (!grid) return;

  const badgeHtml = (type) => {
    const map = {
      'api': '<span class="tb-popup-badge badge-api">LINDAS OGD</span>',
      'lokal': '<span class="tb-popup-badge badge-lokal">Hinterlegt</span>',
      'geschaetzt': '<span class="tb-popup-badge badge-geschaetzt">Gesch\u00E4tzt</span>',
      'minimum': '<span class="tb-popup-badge badge-minimum">Minimum</span>',
      'none': ''
    };
    return map[type] || '';
  };

  grid.innerHTML = `
    <div class="tb-popup-row">
      <span class="tb-popup-label">Strompreis</span>
      <span class="tb-popup-val">${tariffSource.sp.value.toFixed(2)} Rp/kWh ${badgeHtml(tariffSource.sp.type)}</span>
      <span class="tb-popup-source">${tariffSource.sp.source}</span>
    </div>
    <div class="tb-popup-row">
      <span class="tb-popup-label">Einspeisung</span>
      <span class="tb-popup-val">${tariffSource.ev.value.toFixed(2)} Rp/kWh ${badgeHtml(tariffSource.ev.type)}</span>
      <span class="tb-popup-source">${tariffSource.ev.source}</span>
    </div>
    <div class="tb-popup-row">
      <span class="tb-popup-label">ZEV-Tarif</span>
      <span class="tb-popup-val">${tariffSource.zt.value.toFixed(2)} Rp/kWh ${badgeHtml(tariffSource.zt.type)}</span>
      <span class="tb-popup-source">${tariffSource.zt.source}</span>
    </div>
  `;

  footer.textContent = 'Bezugstarife: ElCom / LINDAS OGD Kat. H4 (5-Zi-Whg, 4\u2019500 kWh/J) \u00B7 Einspeisung: gem\u00E4ss Netzbetreiber \u00B7 ZEV: 80% des Bezugstarifs';
}

function setToggle(k, v) {
  tog[k] = v;
  document.getElementById(`${k}-ja`).classList.toggle('on', v === 'ja');
  document.getElementById(`${k}-nein`).classList.toggle('on', v === 'nein');
  calcAndUpdate();
}

// Toggle tariff detail collapse/expand
function toggleTariffDetail() {
  const wrap = document.getElementById('tariffDetailsWrap');
  const chevron = document.getElementById('tariffChevron');
  wrap.classList.toggle('open');
  chevron.classList.toggle('open');
}

function setTariffSummary(totalRp) {
  const el = document.getElementById('tariffSummaryText');
  if (el) el.textContent = `Total: ${totalRp.toFixed(2)} Rp/kWh`;
}

// Solar roof area slider
let solarMaxFlaeche = 0; // m² of suitable roof
let solarMaxKwh = 0;     // max kWh/year at 100%

function onRoofSlider() {
  const pct = +document.getElementById('roofSlider').value;
  const usedFlaeche = Math.round(solarMaxFlaeche * pct / 100);
  const usedKwh = Math.round(solarMaxKwh * pct / 100);
  const kwp = Math.round(usedKwh / 1000 * 10) / 10;

  document.getElementById('roofSliderVal').textContent = pct + '%';
  document.getElementById('roofAreaUsed').textContent = f(usedFlaeche) + ' m\u00B2 genutzt';

  // Track fill (cyan bar from left to slider position)
  const fill = document.getElementById('roof-track-fill');
  if (fill) {
    fill.style.left = '0%';
    fill.style.right = (100 - pct) + '%';
    fill.style.background = 'var(--brand-cyan)';
  }

  // Update kWp and production
  document.getElementById('kwp').value = kwp;
  syncKwp();
}

window.evType = 'min';
window.kuType = 'vermieter';
window.lastOperatorName = '';

function setKuType(type) {
  window.kuType = type;
  document.getElementById('ku-vermieter').classList.toggle('on', type === 'vermieter');
  document.getElementById('ku-mieter').classList.toggle('on', type === 'mieter');
  calcAndUpdate();
}

function setEvType(type) {
  window.evType = type;
  document.getElementById('ev-min').classList.toggle('on', type === 'min');
  document.getElementById('ev-lokal').classList.toggle('on', type === 'lokal');
  if (typeof T !== 'undefined' && T) updateEvValue();
}

function updateEvValue() {
  if (typeof T === 'undefined' || !T) return;

  let localEv = CH_DURCHSCHNITT.ev_lokal;
  let localQuelle = CH_DURCHSCHNITT.ev_lokal_quelle;

  if (window.lastOperatorName) {
    const opLower = window.lastOperatorName.toLowerCase();
    for (const [key, val] of Object.entries(OPERATOR_MAP)) {
      if (opLower.includes(key)) {
        const src = Object.values(TARIFE[val].tarife)[0];
        localEv = src.ev_lokal || localEv;
        localQuelle = src.ev_lokal_quelle || localQuelle;
        break;
      }
    }
  }

  if (window.evType === 'lokal') {
    T.ev = localEv;
    T.ev_quelle = localQuelle;
    if (typeof tariffSource !== 'undefined') tariffSource.ev = { value: T.ev, source: localQuelle, type: 'lokal' };
  } else {
    T.ev = 6.00;
    T.ev_quelle = 'Mindestvergütung';
    if (typeof tariffSource !== 'undefined') tariffSource.ev = { value: T.ev, source: `Gesetzliche Mindestvergütung (Stromgesetz 2026)`, type: 'minimum' };
  }

  const evUiElement = document.getElementById('no-ev-label');
  if (evUiElement) evUiElement.textContent = T.ev.toFixed(2);

  const grid = document.getElementById('tariffGrid');
  if (grid) {
    const spans = grid.querySelectorAll('span');
    spans.forEach(span => {
      if (span.innerHTML.includes('Einspeiseverg')) {
        const label = window.evType === 'lokal' ? 'Lokal' : 'Minimum';
        span.nextElementSibling.innerHTML = `${T.ev.toFixed(2)} Rp/kWh <em style="font-size:9px;color:var(--muted)">(${label})</em>`;
      }
    });
  }

  updateTariffPopup();
  calcAndUpdate();
}

// Apply tariff data to the calculator and UI
function applyTariff(operatorName, totalRp, energyRp, gridusageRp, chargeRp, aidfeeRp) {
  window.lastOperatorName = operatorName;

  const catSelect = document.getElementById('tariffCategorySelect');
  const catCode = catSelect ? catSelect.value : 'H4';
  const catText = catSelect ? catSelect.options[catSelect.selectedIndex].text : 'H4 (Haushalt, 4\'500 kWh/J)';

  T = {
    sp: totalRp,
    ev: 6.00, // Einspeisevergütung: min 6 Rp/kWh nach neuem Stromgesetz 2026
    zt: Math.round(totalRp * 0.8 * 100) / 100, // ZEV = 80% des Netzpreises
    zm: T.zm || 5.00,
    name: operatorName + ' ' + catCode,
    ev_quelle: 'Mindestvergütung' // Gesetzlich festgelegt ab 2026
  };
  // Top-bar
  document.getElementById('tb-tarif').textContent = T.name;
  document.getElementById('tb-auto').textContent = '(automatisch)';
  document.getElementById('no-ev-label').textContent = T.ev.toFixed(2);
  document.getElementById('zev-zt-label').textContent = T.zt.toFixed(2);
  // Info box
  const info = document.getElementById('tariffInfo');
  document.getElementById('tariffTitle').textContent = `\u26A1 ${operatorName} \u2014 Stromtarif 2026`;
  document.getElementById('tariffGrid').innerHTML = `
        <span>Energie:</span><span class="tg-val">${energyRp.toFixed(2)} Rp/kWh</span>
        <span>Netznutzung:</span><span class="tg-val">${gridusageRp.toFixed(2)} Rp/kWh</span>
        <span>Abgaben:</span><span class="tg-val">${chargeRp.toFixed(2)} Rp/kWh</span>
        <span>KEV/Reserve:</span><span class="tg-val">${aidfeeRp.toFixed(2)} Rp/kWh</span>
        <span style="font-weight:700">Total:</span><span class="tg-val" style="color:var(--brand-cyan-dark)">${totalRp.toFixed(2)} Rp/kWh</span>
        <span>Einspeiseverg\u00FCtung:</span><span class="tg-val">${T.ev.toFixed(2)} Rp/kWh <em style="font-size:9px;color:var(--muted)">(Minimum)</em></span>
      `;
  document.getElementById('tariffDetail').textContent = `Kat. ${catText} \u00B7 Quelle: LINDAS OGD \u00B7 Einspeisung: Gesetzliches Minimum`;
  setTariffSummary(totalRp);
  info.classList.add('visible');
  // Hide loading
  document.getElementById('tariffLoading').style.display = 'none';
  // Update popup source info
  tariffSource = {
    sp: { value: T.sp, source: `LINDAS OGD (ElCom) \u2014 Gemeinde-Nr. via GeoAdmin`, type: 'api' },
    ev: { value: T.ev, source: `Gesetzliche Mindestverg\u00FCtung (Stromgesetz 2026)`, type: 'minimum' },
    zt: { value: T.zt, source: `Berechnet: ${T.sp.toFixed(2)} \u00D7 80% = ${T.zt.toFixed(2)} Rp/kWh`, type: 'geschaetzt' }
  };
  updateEvValue();
}

// Show operator-only info (fallback: match against hardcoded TARIFE, or use Swiss avg)

function applyOperatorOnly(operatorName) {
  window.lastOperatorName = operatorName;
  const info = document.getElementById('tariffInfo');
  const opLower = operatorName.toLowerCase();

  // Try to match operator to our hardcoded TARIFE
  let matched = null;
  for (const [key, val] of Object.entries(OPERATOR_MAP)) {
    if (opLower.includes(key)) { matched = val; break; }
  }

  if (matched) {
    // Known operator — use hardcoded tariff data (create a COPY to avoid mutating TARIFE)
    const src = Object.values(TARIFE[matched].tarife)[0];
    T = { ...src };
    const evLabel = T.ev_quelle === 'offiziell' ? 'offiziell' : 'gesch\u00E4tzt';
    document.getElementById('tariffTitle').textContent = `\u26A1 ${operatorName} \u2014 ${T.name}`;
    document.getElementById('tariffGrid').innerHTML = `
          <span style="font-weight:700">Strompreis (Bezug):</span><span class="tg-val" style="color:var(--brand-cyan-dark)">${T.sp.toFixed(2)} Rp/kWh</span>
          <span>Einspeiseverg\u00FCtung:</span><span class="tg-val">${T.ev.toFixed(2)} Rp/kWh <em style="font-size:9px;color:var(--muted)">(${evLabel})</em></span>
          <span>ZEV-Tarif (80%):</span><span class="tg-val">${T.zt.toFixed(2)} Rp/kWh</span>
        `;
    document.getElementById('tariffDetail').textContent = 'Tarif aus hinterlegten Daten \u00B7 Stand 2026';
    setTariffSummary(T.sp);
  } else {
    T = {
      sp: CH_DURCHSCHNITT.sp,
      ev: 6.00,
      zt: CH_DURCHSCHNITT.zt,
      zm: CH_DURCHSCHNITT.zm,
      name: operatorName + ' (\u00D8 CH)',
      ev_quelle: 'Mindestvergütung'
    };
    document.getElementById('tariffTitle').textContent = `\u26A1 ${operatorName}`;
    document.getElementById('tariffGrid').innerHTML = `
          <span style="font-weight:700">Strompreis (Bezug):</span><span class="tg-val" style="color:var(--brand-cyan-dark)">${T.sp.toFixed(2)} Rp/kWh</span>
          <span>Einspeiseverg\u00FCtung:</span><span class="tg-val">${T.ev.toFixed(2)} Rp/kWh <em style="font-size:9px;color:var(--muted)">(Minimum)</em></span>
          <span>ZEV-Tarif (80%):</span><span class="tg-val">${T.zt.toFixed(2)} Rp/kWh</span>
        `;
    document.getElementById('tariffDetail').textContent = 'Schweizer Durchschnittstarif H4 \u00B7 bitte ggf. anpassen';
    setTariffSummary(T.sp);
  }

  // Update top-bar
  document.getElementById('tb-tarif').textContent = T.name;
  document.getElementById('tb-auto').textContent = matched ? '(automatisch)' : '(Durchschnitt)';

  document.getElementById('no-ev-label').textContent = T.ev.toFixed(2);
  document.getElementById('zev-zt-label').textContent = T.zt.toFixed(2);

  info.classList.add('visible');
  // Hide loading
  document.getElementById('tariffLoading').style.display = 'none';
  // Update popup source info
  if (matched) {
    const evType = T.ev_quelle === 'offiziell' ? 'lokal' : 'geschaetzt';
    const evSrc = T.ev_quelle === 'offiziell'
      ? `Offizielle Angabe des Netzbetreibers (Stand 2026)`
      : `Gesetzliche Mindestverg\u00FCtung (Stromgesetz 2026)`;
    const typeLabel = T.ev_quelle === 'offiziell' ? evType : 'minimum';
    tariffSource = {
      sp: { value: T.sp, source: `Hinterlegte Daten: ${T.name} (ElCom/LINDAS H4 2026)`, type: 'lokal' },
      ev: { value: T.ev, source: evSrc, type: typeLabel },
      zt: { value: T.zt, source: `Berechnet: ${T.sp.toFixed(2)} \u00D7 80% = ${T.zt.toFixed(2)} Rp/kWh`, type: 'geschaetzt' }
    };
  } else {
    tariffSource = {
      sp: { value: T.sp, source: `Schweizer Durchschnitt H4 2026 (ElCom/LINDAS Median)`, type: 'geschaetzt' },
      ev: { value: T.ev, source: `Gesetzliche Mindestverg\u00FCtung (Stromgesetz 2026)`, type: 'minimum' },
      zt: { value: T.zt, source: `Berechnet: ${T.sp.toFixed(2)} \u00D7 80% = ${T.zt.toFixed(2)} Rp/kWh`, type: 'geschaetzt' }
    };
  }
  updateEvValue();
}

function syncKwp() {
  const kwp = +document.getElementById('kwp').value || 0;
  document.getElementById('produktion').value = Math.round(kwp * 1000);
  // Auto-calculate Pronovo EIV 2026 (Einmalverg\u00FCtung)
  // Base: CHF 350/kWp for first 30 kWp, CHF 220/kWp above
  let eiv = 0;
  if (kwp > 0) {
    const first30 = Math.min(kwp, 30);
    const above30 = Math.max(kwp - 30, 0);
    eiv = Math.round(first30 * 350 + above30 * 220);
  }
  document.getElementById('foerderung').value = eiv > 0 ? eiv : '';
  calcAndUpdate();
}

function onSplitSlider() {
  let zev = +document.getElementById('sl-split').value;
  // Max. 1/3 der Produktion darf per ZEV verteilt werden
  const MAX_ZEV = 33;
  if (zev > MAX_ZEV) {
    zev = MAX_ZEV;
    document.getElementById('sl-split').value = MAX_ZEV;
  }
  const ei = 80 - zev;

  // Update bar widths (out of 100%)
  document.getElementById('bar-zev').style.width = (zev / 100 * 100) + '%';
  document.getElementById('bar-zev-label').textContent = zev + '%';
  document.getElementById('bar-ei-label').textContent = ei + '%';

  // Track fill (green section = ZEV portion of the 80% range)
  const fillRight = (ei / 80 * 100) + '%';
  const fill = document.getElementById('track-fill');
  if (fill) {
    fill.style.left = '0%';
    fill.style.right = fillRight;
  }

  // Chips
  document.getElementById('pct-zev-val').textContent = zev + '%';
  document.getElementById('pct-einspeis-val').textContent = ei + '%';

  calcAndUpdate();
}

/* \u2500\u2500 GeoAdmin Address Autocomplete \u2500\u2500 */
let addrTimer = null;
let selectedCoords = null;

function onAddressInput(q) {
  clearTimeout(addrTimer);
  const dd = document.getElementById('addrDropdown');
  if (q.length < 3) { dd.classList.remove('open'); return; }
  addrTimer = setTimeout(() => fetchAddresses(q), 300);
}

async function fetchAddresses(q) {
  const dd = document.getElementById('addrDropdown');
  try {
    const url = `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(q)}&type=locations&origins=address&sr=2056&limit=5`;
    const r = await fetch(url);
    const data = await r.json();
    dd.innerHTML = '';
    if (data.results && data.results.length) {
      data.results.forEach(res => {
        const div = document.createElement('div');
        div.className = 'addr-item';
        // Sanitize: GeoAdmin returns HTML in label — extract text safely
        const sanitizer = document.createElement('span');
        sanitizer.innerHTML = res.attrs.label;
        div.textContent = sanitizer.textContent;
        div.addEventListener('click', () => onAddressSelect(res));
        dd.appendChild(div);
      });
      dd.classList.add('open');
    } else {
      dd.classList.remove('open');
    }
  } catch (e) { dd.classList.remove('open'); }
}

function onAddressSelect(res) {
  const dd = document.getElementById('addrDropdown');
  dd.classList.remove('open');
  // Sanitize: extract plain text from HTML label
  const tmp = document.createElement('span');
  tmp.textContent = '';
  tmp.innerHTML = res.attrs.label;
  document.getElementById('objektName').value = tmp.textContent || '';
  selectedCoords = { x: res.attrs.y, y: res.attrs.x };
  fetchSolarPotential(selectedCoords.x, selectedCoords.y);
  // Use GeoAdmin municipality layer to get BFS number reliably
  fetchMunicipalityAndTariff(selectedCoords.x, selectedCoords.y);
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.addr-wrap')) {
    document.getElementById('addrDropdown').classList.remove('open');
  }
});

/* ── Municipality + Tariff Detection ── */

async function fetchMunicipalityAndTariff(x, y) {
  const info = document.getElementById('tariffInfo');
  info.classList.remove('visible');
  document.getElementById('tariffLoading').style.display = 'block';

  // Step 1: Get municipality name and BFS number from GeoAdmin (CORS-enabled)
  let bfsNr = null;
  let gemName = null;
  try {
    const gemUrl = `https://api3.geo.admin.ch/rest/services/api/MapServer/identify?geometryType=esriGeometryPoint&geometry=${x},${y}&mapExtent=${x - 50},${y - 50},${x + 50},${y + 50}&imageDisplay=100,100,96&layers=all:ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill&tolerance=10&sr=2056&returnGeometry=false&lang=de`;
    const r = await fetch(gemUrl);
    const data = await r.json();
    if (data.results && data.results.length) {
      // Filter for CURRENT municipality (skip historical entries like "Bümpliz")
      const current = data.results.find(r => r.attributes.is_current_jahr === true || r.attributes.is_current_jahr === 'true');
      const best = current || data.results[0];
      gemName = best.attributes.gemname || best.attributes.label || null;
      // gde_nr in current entries contains the BFS number (e.g. 351 for Bern)
      if (best.attributes.gde_nr) {
        bfsNr = String(best.attributes.gde_nr);
      }
      console.log('Municipality:', gemName, 'BFS:', bfsNr);
    }
  } catch (e) {
    console.warn('GeoAdmin identify failed:', e);
  }

  // Fallback: Get BFS from gg25 search if identify didn't return gde_nr
  if (gemName && !bfsNr) {
    try {
      const bfsUrl = `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(gemName)}&type=locations&origins=gg25&sr=2056&limit=1`;
      const r = await fetch(bfsUrl);
      const data = await r.json();
      if (data.results && data.results.length) {
        bfsNr = String(data.results[0].attrs.featureId);
        console.log('BFS from gg25 search:', bfsNr);
      }
    } catch (e) {
      console.warn('GeoAdmin BFS lookup failed:', e);
    }
  }

  if (!bfsNr && !gemName) {
    document.getElementById('tariffLoading').style.display = 'none';
    return;
  }

  // Save bfsNr on the dropdown so changing Tariff settings later can reuse it
  if (bfsNr) {
    document.getElementById('addrDropdown').dataset.bfsNr = bfsNr;
    fetchElcomTariff(bfsNr, gemName);
  } else if (gemName) {
    applyOperatorOnly(gemName);
  } else {
    document.getElementById('tariffLoading').style.display = 'none';
  }
}

async function fetchSolarPotential(x, y) {
  const loading = document.getElementById('solarLoading');
  const info = document.getElementById('solarInfo');
  loading.style.display = 'block';
  info.classList.remove('visible');
  try {
    const url = `https://api3.geo.admin.ch/rest/services/api/MapServer/identify?geometryType=esriGeometryPoint&geometry=${x},${y}&mapExtent=${x - 50},${y - 50},${x + 50},${y + 50}&imageDisplay=100,100,96&layers=all:ch.bfe.solarenergie-eignung-daecher&tolerance=10&sr=2056&returnGeometry=false&lang=de`;
    const r = await fetch(url);
    const data = await r.json();
    loading.style.display = 'none';
    if (!data.results || !data.results.length) {
      info.classList.add('visible');
      document.getElementById('solarVal').textContent = 'Keine Daten';
      document.getElementById('solarLabel').textContent = 'F\u00FCr diese Adresse liegen keine Solardaten vor.';
      return;
    }
    // Filter: only roofs with klasse >= 3 (Gut/Sehr gut), group by building_id
    const buildings = {};
    let totalSurfaces = 0;
    data.results.forEach(r => {
      const a = r.attributes;
      if (!a.gwr_egid) return;
      totalSurfaces++;
      // Skip poorly-suited surfaces (balconies, walls, poor orientation)
      if (a.klasse < 3) return;
      if (!buildings[a.gwr_egid]) buildings[a.gwr_egid] = { total: 0, flaeche: 0, best: 0, count: 0 };
      buildings[a.gwr_egid].total += (a.stromertrag || 0);
      buildings[a.gwr_egid].flaeche += (a.flaeche || 0);
      buildings[a.gwr_egid].count++;
      if (a.klasse > buildings[a.gwr_egid].best) buildings[a.gwr_egid].best = a.klasse;
    });
    // Pick the building with the most total potential
    let bestEgid = null, bestTotal = 0;
    Object.entries(buildings).forEach(([egid, b]) => {
      if (b.total > bestTotal) { bestTotal = b.total; bestEgid = egid; }
    });
    if (bestEgid && bestTotal > 0) {
      const b = buildings[bestEgid];
      info.classList.add('visible');
      document.getElementById('solarVal').textContent = f(bestTotal) + ' kWh/Jahr';
      const klassen = ['', 'Gering', 'Mittel', 'Gut', 'Sehr gut'];
      document.getElementById('solarLabel').textContent =
        `Solarpotential (${b.count} von ${totalSurfaces} Dachfl., ${f(Math.round(b.flaeche))} m\u00B2, Eignung: ${klassen[b.best] || '?'}) \u2014 Quelle: sonnendach.ch`;
      // Store solar data for roof slider
      solarMaxFlaeche = Math.round(b.flaeche);
      solarMaxKwh = bestTotal;
      // Show roof slider
      const wrap = document.getElementById('roofSliderWrap');
      wrap.style.display = 'block';
      document.getElementById('roofSlider').value = 100;
      document.getElementById('roofSlider').max = 100;
      document.getElementById('roofAreaMax').textContent = 'Max: ' + f(solarMaxFlaeche) + ' m\u00B2';
      onRoofSlider(); // Apply 100% initially
    } else {
      info.classList.add('visible');
      document.getElementById('solarVal').textContent = 'Keine nutzbaren Dachfl\u00E4chen';
      document.getElementById('solarLabel').textContent = 'Das Geb\u00E4ude hat kein verwertbares Solarpotential.';
    }
  } catch (e) {
    loading.style.display = 'none';
    info.classList.add('visible');
    document.getElementById('solarVal').textContent = 'Fehler';
    document.getElementById('solarLabel').textContent = 'Solardaten konnten nicht abgerufen werden.';
  }
}


/* \u2500\u2500 ElCom Tariff Auto-Detection \u2500\u2500 */

function onTariffCategoryChange() {
  const bfsNr = document.getElementById('addrDropdown').dataset.bfsNr;
  if (bfsNr) {
    fetchElcomTariff(bfsNr);
  }
}

async function fetchElcomTariff(bfsNr, fallbackGemName = null) {
  const info = document.getElementById('tariffInfo');
  info.classList.remove('visible');
  document.getElementById('tariffLoading').style.display = 'block';

  try {
    const catSelect = document.getElementById('tariffCategorySelect');
    const categoryCode = catSelect ? catSelect.value : 'H4';
    const endpoint = 'https://lindas-cached.cluster.ldbar.ch/query';
    const query = `
PREFIX cube: <https://cube.link/>
PREFIX schema: <http://schema.org/>

SELECT ?operator ?total ?energy ?gridusage ?charge ?aidfee ?period WHERE {
  ?obs a cube:Observation ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/municipality> <https://ld.admin.ch/municipality/${bfsNr}> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/category> <https://energy.ld.admin.ch/elcom/electricityprice/category/${categoryCode}> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/product> <https://energy.ld.admin.ch/elcom/electricityprice/product/standard> .
       
  OPTIONAL { 
    ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/operator> ?opUri .
    ?opUri schema:name ?operator .
  }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/period> ?period }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/total> ?total }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/energy> ?energy }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/gridusage> ?gridusage }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/charge> ?charge }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/aidfee> ?aidfee }
} ORDER BY DESC(?period) LIMIT 1
`;

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'query=' + encodeURIComponent(query)
    });

    if (r.ok) {
      const data = await r.json();
      const bindings = data?.results?.bindings;
      if (bindings && bindings.length > 0) {
        const b = bindings[0];
        const operatorName = b.operator?.value || 'Unbekannt';
        const total = parseFloat(b.total?.value || 0);
        const energy = parseFloat(b.energy?.value || 0);
        const gridusage = parseFloat(b.gridusage?.value || 0);
        const charge = parseFloat(b.charge?.value || 0);
        const aidfee = parseFloat(b.aidfee?.value || 0);

        applyTariff(operatorName, total, energy, gridusage, charge, aidfee);
        return; // Success
      } else {
        console.log(`LINDAS returned no results for BFS ${bfsNr} in 2026.`);
      }
    }
  } catch (e) {
    console.warn('LINDAS SPARQL fetch failed:', e);
  }

  // Fallback: If LINDAS fails or returns no data, try to apply operator from local data
  if (fallbackGemName) {
    applyOperatorOnly(fallbackGemName);
  } else if (window.lastOperatorName) {
    applyOperatorOnly(window.lastOperatorName);
  } else {
    document.getElementById('tariffLoading').style.display = 'none';
  }
}

// ── Formatierung & Hilfsfunktionen ──
function f(v, dec = 0) {
  return v.toLocaleString('de-CH', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function set(id, v) {
  const e = document.getElementById(id);
  if (e) e.textContent = v;
}

function clearCalc() {
  const ids = [
    'f-prod', 'f-prod2', 'f-no-e-kwh', 'f-no-e-chf', 'f-no-ei-kwh', 'f-no-ei-chf',
    'f-zev-e-kwh', 'f-zev-e-chf', 'f-zev-z-kwh', 'f-zev-z-chf', 'f-zev-ei-kwh', 'f-zev-ei-chf',
    'f-zev-pct', 'f-einspeis-pct', 'no-cf', 'no-amor', 'no-e-kwh', 'no-e-chf', 'no-ei-kwh',
    'no-ei-chf', 'zev-cf', 'zev-amor', 'zev-e-kwh', 'zev-e-chf', 'zev-z-kwh', 'zev-z-chf',
    'zev-ei-kwh', 'zev-ei-chf', 'zev-z-pct', 'zev-ei-pct', 'delta-chf',
    'y25-no-ein', 'y25-no-inv', 'y25-no-amor', 'y25-no-total',
    'y25-zev-ein', 'y25-zev-inv', 'y25-zev-op', 'y25-zev-amor', 'y25-zev-total',
    'k-einmalig', 'k-var', 'k-zev-e', 'k-ma', 'k-zv', 'k-wiederk', 'k-zev-j',
    'm-strom', 'm-zaehler', 'm-zev', 'm-total',
    'hk-invest', 'hk-unterhalt', 'hk-prod', 'hk-kwh', 'hk-kwh2', 'wb-val'
  ];
  ids.forEach(id => set(id, '\u2014'));
  set('delta-desc', 'Bitte f\u00FCllen Sie die Anlage- und Investitionsdaten in der Seitenleiste aus, um Resultate zu berechnen.');

  const wbTitle = document.getElementById('wb-title');
  if (wbTitle) wbTitle.textContent = 'Berechnung ausstehend';
  const wbDesc = document.getElementById('wb-desc');
  if (wbDesc) wbDesc.textContent = 'Es werden Anlagedaten ben\u00F6tigt, um den Ertrag \u00FCber 25 Jahre zu berechnen.';

  const chartEl = document.getElementById('timeline-chart');
  if (chartEl) chartEl.innerHTML = '';
  const crossLeg = document.getElementById('tl-crossover-leg');
  if (crossLeg) crossLeg.style.display = 'none';
}

// ── Input Validation ──
function clampInput(id, min, max, fallback) {
  const raw = +document.getElementById(id).value;
  if (isNaN(raw) || raw < min) return fallback;
  return Math.min(raw, max);
}

// ── Pure Calculation (no DOM access) ──
function calculateScenarios(inputs) {
  const { we, off, foe, pro, pctZev, pctEi, pctEigen, modul, hasBoiler, sp, ev, zt, zm } = inputs;

  // Herstellkosten (HK)
  const inv = off - foe;
  const uh25 = inv * 0.015 * 25;
  const tk25 = inv + uh25 + 4000 + 3000;
  const p25 = pro * 25 * 0.8;
  const hk = p25 > 0 ? tk25 / p25 : 0;

  // Number of meters & billing units
  const anzahlNe = we + 1;
  const anzahlZaehler = we + 1 + (tog.wp === 'ja' ? 1 : 0) + (tog.em === 'ja' ? 1 : 0) + (hasBoiler ? 1 : 0);

  // Server type
  const serverTyp = (we <= 15) ? 'S' : 'M';

  // ZEV Kosten Einmalig
  const vertragInkl = PREISKATALOG.vertrag.inkl_tl;
  const vertragZusatz = Math.max(0, we - vertragInkl) * PREISKATALOG.vertrag.zusatz_pro_tl;
  const vertragKosten = PREISKATALOG.vertrag.einmalig_basis + vertragZusatz;

  const grundkostenEinmalig =
    PREISKATALOG.server[serverTyp].einmalig
    + PREISKATALOG.einbau_server.einmalig
    + (tog.po === 'ja' ? PREISKATALOG.portal.einmalig : 0)
    + (tog.iz === 'ja' ? PREISKATALOG.internetzugang.einmalig : 0)
    + (tog.ma === 'ja' ? PREISKATALOG.machbarkeit.einmalig : 0)
    + (tog.be === 'ja' ? PREISKATALOG.begehung.einmalig : 0)
    + (tog.zv === 'ja' ? vertragKosten : 0);

  const kostenProZaehlerEinmalig =
    PREISKATALOG.zaehler.einmalig_pro_stueck
    + PREISKATALOG.abrechnungsmodul[modul].einmalig_pro_ne;

  const variableKostenEinmalig = anzahlZaehler * kostenProZaehlerEinmalig;
  const totE = grundkostenEinmalig + variableKostenEinmalig;

  // ZEV Kosten Wiederkehrend (pro Jahr)
  const grundkostenJaehrlich =
    PREISKATALOG.server[serverTyp].jaehrlich
    + (tog.po === 'ja' ? PREISKATALOG.portal.jaehrlich : 0)
    + (tog.iz === 'ja' ? PREISKATALOG.internetzugang.jaehrlich : 0);

  const variableKostenJaehrlich = anzahlNe * PREISKATALOG.abrechnungsmodul[modul].jaehrlich_pro_ne;
  const totW = grundkostenJaehrlich + (window.kuType === 'vermieter' ? variableKostenJaehrlich : 0);

  // Ohne ZEV (fixed 20/80)
  const no_e_kwh = pro * 0.20;
  const no_ei_kwh = pro * 0.80;
  const no_e_chf = no_e_kwh * sp;
  const no_ei_chf = no_ei_kwh * ev;
  const no_cf = no_e_chf + no_ei_chf;
  const no_amor = no_cf > 0 ? inv / no_cf : Infinity;

  // Mit ZEV (adjustable)
  const z_e_kwh = pro * pctEigen / 100;
  const z_z_kwh = pro * pctZev / 100;
  const z_ei_kwh = pro * pctEi / 100;
  const z_e_chf = z_e_kwh * sp;
  const z_z_chf = z_z_kwh * zt;
  const z_ei_chf = z_ei_kwh * ev;
  const z_cf = z_e_chf + z_z_chf + z_ei_chf;
  const z_amor = (z_cf - totW) > 0 ? (inv + totE) / (z_cf - totW) : Infinity;

  // Mieter
  const m_str = (z_z_kwh / we) * (sp - zt);
  const m_zk = zm * 12;
  const m_zev = window.kuType === 'mieter' ? -PREISKATALOG.abrechnungsmodul[modul].jaehrlich_pro_ne : 0;
  const m_tot = m_str + m_zk + m_zev;

  // 25 Jahre
  const yrs = 25;
  const no_ein25 = no_cf * yrs;
  const no_total25 = no_ein25 - tk25;
  const zev_ein25 = z_cf * yrs;
  const zev_inv25 = tk25 + totE;
  const zev_total25 = zev_ein25 - zev_inv25 - (totW * yrs);
  const gain25diff = zev_total25 - no_total25;

  // Timeline data
  const maintenance_per_year = (tk25 - inv) / yrs;
  const no_net_yearly = no_cf - maintenance_per_year;
  const zev_net_yearly = (z_cf - totW) - maintenance_per_year;
  const no_start_debt = inv;
  const zev_start_debt = inv + totE;

  const timeline = { noVals: [], zevVals: [], crossoverYear: null, maxVal: 0 };
  for (let y = 1; y <= yrs; y++) {
    const nv = (no_net_yearly * y) - no_start_debt;
    const zv = (zev_net_yearly * y) - zev_start_debt;
    timeline.noVals.push(nv);
    timeline.zevVals.push(zv);
    timeline.maxVal = Math.max(timeline.maxVal, Math.abs(nv), Math.abs(zv));
    if (timeline.crossoverYear === null && zv > nv) timeline.crossoverYear = y;
  }

  return {
    // Inputs forwarded
    we, pro, inv, modul, serverTyp, pctZev, pctEi, pctEigen,
    // Herstellkosten
    hk, uh25, tk25, p25,
    // ZEV Kosten
    totE, totW, anzahlNe, anzahlZaehler, vertragKosten,
    grundkostenEinmalig, variableKostenEinmalig, variableKostenJaehrlich,
    // Ohne ZEV
    no_e_kwh, no_ei_kwh, no_e_chf, no_ei_chf, no_cf, no_amor,
    // Mit ZEV
    z_e_kwh, z_z_kwh, z_ei_kwh, z_e_chf, z_z_chf, z_ei_chf, z_cf, z_amor,
    // Mieter
    m_str, m_zk, m_zev, m_tot,
    // 25 Jahre
    no_ein25, no_total25, zev_ein25, zev_inv25, zev_total25, gain25diff,
    // Timeline
    timeline
  };
}

// ── Hero Card Helper (DRY) ──
function updateHeroCardCompare(prefix, noVal, zevVal, noWins, badgeText, badgeClass) {
  set(`hc-${prefix}-no-val`, noVal);
  set(`hc-${prefix}-zev-val`, zevVal);

  const noBox = document.getElementById(`hc-${prefix}-no-box`);
  const zevBox = document.getElementById(`hc-${prefix}-zev-box`);
  if (!noBox || !zevBox) return;

  noBox.className = 'hc-side ' + (noWins ? 'is-winner' : 'is-loser');
  zevBox.className = 'hc-side ' + (noWins ? 'is-loser' : 'is-winner');

  const noBadge = document.getElementById(`hc-${prefix}-no-badge`);
  const zevBadge = document.getElementById(`hc-${prefix}-zev-badge`);
  if (noBadge) noBadge.style.display = noWins ? 'inline-block' : 'none';
  if (zevBadge) zevBadge.style.display = noWins ? 'none' : 'inline-block';

  if (badgeText !== undefined) {
    const badge = document.getElementById(`hc-${prefix}-badge`) || document.getElementById(`hc-rendite-badge`);
    if (badge) {
      badge.textContent = badgeText;
      badge.className = badgeClass || 'hc-foot-neu';
    }
  }
}

// ── Render: Flow Section ──
function renderFlowSection(r) {
  set('f-prod', f(r.pro) + ' kWh');
  set('f-prod2', f(r.pro) + ' kWh');
  set('f-no-e-kwh', f(Math.round(r.no_e_kwh)) + ' kWh');
  set('f-no-e-chf', f(r.no_e_chf, 2));
  set('f-no-ei-kwh', f(Math.round(r.no_ei_kwh)) + ' kWh');
  set('f-no-ei-chf', f(r.no_ei_chf, 2));
  set('f-zev-e-kwh', f(Math.round(r.z_e_kwh)) + ' kWh');
  set('f-zev-e-chf', f(r.z_e_chf, 2));
  set('f-zev-z-kwh', f(Math.round(r.z_z_kwh)) + ' kWh');
  set('f-zev-z-chf', f(r.z_z_chf, 2));
  set('f-zev-ei-kwh', f(Math.round(r.z_ei_kwh)) + ' kWh');
  set('f-zev-ei-chf', f(r.z_ei_chf, 2));
  set('f-zev-pct', r.pctZev + '%');
  set('f-einspeis-pct', r.pctEi + '%');
}

// ── Render: Compare Section ──
function renderCompareSection(r) {
  set('no-cf', f(r.no_cf, 2));
  set('no-amor', f(r.no_amor, 2) + ' Jahre');
  set('no-e-kwh', f(Math.round(r.no_e_kwh)) + ' kWh');
  set('no-e-chf', f(r.no_e_chf, 2) + ' CHF');
  set('no-ei-kwh', f(Math.round(r.no_ei_kwh)) + ' kWh');
  set('no-ei-chf', f(r.no_ei_chf, 2) + ' CHF');

  set('zev-cf', f(r.z_cf, 2));
  set('zev-amor', (isFinite(r.z_amor) ? f(r.z_amor, 2) : '\u2014') + ' Jahre');
  set('zev-e-kwh', f(Math.round(r.z_e_kwh)) + ' kWh');
  set('zev-e-chf', f(r.z_e_chf, 2) + ' CHF');
  set('zev-z-kwh', f(Math.round(r.z_z_kwh)) + ' kWh');
  set('zev-z-chf', f(r.z_z_chf, 2) + ' CHF');
  set('zev-ei-kwh', f(Math.round(r.z_ei_kwh)) + ' kWh');
  set('zev-ei-chf', f(r.z_ei_chf, 2) + ' CHF');
  set('zev-z-pct', r.pctZev + '%');
  set('zev-ei-pct', r.pctEi + '%');

  // Delta
  const diff = r.z_cf - r.no_cf;
  const isDiffPositive = diff >= 0;
  document.getElementById('delta-chf').textContent = (isDiffPositive ? '+' : '\u2212') + f(Math.round(Math.abs(diff)));

  if (isDiffPositive) {
    set('delta-desc', `Mit ZEV erzielen Sie ${f(Math.round(diff))} CHF mehr Einnahmen pro Jahr. Dies entspricht ${f(diff / r.no_cf * 100, 1)}% mehr j\u00E4hrliche Rendite als ohne ZEV.`);
  } else {
    set('delta-desc', `Ohne ZEV erzielen Sie ${f(Math.round(Math.abs(diff)))} CHF mehr Einnahmen pro Jahr. ZEV reduziert Ihre j\u00E4hrliche Rendite um ${f(Math.abs(diff / r.no_cf * 100), 1)}%.`);
  }

  return diff;
}

// ── Render: Hero Cards ──
function renderHeroCards(r, diff) {
  const zevWinsCf = r.z_cf >= r.no_cf;
  const cfBadgeText = `Differenz: ${(diff >= 0 ? '+' : '\u2212')} ${f(Math.round(Math.abs(diff)))} CHF / Jahr`;
  updateHeroCardCompare('cf', f(Math.round(r.no_cf)) + ' CHF', f(Math.round(r.z_cf)) + ' CHF',
    !zevWinsCf, cfBadgeText, diff >= 0 ? 'hc-foot-pos' : 'hc-foot-neg');
  // Manually set rendite-badge since it has a different ID pattern
  const cfBadge = document.getElementById('hc-rendite-badge');
  if (cfBadge) { cfBadge.textContent = cfBadgeText; cfBadge.className = diff >= 0 ? 'hc-foot-pos' : 'hc-foot-neg'; }

  // Amortisation
  const fmtAmor = (val) => (isFinite(val) && val > 0 && val < 99) ? f(val, 1) + ' Jahre' : '> 25 Jahre';
  const aNo = (isFinite(r.no_amor) && r.no_amor > 0 && r.no_amor < 99) ? r.no_amor : Infinity;
  const aZev = (isFinite(r.z_amor) && r.z_amor > 0 && r.z_amor < 99) ? r.z_amor : Infinity;
  const zevWinsAmor = (aZev <= aNo) && isFinite(aZev);
  const noWinsAmor = (aNo < aZev) && isFinite(aNo);

  set('hc-am-no-val', fmtAmor(r.no_amor));
  const hcAmNoBox = document.getElementById('hc-am-no-box');
  if (hcAmNoBox) {
    hcAmNoBox.className = 'hc-side ' + (noWinsAmor ? 'is-winner' : (zevWinsAmor ? 'is-loser' : ''));
    document.getElementById('hc-am-no-badge').style.display = noWinsAmor ? 'inline-block' : 'none';
  }
  set('hc-am-zev-val', fmtAmor(r.z_amor));
  const hcAmZevBox = document.getElementById('hc-am-zev-box');
  if (hcAmZevBox) {
    hcAmZevBox.className = 'hc-side ' + (zevWinsAmor ? 'is-winner' : (noWinsAmor ? 'is-loser' : ''));
    document.getElementById('hc-am-zev-badge').style.display = zevWinsAmor ? 'inline-block' : 'none';
  }
  const amBadge = document.getElementById('hc-am-badge');
  if (amBadge) {
    if (!isFinite(aNo) && !isFinite(aZev)) {
      amBadge.textContent = 'Beide unwirtschaftlich'; amBadge.className = 'hc-foot-neg';
    } else if (!isFinite(aNo)) {
      amBadge.textContent = 'Ohne ZEV nicht amortisierbar'; amBadge.className = 'hc-foot-pos';
    } else if (!isFinite(aZev)) {
      amBadge.textContent = 'Mit ZEV nicht amortisierbar'; amBadge.className = 'hc-foot-neg';
    } else {
      const amDiff = aZev - aNo;
      amBadge.textContent = `Differenz: ${(amDiff > 0 ? '+' : '\u2212')} ${f(Math.abs(amDiff), 1)} Jahre`;
      amBadge.className = amDiff <= 0 ? 'hc-foot-pos' : 'hc-foot-neg';
    }
  }

  // 25 Jahre Hero
  const zevWins25 = r.zev_total25 >= r.no_total25;
  updateHeroCardCompare('25', f(Math.round(r.no_total25)) + ' CHF', f(Math.round(r.zev_total25)) + ' CHF', !zevWins25);
  const y25Badge = document.getElementById('hc-25-badge');
  if (y25Badge) {
    const y25Diff = r.zev_total25 - r.no_total25;
    y25Badge.textContent = `Differenz: ${(y25Diff >= 0 ? '+' : '\u2212')} ${f(Math.round(Math.abs(y25Diff)))} CHF`;
    y25Badge.className = y25Diff >= 0 ? 'hc-foot-pos' : 'hc-foot-neg';
  }

  // Mieter Hero
  const zevWinsMieter = r.m_tot > 0;
  set('hc-mi-zev-val', f(r.m_tot, 2) + ' CHF');
  const hcMiZevBox = document.getElementById('hc-mi-zev-box');
  if (hcMiZevBox) {
    hcMiZevBox.className = 'hc-side ' + (zevWinsMieter ? 'is-winner' : 'is-loser');
    document.getElementById('hc-mi-zev-badge').style.display = zevWinsMieter ? 'inline-block' : 'none';
    document.getElementById('hc-mi-no-box').className = 'hc-side ' + (!zevWinsMieter ? 'is-winner' : 'is-loser');
    const miBadge = document.getElementById('hc-mi-badge');
    if (zevWinsMieter) {
      miBadge.textContent = 'Win-Win f\u00FCr alle Parteien'; miBadge.className = 'hc-foot-pos';
    } else {
      miBadge.textContent = 'Keine Ersparnis f\u00FCr Mieter'; miBadge.className = 'hc-foot-neg';
    }
  }
}

// ── Render: 25 Jahre Section ──
function render25Jahre(r) {
  const signNoEin = r.no_ein25 < 0 ? '\u2212' : '+';
  set('y25-no-ein', signNoEin + f(Math.abs(Math.round(r.no_ein25))) + ' CHF');
  set('y25-no-inv', '\u2212' + f(Math.abs(Math.round(r.inv))) + ' CHF');
  set('y25-no-amor', f(r.no_amor, 1) + ' Jahre');
  set('y25-no-total', f(Math.round(r.no_total25)) + ' CHF');

  const signZevEin = r.zev_ein25 < 0 ? '\u2212' : '+';
  set('y25-zev-ein', signZevEin + f(Math.abs(Math.round(r.zev_ein25))) + ' CHF');
  set('y25-zev-inv', '\u2212' + f(Math.abs(Math.round(r.zev_inv25))) + ' CHF');
  set('y25-zev-op', '\u2212' + f(Math.abs(Math.round(r.totW * 25))) + ' CHF');
  set('y25-zev-amor', (isFinite(r.z_amor) ? f(r.z_amor, 1) : '\u2014') + ' Jahre');
  set('y25-zev-total', f(Math.round(r.zev_total25)) + ' CHF');
}

// ── Render: Timeline Chart ──
function renderTimeline(r) {
  const chartEl = document.getElementById('timeline-chart');
  chartEl.innerHTML = '';

  const { noVals, zevVals, crossoverYear, maxVal } = r.timeline;
  const scale = v => Math.min(48, Math.abs(v) / maxVal * 45);
  const showYears = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25];

  showYears.forEach(y => {
    const nv = noVals[y - 1];
    const zv = zevVals[y - 1];
    const row = document.createElement('div');
    row.className = 'tl-row';

    const nDir = nv >= 0 ? 'pos' : 'neg';
    const zDir = zv >= 0 ? 'pos' : 'neg';
    const noLabel = (nv >= 0 ? '+' : '') + f(Math.round(nv / 1000), 1) + 'k';
    const zevLabel = (zv >= 0 ? '+' : '') + f(Math.round(zv / 1000), 1) + 'k';

    row.innerHTML = `
        <div class="tl-year">Jahr ${y}</div>
        <div class="tl-bars">
          <div class="tl-bar-row">
            <div class="tl-bar no ${nDir}" style="width:${scale(nv)}%;"></div>
            <span class="tl-bar-val ${nDir}" style="--bar-width:${scale(nv)}%; color:${nv >= 0 ? 'var(--charcoal)' : 'var(--strawberry)'}">${noLabel}</span>
          </div>
          <div class="tl-bar-row">
            <div class="tl-bar zev ${zDir}" style="width:${scale(zv)}%;"></div>
            <span class="tl-bar-val ${zDir}" style="--bar-width:${scale(zv)}%; color:${zv >= 0 ? 'var(--charcoal)' : 'var(--cerulean)'}">${zevLabel}</span>
          </div>
        </div>`;
    chartEl.appendChild(row);
  });

  // Crossover legend
  const crossLeg = document.getElementById('tl-crossover-leg');
  if (crossoverYear) {
    crossLeg.style.display = 'flex';
    document.getElementById('tl-crossover-text').textContent =
      `Ab Jahr ${crossoverYear} \u00FCbertreffen die kumulierten ZEV-Ertr\u00E4ge jene ohne ZEV`;
  } else {
    crossLeg.style.display = 'none';
  }
}

// ── Render: Kosten Section ──
function renderKosten(r) {
  const { serverTyp, modul, totE, totW, variableKostenEinmalig, variableKostenJaehrlich, vertragKosten, anzahlZaehler } = r;
  set('k-einmalig', f(totE) + ' CHF');

  const makeRow = (lbl, val) => `<div class="kost-row"><span class="kr-label">${lbl}</span><span class="kr-val">${val}</span></div>`;
  const isToggled = (key) => (tog[key] || 'nein') === 'ja';

  let eHtml = '';
  eHtml += makeRow(`Server & Grundsetup (${PREISKATALOG.server[serverTyp].label})`, f(PREISKATALOG.server[serverTyp].einmalig + PREISKATALOG.einbau_server.einmalig));
  eHtml += makeRow(`Hardware & Setup pro WE+1 (${anzahlZaehler}x)`, f(variableKostenEinmalig));
  if (isToggled('po')) eHtml += makeRow('PV & EMS Nutzerportal', f(PREISKATALOG.portal.einmalig));
  if (isToggled('iz')) eHtml += makeRow('Internetzugang Server', f(PREISKATALOG.internetzugang.einmalig));
  if (isToggled('ma')) eHtml += makeRow('Machbarkeitsabkl\u00E4rung', f(PREISKATALOG.machbarkeit.einmalig));
  if (isToggled('be')) eHtml += makeRow('Begehung vor Ort', f(PREISKATALOG.begehung.einmalig));
  if (isToggled('zv')) eHtml += makeRow('ZEV Vertragserstellung', f(vertragKosten));
  document.getElementById('kosten-einmalig-rows').innerHTML = eHtml;

  set('k-wiederk', f(totW) + ' CHF');
  let wHtml = '';
  wHtml += makeRow(`Server Abo (${PREISKATALOG.server[serverTyp].label})`, f(PREISKATALOG.server[serverTyp].jaehrlich));
  if (isToggled('po')) wHtml += makeRow('PV & EMS Nutzerportal', f(PREISKATALOG.portal.jaehrlich));
  if (isToggled('iz')) wHtml += makeRow('Internetzugang Server', f(PREISKATALOG.internetzugang.jaehrlich));
  if (window.kuType === 'mieter') {
    wHtml += `<div class="kost-row" style="opacity:0.5;"><span class="kr-label" style="text-decoration:line-through;">Abrechnungsmodul (${PREISKATALOG.abrechnungsmodul[modul].label})</span><span class="kr-val" style="text-decoration:line-through;">${f(variableKostenJaehrlich)}</span></div>`;
    wHtml += `<div style="font-size:10.5px; color:var(--brand-cyan-dark); text-align:right; margin-top:-4px; margin-bottom:6px; font-weight:600;">Direkt \u00FCber Mieter-Nebenkosten finanziert</div>`;
  } else {
    wHtml += makeRow(`Abrechnungsmodul (${PREISKATALOG.abrechnungsmodul[modul].label})`, f(variableKostenJaehrlich));
  }
  document.getElementById('kosten-wiederkehrend-rows').innerHTML = wHtml;
}

// ── Render: Mieter & HK Section ──
function renderMieterAndHK(r) {
  set('m-strom', f(r.m_str, 2) + ' CHF');
  set('m-zaehler', f(r.m_zk, 2) + ' CHF');
  set('m-zev', f(r.m_zev, 2) + ' CHF');
  set('m-total', f(r.m_tot, 2) + ' CHF');

  set('hk-invest', f(r.inv) + ' CHF');
  set('hk-unterhalt', f(Math.round(r.uh25)) + ' CHF');
  set('hk-prod', f(Math.round(r.p25)) + ' kWh');
  set('hk-kwh', f(r.hk * 100, 2) + ' Rp./kWh');
  set('hk-kwh2', f(r.hk * 100, 2) + ' Rp./kWh');
}

// ── Render: Winner Box & Dynamic Styling ──
function renderWinnerStyling(r, diff) {
  const zevWins = r.gain25diff >= 0;

  set('wb-val', f(Math.round(Math.abs(r.gain25diff))));
  document.getElementById('delta-box').className = 'delta-box ' + (zevWins ? '' : 'is-negative');
  document.getElementById('sc-head-A').className = 'sc-head ' + (zevWins ? 'is-loser' : 'is-winner');
  document.getElementById('sc-head-B').className = 'sc-head ' + (zevWins ? 'is-winner' : 'is-loser');
  document.getElementById('yc-head-A').className = 'yr25-card-head ' + (zevWins ? 'is-loser' : 'is-winner');
  document.getElementById('yc-head-B').className = 'yr25-card-head ' + (zevWins ? 'is-winner' : 'is-loser');

  document.getElementById('sc-label-A').textContent = 'Szenario A' + (zevWins ? '' : ' \u2014 Empfohlen');
  document.getElementById('sc-label-B').textContent = 'Szenario B' + (zevWins ? ' \u2014 Empfohlen' : '');
  document.getElementById('yc-label-A').textContent = 'Szenario A' + (zevWins ? '' : ' \u2014 Empfohlen');
  document.getElementById('yc-label-B').textContent = 'Szenario B' + (zevWins ? ' \u2014 Empfohlen' : '');

  document.getElementById('wb-title').textContent = zevWins
    ? 'ZEV erzielt \u00FCber 25 Jahre einen h\u00F6heren Gesamtgewinn'
    : 'Ohne ZEV ist in diesem Szenario rentabler';
  document.getElementById('wb-desc').textContent = zevWins
    ? `Obwohl die Amortisationszeit mit ZEV ${f(Math.abs(r.z_amor - r.no_amor), 1)} Jahre l\u00E4nger dauert, ` +
    `\u00FCberwiegen die h\u00F6heren j\u00E4hrlichen Ertr\u00E4ge deutlich. Nach ${f(isFinite(r.z_amor) ? r.z_amor : 0, 1)} Jahren ` +
    `ist die Investition vollst\u00E4ndig amortisiert \u2014 danach erzielen Sie jedes Jahr ${f(Math.round(diff))} CHF mehr Ertrag.`
    : `In diesem Szenario fressen die wiederkehrenden ZEV-Kosten (Abrechnung etc.) den Gewinn der Stromeinsparung auf. ZEV ist hier ein Verlustgesch\u00E4ft im Vergleich zur einfachen \u00DCberschusseinspeisung.`;
}

// ══ Main Calculation Orchestrator ══
function calc() {
  const we = clampInput('anzahlWE', 1, 500, 1);
  const off = clampInput('offerte', 0, 10000000, 0);
  const foe = clampInput('foerderung', 0, 10000000, 0);
  const pro = clampInput('produktion', 0, 99999999, 0);

  if (off === 0 || pro === 0) {
    clearCalc();
    return;
  }

  const pctZev = +document.getElementById('sl-split').value;
  const pctEi = 80 - pctZev;
  const pctEigen = 20;

  const modul = document.getElementById('modulSelect').value || 'L';

  const r = calculateScenarios({
    we, off, foe, pro, pctZev, pctEi, pctEigen, modul,
    hasBoiler: tog.bo === 'ja',
    sp: T.sp / 100,
    ev: T.ev / 100,
    zt: T.zt / 100,
    zm: T.zm || 5.00
  });

  // Render all sections
  renderFlowSection(r);
  const diff = renderCompareSection(r);
  renderHeroCards(r, diff);
  render25Jahre(r);
  renderTimeline(r);
  renderKosten(r);
  renderMieterAndHK(r);
  renderWinnerStyling(r, diff);
}

['wp', 'em', 'ma', 'zv'].forEach(k => document.getElementById(`${k}-nein`).classList.add('on'));
calcAndUpdate();
onSplitSlider();

// ── Section Navigation ──
function scrollToSection(e, id) {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Intersection Observer for active nav pill
(function initSectionNav() {
  const sections = ['rendite', 'langzeit', 'stromfluss', 'kosten', 'mieter', 'herstellkosten'];
  const pills = document.querySelectorAll('.nav-pill');
  if (!pills.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        pills.forEach(p => p.classList.remove('active'));
        const idx = sections.indexOf(entry.target.id);
        if (idx >= 0 && pills[idx]) pills[idx].classList.add('active');
      }
    });
  }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
})();

// ── Rendite Accordion ──
function toggleRenditeDetails() {
  const toggles = document.querySelectorAll('.sc-details-toggle');
  const details = document.querySelectorAll('.sc-details');
  if (!toggles.length) return;

  const isOpening = !toggles[0].classList.contains('open');

  toggles.forEach(t => {
    t.classList.toggle('open', isOpening);
    const textSpan = t.querySelector('.sc-dt-text');
    if (textSpan) textSpan.textContent = isOpening ? 'Details ausblenden' : 'Details einblenden';
  });

  details.forEach(d => {
    d.classList.toggle('open', isOpening);
  });
}

// ── Tabs (Übersicht vs Details) ──
function switchTab(tabId) {
  document.getElementById('tab-summary').style.display = (tabId === 'summary') ? 'block' : 'none';
  document.getElementById('tab-details').style.display = (tabId === 'details') ? 'block' : 'none';
  document.getElementById('btn-tab-summary').classList.toggle('active', tabId === 'summary');
  document.getElementById('btn-tab-details').classList.toggle('active', tabId === 'details');
  document.getElementById('sectionNav').style.display = (tabId === 'details') ? 'flex' : 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Default state: hide detailed section nav initially
document.getElementById('sectionNav').style.display = 'none';

// ══════════════════════════════════════════════════════════════════
// CO₂-Fussabdruck — Electricity Maps Integration
// ══════════════════════════════════════════════════════════════════

const CO2 = {
  API_BASE: 'https://api.electricitymap.org/v3',
  API_KEY: 'vznExkmHd5EKqUe6DUdl',
  ZONE: 'CH',
  PV_LIFECYCLE: 26, // gCO2eq/kWh (IPCC median for crystalline silicon PV)
  FALLBACK_GRID: 70, // gCO2eq/kWh (Swiss average fallback)

  _cache: null,
  _cacheTime: 0,
  _mixCache: null,
  CACHE_MS: 60 * 60 * 1000, // 1 hour

  async getIntensity() {
    if (this._cache && (Date.now() - this._cacheTime < this.CACHE_MS)) {
      return this._cache;
    }
    try {
      const r = await fetch(`${this.API_BASE}/carbon-intensity/latest?zone=${this.ZONE}`, {
        headers: { 'auth-token': this.API_KEY }
      });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      this._cache = { intensity: d.carbonIntensity, datetime: d.datetime, live: true };
      this._cacheTime = Date.now();
      return this._cache;
    } catch (e) {
      console.warn('Electricity Maps API error:', e);
      return { intensity: this.FALLBACK_GRID, datetime: null, live: false };
    }
  },

  async getPowerBreakdown() {
    if (this._mixCache && (Date.now() - this._cacheTime < this.CACHE_MS)) {
      return this._mixCache;
    }
    try {
      const r = await fetch(`${this.API_BASE}/power-breakdown/latest?zone=${this.ZONE}`, {
        headers: { 'auth-token': this.API_KEY }
      });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      this._mixCache = d;
      return d;
    } catch (e) {
      console.warn('Power breakdown error:', e);
      return null;
    }
  },

  calculate(produktionKwh, gridCO2) {
    const diffG = Math.max(0, gridCO2 - this.PV_LIFECYCLE);
    const savingKg = (produktionKwh * diffG) / 1000;
    const saving25t = (savingKg * 25) / 1000;
    return {
      savingKgYear: Math.round(savingKg),
      saving25Tonnes: saving25t.toFixed(1),
      gridCO2,
      diffG,
      autoKm: Math.round(savingKg / 0.12),        // ~120g CO2/km
      trees: Math.round(savingKg / 12.5),           // ~12.5 kg CO2/tree/year
      flights: (savingKg / 500).toFixed(1)           // ~500kg per ZH-Mallorca return
    };
  }
};

// Update CO2 display — called after calc()
async function updateCO2() {
  const pro = +document.getElementById('produktion').value || 0;
  if (pro === 0) return;

  const grid = await CO2.getIntensity();

  const result = CO2.calculate(pro, grid.intensity);

  // Hero card
  set('co2-saving-year', f(result.savingKgYear));
  set('co2-saving-25y', result.saving25Tonnes);
  set('co2-grid-intensity', f(Math.round(grid.intensity)));

  // Live badge
  const badge = document.getElementById('co2-live-badge');
  if (badge) badge.style.display = grid.live ? 'flex' : 'none';

  // Comparisons
  const cmpEl = document.getElementById('co2-comparisons');
  const toggleBtn = document.querySelector('.co2-details-toggle');

  if (cmpEl && toggleBtn && result.savingKgYear > 0) {
    toggleBtn.style.display = 'flex';
    // Let the CSS classes handle display for cmpEl when opened, don't force 'flex' directly on load
    set('co2-cmp-auto', f(result.autoKm));
    set('co2-cmp-trees', f(result.trees));
    set('co2-cmp-flights', result.flights);
  } else if (toggleBtn && cmpEl) {
    toggleBtn.style.display = 'none';
    cmpEl.classList.remove('open');
    toggleBtn.classList.remove('open');
  }

  // Source
  const srcEl = document.getElementById('co2-source');
  if (srcEl) {
    if (grid.live && grid.datetime) {
      const dt = new Date(grid.datetime);
      srcEl.textContent = `Electricity Maps · CH · ${dt.toLocaleString('de-CH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`;
    } else {
      srcEl.textContent = 'Electricity Maps · CH · Durchschnittswert (offline)';
    }
  }

  // Detail section
  set('co2d-grid', f(Math.round(grid.intensity)) + ' gCO₂eq/kWh');
  set('co2d-diff', f(Math.round(result.diffG)) + ' gCO₂eq/kWh');
  set('co2d-prod', f(pro) + ' kWh/Jahr');
  set('co2d-saving', f(result.savingKgYear) + ' kg CO₂/Jahr');
  set('co2d-saving25', result.saving25Tonnes + ' Tonnen CO₂');

  // Power mix
  updatePowerMix();
}

async function updatePowerMix() {
  const mix = await CO2.getPowerBreakdown();
  const container = document.getElementById('co2-mix-bars');
  if (!container || !mix) return;

  const consumption = mix.powerConsumptionBreakdown || {};
  const total = mix.powerConsumptionTotal || 0;
  if (total <= 0) return;

  // Define display order and colors
  const sources = [
    { key: 'hydro', label: 'Wasserkraft', color: '#3B82F6' },
    { key: 'nuclear', label: 'Kernenergie', color: '#8B5CF6' },
    { key: 'solar', label: 'Solar', color: '#F59E0B' },
    { key: 'wind', label: 'Wind', color: '#06B6D4' },
    { key: 'biomass', label: 'Biomasse', color: '#22C55E' },
    { key: 'gas', label: 'Gas', color: '#EF4444' },
    { key: 'coal', label: 'Kohle', color: '#6B7280' },
    { key: 'geothermal', label: 'Geothermie', color: '#D97706' },
    { key: 'unknown', label: 'Andere', color: '#9CA3AF' }
  ];

  let html = '';
  sources.forEach(s => {
    const val = consumption[s.key] || 0;
    if (val <= 0) return;
    const pct = (val / total * 100).toFixed(1);
    // Values are numeric from API — safe to interpolate, but we escape the label
    const safeLabel = s.label.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
    html += `
      <div class="co2-mix-row">
        <span class="co2-mix-label">${safeLabel}</span>
        <div class="co2-mix-track">
          <div class="co2-mix-fill" style="width:${parseFloat(pct)}%; background:${s.color}"></div>
        </div>
        <span class="co2-mix-pct">${parseFloat(pct)}%</span>
      </div>`;
  });

  container.innerHTML = html;

  const timeEl = document.getElementById('co2-mix-time');
  if (timeEl && mix.datetime) {
    const dt = new Date(mix.datetime);
    timeEl.textContent = `Stand: ${dt.toLocaleString('de-CH')} · Quelle: Electricity Maps`;
  }
}

// Hook CO2 update into the main calc function — clean wrapper
function calcAndUpdate() {
  calc();
  updateCO2();
}

// CO2 comparisons toggle logic
function toggleCo2Details(btn) {
  const compEl = document.getElementById('co2-comparisons');
  if (!compEl) return;

  const isOpening = !compEl.classList.contains('open');
  compEl.classList.toggle('open', isOpening);
  btn.classList.toggle('open', isOpening);

  const textSpan = btn.querySelector('.co2-dt-text');
  if (textSpan) {
    textSpan.textContent = isOpening ? 'Details ausblenden' : 'Details einblenden';
  }
}

// Initial fetch on load
updateCO2();
