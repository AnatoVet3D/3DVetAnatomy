// =====================================================
//  Medidas 3D Slicer (reutilizable en cualquier visor)
// =====================================================
// Line .mrk.json en LPS mm. Mismo script/CSS/HTML en otro modelo:
// cambiar solo el UID de Sketchfab y los archivos de la carpeta medidas/.
// Opcional: window.SLICER_MEASURE_DIR (por defecto "medidas")
//           window.SLICER_FBX_GLOBAL_SCALE (por defecto 0.1)
//
// Funciones que se llaman desde el HTML / main.js del visor:
//   startSlicerMeasurements(api)  → arranca la carga al estar listo Sketchfab
//   toggleMeasurePanel(event)     → abre/cierra el panel del botón Medidas

const SLICER_MEASURE_DIR = String(window.SLICER_MEASURE_DIR || 'medidas').replace(/\/+$/, '');
const SLICER_FBX_GLOBAL_SCALE = Number(window.SLICER_FBX_GLOBAL_SCALE) > 0
  ? Number(window.SLICER_FBX_GLOBAL_SCALE)
  : 0.1;

let slicerMeasures = [];
let measureViews = [];
let measureTransform = null;
let measureRaf = 0;
let measureProjectBusy = false;
let measureTrackingBound = false;
let measuresLoadStarted = false;
let measurePanelOpen = false;
let measureApiRef = null;

// URL de un archivo o de la carpeta medidas/
function measureDirUrl(file) {
  const base = SLICER_MEASURE_DIR + '/';
  return file ? base + encodeURIComponent(file) : base;
}

// Quita duplicados y deja solo nombres *.mrk.json, ordenados
function uniqueMarkupFilenames(files) {
  const seen = {};
  const out = [];
  (files || []).forEach(function (raw) {
    const name = String(raw || '').replace(/\\/g, '/').split('/').pop().trim();
    const key = name.toLowerCase();
    if (!/\.mrk\.json$/i.test(name) || seen[key]) return;
    seen[key] = true;
    out.push(name);
  });
  out.sort(function (a, b) {
    return a.localeCompare(b, 'es', { sensitivity: 'base' });
  });
  return out;
}

// Interpreta medidas/index.json (lista o { files: [...] })
function filenamesFromIndexData(data) {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return filenamesFromDirectoryHtml(data);
    }
  }
  if (!data) return [];
  if (Array.isArray(data)) return uniqueMarkupFilenames(data);
  if (Array.isArray(data.files)) return uniqueMarkupFilenames(data.files);
  return [];
}

// Extrae enlaces .mrk.json de un listado HTML de carpeta (servidor local)
function filenamesFromDirectoryHtml(html) {
  const files = [];
  const re = /href\s*=\s*["']([^"']+\.mrk\.json)["']/gi;
  let m;
  while ((m = re.exec(html || ''))) {
    try {
      files.push(decodeURIComponent(m[1]));
    } catch (e) {
      files.push(m[1]);
    }
  }
  return uniqueMarkupFilenames(files);
}

// Si el visor está en GitHub Pages, URL de la API para listar la carpeta medidas/
function githubMeasureContentsUrl() {
  const host = location.hostname || '';
  if (!/\.github\.io$/i.test(host)) return '';
  const user = host.split('.')[0];
  const segs = (location.pathname || '').split('/').filter(Boolean);
  if (segs.length < 2) return '';
  const repo = segs[0];
  const folder = segs.slice(1, -1).concat(SLICER_MEASURE_DIR).join('/');
  return 'https://api.github.com/repos/' + user + '/' + repo + '/contents/' + folder;
}

// Descarga una fuente de nombres de archivo (index, carpeta o GitHub)
function fetchMarkupFilenameList(url, parse, done) {
  if (!url) {
    done([]);
    return;
  }
  fetch(url, { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error(res.status);
      const type = (res.headers.get('content-type') || '').toLowerCase();
      if (type.indexOf('json') !== -1) return res.json();
      return res.text();
    })
    .then(function (data) {
      done(parse(data) || []);
    })
    .catch(function () {
      done([]);
    });
}

// Junta todas las fuentes y devuelve los .mrk.json disponibles (sin hardcodear nombres)
function listMarkupFiles(done) {
  const sources = [
    [measureDirUrl('index.json'), filenamesFromIndexData],
    [measureDirUrl(), function (data) {
      return typeof data === 'string' ? filenamesFromDirectoryHtml(data) : filenamesFromIndexData(data);
    }],
    [githubMeasureContentsUrl(), function (data) {
      if (!Array.isArray(data)) return [];
      return uniqueMarkupFilenames(data.map(function (item) {
        return item && item.type === 'file' ? item.name : '';
      }));
    }]
  ];
  let pending = sources.length;
  let merged = [];
  sources.forEach(function (pair) {
    fetchMarkupFilenameList(pair[0], pair[1], function (files) {
      merged = merged.concat(files);
      pending--;
      if (pending === 0) done(uniqueMarkupFilenames(merged));
    });
  });
}

// Nombre en pantalla: el del JSON si existe; si no, el del archivo .mrk.json
function markupDisplayName(filename, mk) {
  const fromJson = mk && (mk.name || mk.label || mk.title);
  if (fromJson && String(fromJson).trim() && !/^line$/i.test(String(fromJson).trim())) {
    return String(fromJson).trim();
  }
  let s = String(filename || '').replace(/\.mrk\.json$/i, '');
  s = s.replace(/([a-z])([A-Z])/g, '$1 $2');
  s = s.replace(/[_\-]+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s || filename;
}

// Pie de etiqueta: "nombre" + "valor unidad" (coma decimal española)
function formatMeasureCaption(name, value, units) {
  const n = Number(value);
  const num = Number.isFinite(n)
    ? n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(value);
  const u = units || 'mm';
  return { name: name, value: num + ' ' + u };
}

// Distancia 3D por si el JSON no trae measurements.value
function dist3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// Lee un .mrk.json de tipo Line: dos puntos LPS, valor y unidades
function parseMarkupFile(filename, json) {
  const out = [];
  const markups = (json && json.markups) || [];
  markups.forEach(function (mk, idx) {
    if (!mk || String(mk.type).toLowerCase() !== 'line') return;
    const pts = (mk.controlPoints || []).filter(function (p) {
      return p && p.position && p.position.length >= 3;
    });
    if (pts.length < 2) return;
    const meas = (mk.measurements || []).find(function (m) {
      return m && m.enabled !== false && typeof m.value === 'number';
    }) || (mk.measurements || [])[0];
    const p1 = pts[0].position;
    const p2 = pts[1].position;
    const value = meas && typeof meas.value === 'number' ? meas.value : dist3(p1, p2);
    const units = (meas && meas.units) || mk.coordinateUnits || 'mm';
    let name = markupDisplayName(filename, mk);
    if (markups.length > 1) name = name + ' (' + (idx + 1) + ')';
    out.push({
      name: name,
      lps1: [Number(p1[0]), Number(p1[1]), Number(p1[2])],
      lps2: [Number(p2[0]), Number(p2[1]), Number(p2[2])],
      value: value,
      units: units
    });
  });
  return out;
}

// Descarga todos los .mrk.json encontrados y los convierte en medidas
function loadSlicerMarkupFiles(done) {
  listMarkupFiles(function (files) {
    if (!files.length) {
      slicerMeasures = [];
      done(slicerMeasures);
      return;
    }
    let pending = files.length;
    const collected = [];
    files.forEach(function (file) {
      fetch(measureDirUrl(file), { cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          return res.json();
        })
        .then(function (json) {
          parseMarkupFile(file, json).forEach(function (m) { collected.push(m); });
        })
        .catch(function (err) {
          console.warn('No se pudo leer', file, err);
        })
        .then(function () {
          pending--;
          if (pending === 0) {
            slicerMeasures = collected;
            done(slicerMeasures);
          }
        });
    });
  });
}

// Multiplica un punto por una matriz 4x4 en column-major (como Sketchfab)
function applyMat4Col(m, p) {
  const x = p[0], y = p[1], z = p[2];
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14]
  ];
}

// Normaliza getMatrix() de Sketchfab (array, objeto con índices o .elements)
function asMatrix16(m) {
  if (!m) return null;
  if (Array.isArray(m) && m.length >= 16) return m.slice(0, 16);
  if (m.elements && m.elements.length >= 16) return Array.prototype.slice.call(m.elements, 0, 16);
  if (typeof m[0] === 'number' && typeof m[15] === 'number') {
    const out = [];
    for (let i = 0; i < 16; i++) out.push(m[i]);
    return out;
  }
  return null;
}

// Prefiere la matriz world del nodo; si no, la local
function extractWorldMatrix(result) {
  if (!result) return null;
  return asMatrix16(result.world) || asMatrix16(result.local) || asMatrix16(result);
}

// LPS mm de Slicer → espacio del FBX (misma orientación, escala global 0.1)
function slicerLpsToFbx(p) {
  return [p[0] * SLICER_FBX_GLOBAL_SCALE, p[1] * SLICER_FBX_GLOBAL_SCALE, p[2] * SLICER_FBX_GLOBAL_SCALE];
}

// Transformación fija: LPS × escala FBX y luego la matriz world de Sketchfab
function makeSlicerToSketchfabTransform(worldMatrix) {
  return function (lps) {
    const fbx = slicerLpsToFbx(lps);
    if (!worldMatrix) return fbx;
    return applyMat4Col(worldMatrix, fbx);
  };
}

// instanceID del nodo .fbx (o RootNode) para leer su matriz world
function fbxNodeInstanceIdFromNodes(nodes) {
  let id = null;
  Object.keys(nodes || {}).forEach(function (key) {
    const node = nodes[key];
    if (node && node.name && /\.fbx$/i.test(node.name)) id = node.instanceID;
  });
  if (id == null) {
    Object.keys(nodes || {}).forEach(function (key) {
      const node = nodes[key];
      if (node && node.name === 'RootNode') id = node.instanceID;
    });
  }
  return id;
}

// Lee la matriz world del modelo en Sketchfab (cómo interpreta el FBX)
function getSketchfabModelWorldMatrix(api, done) {
  if (!api || !api.getNodeMap || !api.getMatrix) {
    done(null);
    return;
  }
  api.getNodeMap(function (err, nodes) {
    const id = fbxNodeInstanceIdFromNodes(err ? null : nodes);
    if (id == null) {
      done(null);
      return;
    }
    api.getMatrix(id, function (mErr, result) {
      done(!mErr ? extractWorldMatrix(result) : null);
    });
  });
}

// Un punto 3D → píxeles del canvas del visor
function worldToScreenP(api, pos, done) {
  api.getWorldToScreenCoordinates(pos, function (coord) {
    done(coord && coord.canvasCoord ? coord.canvasCoord : null);
  });
}

// Proyecta varios puntos 3D a pantalla (para las dos puntas de cada línea)
function projectPositions(api, positions, done) {
  if (!positions.length) {
    done([]);
    return;
  }
  const out = new Array(positions.length);
  let left = positions.length;
  positions.forEach(function (p, i) {
    worldToScreenP(api, p, function (xy) {
      out[i] = xy;
      left--;
      if (left === 0) done(out);
    });
  });
}

// Si no hay medidas, oculta el botón Medidas
function setMeasureUiAvailable(on) {
  const menu = document.querySelector('.measure-menu');
  if (menu) menu.hidden = !on;
  const row = document.querySelector('.tool-row');
  if (row) row.classList.toggle('no-measures', !on);
}

// Crea líneas SVG + etiquetas HTML, una por medida cargada
function buildMeasureDom(measures) {
  const svg = document.getElementById('measureLayer');
  const box = document.getElementById('measureLabels');
  if (!svg || !box) return;
  svg.innerHTML = '';
  box.innerHTML = '';
  measureViews = [];
  const ns = 'http://www.w3.org/2000/svg';
  measures.forEach(function (m) {
    const g = document.createElementNS(ns, 'g');
    const lineBg = document.createElementNS(ns, 'line');
    const line = document.createElementNS(ns, 'line');
    const dot1 = document.createElementNS(ns, 'circle');
    const dot2 = document.createElementNS(ns, 'circle');
    lineBg.setAttribute('class', 'measure-line-bg');
    line.setAttribute('class', 'measure-line');
    dot1.setAttribute('class', 'measure-dot');
    dot2.setAttribute('class', 'measure-dot');
    dot1.setAttribute('r', '5.5');
    dot2.setAttribute('r', '5.5');
    g.appendChild(lineBg);
    g.appendChild(line);
    g.appendChild(dot1);
    g.appendChild(dot2);
    svg.appendChild(g);

    const cap = formatMeasureCaption(m.name, m.value, m.units);
    const label = document.createElement('div');
    label.className = 'measure-label';
    const nameEl = document.createElement('span');
    nameEl.className = 'measure-name';
    nameEl.textContent = cap.name;
    const valEl = document.createElement('span');
    valEl.className = 'measure-val';
    valEl.textContent = cap.value;
    label.appendChild(nameEl);
    label.appendChild(valEl);
    box.appendChild(label);

    measureViews.push({
      data: m,
      lineBg: lineBg,
      line: line,
      dot1: dot1,
      dot2: dot2,
      label: label,
      itemBtn: null,
      itemOn: false,
      w1: null,
      w2: null
    });
  });
  buildMeasureItemButtons();
}

// Muestra u oculta la línea, los puntos y la etiqueta de una medida
function setMeasureItemVisible(view, on) {
  const show = !!on;
  const disp = show ? '' : 'none';
  view.lineBg.style.display = disp;
  view.line.style.display = disp;
  view.dot1.style.display = disp;
  view.dot2.style.display = disp;
  view.label.hidden = !show;
}

// Sincroniza el interruptor con el estado on/off de esa medida
function syncMeasureItemButton(view) {
  if (!view.itemBtn) return;
  view.itemBtn.checked = !!view.itemOn;
}

// Genera en el panel un interruptor por cada medida (nombres del JSON/archivo)
function buildMeasureItemButtons() {
  const list = document.getElementById('measureItemList');
  if (!list) return;
  list.innerHTML = '';
  measureViews.forEach(function (view, i) {
    const row = document.createElement('label');
    row.className = 'measure-row';
    row.title = view.data.name;

    const sw = document.createElement('span');
    sw.className = 'measure-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'keyMedida' + i;
    input.checked = false;
    input.addEventListener('change', function () {
      toggleMeasureItem(i);
    });

    const ui = document.createElement('span');
    ui.className = 'measure-switch-ui';
    sw.appendChild(input);
    sw.appendChild(ui);

    const name = document.createElement('span');
    name.className = 'measure-row-name';
    name.textContent = view.data.name;

    row.appendChild(sw);
    row.appendChild(name);
    list.appendChild(row);
    view.itemBtn = input;
    syncMeasureItemButton(view);
  });
  measureViews.forEach(function (view) {
    setMeasureItemVisible(view, false);
  });
}

// Enciende solo esa medida (o la apaga si ya estaba activa)
function toggleMeasureItem(index) {
  const view = measureViews[index];
  if (!view) return;
  const turningOn = !view.itemOn;
  measureViews.forEach(function (other, j) {
    other.itemOn = turningOn && j === index;
    syncMeasureItemButton(other);
    if (!other.itemOn) setMeasureItemVisible(other, false);
  });
  syncMeasureMenuButton();
  if (turningOn) updateMeasureOverlay();
}

// El botón Medidas se pone verde si el panel está abierto o hay una medida visible
function syncMeasureMenuButton() {
  const btn = document.getElementById('keyMedidas');
  if (!btn) return;
  const anyOn = measureViews.some(function (view) { return view.itemOn; });
  const active = measurePanelOpen || anyOn;
  btn.classList.toggle('showKey', active);
  btn.classList.toggle('hideButton', !active);
}

// Coloca el panel a la izquierda del botón Medidas (position:fixed, sin recortes)
function layoutMeasurePanel() {
  const btn = document.getElementById('keyMedidas');
  const panel = document.getElementById('measureItemButtons');
  if (!btn || !panel || !measurePanelOpen) return;
  const r = btn.getBoundingClientRect();
  const gap = 8;
  const width = Math.min(272, Math.max(220, window.innerWidth - 24));
  let left = r.left - width - gap;
  if (left < 8) left = 8;
  let top = r.top;
  const maxH = Math.min(360, window.innerHeight - 16);
  if (top + 80 > window.innerHeight - 8) top = Math.max(8, window.innerHeight - maxH - 8);
  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
  panel.style.width = Math.min(width, r.left - gap - 8) + 'px';
  panel.style.maxHeight = maxH + 'px';
}

// Abre o cierra el panel de la lista
function setMeasurePanelOpen(open) {
  measurePanelOpen = !!open;
  const panel = document.getElementById('measureItemButtons');
  if (panel) {
    if (measurePanelOpen) {
      document.body.appendChild(panel);
      panel.hidden = false;
      layoutMeasurePanel();
    } else {
      panel.hidden = true;
    }
  }
  syncMeasureMenuButton();
}

// onclick del botón Medidas en el HTML
function toggleMeasurePanel(ev) {
  if (ev) ev.stopPropagation();
  setMeasurePanelOpen(!measurePanelOpen);
}

// Pasa los puntos LPS de cada medida al espacio world de Sketchfab
function applyMeasureTransform() {
  if (!measureTransform) return;
  measureViews.forEach(function (view) {
    view.w1 = measureTransform(view.data.lps1);
    view.w2 = measureTransform(view.data.lps2);
  });
}

// Actualiza x1,y1,x2,y2 de una línea SVG
function setLine(el, a, b) {
  el.setAttribute('x1', a[0]);
  el.setAttribute('y1', a[1]);
  el.setAttribute('x2', b[0]);
  el.setAttribute('y2', b[1]);
}

// Reproyecta las medidas visibles al girar/desplazar/hacer zoom
function updateMeasureOverlay() {
  if (!measureApiRef || !measureViews.length || measureProjectBusy) return;
  measureProjectBusy = true;
  const pts = [];
  measureViews.forEach(function (view) {
    pts.push(view.w1, view.w2);
  });
  projectPositions(measureApiRef, pts, function (coords) {
    measureViews.forEach(function (view, i) {
      const a = coords[i * 2];
      const b = coords[i * 2 + 1];
      const on = !!(a && b && view.itemOn);
      setMeasureItemVisible(view, on);
      if (!on) return;
      setLine(view.lineBg, a, b);
      setLine(view.line, a, b);
      view.dot1.setAttribute('cx', a[0]);
      view.dot1.setAttribute('cy', a[1]);
      view.dot2.setAttribute('cx', b[0]);
      view.dot2.setAttribute('cy', b[1]);
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const side = (i % 2 === 0) ? 1 : -1;
      const offset = 14;
      view.label.style.left = (mx + side * (-dy / len) * offset) + 'px';
      view.label.style.top = (my + side * (dx / len) * offset) + 'px';
    });
    measureProjectBusy = false;
  });
}

// Mientras se mueve la cámara, actualiza el overlay en cada frame
function startMeasureTracking() {
  if (measureRaf) return;
  const tick = function () {
    updateMeasureOverlay();
    measureRaf = requestAnimationFrame(tick);
  };
  measureRaf = requestAnimationFrame(tick);
}

// Al soltar la cámara, deja de animar y hace un último update
function stopMeasureTracking() {
  if (measureRaf) {
    cancelAnimationFrame(measureRaf);
    measureRaf = 0;
  }
  updateMeasureOverlay();
}

// Engancha cámara, resize y clic fuera para cerrar el panel
function bindMeasureCamera() {
  if (measureTrackingBound || !measureApiRef) return;
  measureTrackingBound = true;
  measureApiRef.addEventListener('camerastart', startMeasureTracking);
  measureApiRef.addEventListener('camerastop', stopMeasureTracking);
  window.addEventListener('resize', function () {
    layoutMeasurePanel();
    updateMeasureOverlay();
  });
  document.addEventListener('click', function (e) {
    if (!measurePanelOpen) return;
    const menu = document.querySelector('.measure-menu');
    const panel = document.getElementById('measureItemButtons');
    if (menu && menu.contains(e.target)) return;
    if (panel && panel.contains(e.target)) return;
    setMeasurePanelOpen(false);
  });
}

// Punto de entrada: llamarla desde main.js cuando el visor de Sketchfab esté listo
function startSlicerMeasurements(api) {
  measureApiRef = api || (typeof apiRef !== 'undefined' ? apiRef : measureApiRef);
  if (!measureApiRef || measuresLoadStarted) return;
  measuresLoadStarted = true;
  loadSlicerMarkupFiles(function (measures) {
    if (!measures.length) {
      setMeasureUiAvailable(false);
      return;
    }
    setMeasureUiAvailable(true);
    getSketchfabModelWorldMatrix(measureApiRef, function (worldMatrix) {
      measureTransform = makeSlicerToSketchfabTransform(worldMatrix);
      buildMeasureDom(measures);
      applyMeasureTransform();
      bindMeasureCamera();
      syncMeasureMenuButton();
    });
  });
}
