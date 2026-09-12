// Funciones genéricas de interfaz para los visores 3DVetAnatomy.
// Cada visor (Abdomen, Codo, etc.) carga este archivo ANTES de su main.js y define:
//   apiRef, parts, listedNodes, PART_GROUPS, setPartVisible
// Opcional: displayNameForNode, isIgnoredPickName, afterGroupToggle
// Usar `var` (no let/const) en esas variables para que este archivo las encuentre.

var nameBubbleWorld = null;
var nameBubblePartKey = null;
var anchorRaf = 0;

function getApiRef() {
  return (typeof apiRef !== 'undefined') ? apiRef : window.apiRef;
}

function getParts() {
  return (typeof parts !== 'undefined') ? parts : window.parts;
}

function getListedNodes() {
  return (typeof listedNodes !== 'undefined') ? listedNodes : window.listedNodes;
}

function getPartGroups() {
  return (typeof PART_GROUPS !== 'undefined') ? PART_GROUPS : window.PART_GROUPS;
}

function showInfo() {
  const modal = document.getElementById('infoModal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.addEventListener('keydown', infoModalEscClose);
}

function closeInfoModal() {
  const modal = document.getElementById('infoModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', infoModalEscClose);
}

function infoModalEscClose(e) {
  if (e.key === 'Escape') closeInfoModal();
}

function enableHoverHighlight() {
  const api = getApiRef();
  if (!api) return;

  api.addEventListener('nodeMouseEnter', function (info) {
    var y = info.material;
    if (!y || !y.channels || !y.channels.EmitColor) return;
    y.channels.EmitColor.factor = 1;
    y.channels.EmitColor.enable = true;
    y.channels.EmitColor.color = [0.1, 0.1, 0.0];
    api.setMaterial(y, function () {});
  }, { pick: 'fast' });

  api.addEventListener('nodeMouseLeave', function (info) {
    var y = info.material;
    if (!y || !y.channels || !y.channels.EmitColor) return;
    y.channels.EmitColor.factor = 1;
    y.channels.EmitColor.enable = false;
    y.channels.EmitColor.color = [0.5, 0.5, 0.0];
    api.setMaterial(y, function () {});
  }, { pick: 'fast' });
}

function normalizeKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/ï¿½+/g, 'o')
    .replace(/\uFFFD+/g, 'o')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function resolvePartKey(query) {
  const map = getParts();
  if (!map) return query;
  if (map[query]) return query;
  const q = normalizeKey(query);
  const keys = Object.keys(map);
  const exact = keys.find(function (key) { return normalizeKey(key) === q; });
  if (exact) return exact;
  return keys.find(function (key) {
    const k = normalizeKey(key);
    return q.length >= 8 && (k.includes(q) || q.includes(k));
  });
}

function isPartVisible(partName) {
  const map = getParts();
  const key = resolvePartKey(partName);
  if (key && map && map[key]) return map[key].visible !== false;
  return true;
}

function setButtonOn(btn, on, onClass, offClass) {
  if (!btn) return;
  const onCls = onClass || btn.dataset.onClass || 'showButton';
  const offCls = offClass || btn.dataset.offClass || 'hideButton';
  btn.classList.remove('showButton', 'hideButton', 'symbols', 'showKey', 'hideKey');
  btn.classList.add(on ? onCls : offCls);
}

function refreshGroupButton(groupId) {
  const groups = getPartGroups();
  if (!groups) return;
  const group = groups[groupId];
  if (!group) return;
  const allOn = group.parts.every(function (item) {
    return isPartVisible(item.name);
  });
  setButtonOn(document.getElementById(group.btnId), allOn);
}

function refreshAllGroupButtons() {
  const groups = getPartGroups();
  if (!groups) return;
  Object.keys(groups).forEach(refreshGroupButton);
}

function togglePartGroup(groupId) {
  const groups = getPartGroups();
  if (!groups) return;
  const group = groups[groupId];
  if (!group) return;
  const anyOn = group.parts.some(function (item) {
    return isPartVisible(item.name);
  });
  const visible = !anyOn;
  group.parts.forEach(function (item) {
    const key = resolvePartKey(item.name);
    if (key && typeof setPartVisible === 'function') setPartVisible(key, visible, true);
    setButtonOn(document.getElementById(item.btnId), visible);
  });
  setButtonOn(document.getElementById(group.btnId), visible);
  if (typeof afterGroupToggle === 'function') afterGroupToggle();
  else updateAnchoredLabels();
}

function hideNameBubble() {
  const bubble = document.getElementById('nameBubble');
  if (bubble) bubble.hidden = true;
  nameBubbleWorld = null;
  nameBubblePartKey = null;
}

function showAnchoredNameBubble(label, worldPos, partKey) {
  const bubble = document.getElementById('nameBubble');
  if (!bubble || !label) {
    hideNameBubble();
    return;
  }
  bubble.textContent = label;
  bubble.hidden = false;
  nameBubblePartKey = partKey || label;
  nameBubbleWorld = (worldPos && worldPos.slice) ? worldPos.slice(0, 3) : (worldPos || null);
  updateAnchoredLabels();
}

function lookupListedNode(instanceID) {
  const map = getListedNodes() || {};
  return map[instanceID] || map[String(instanceID)];
}

function nodePickName(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  return node.name || '';
}

function enableClickNameBubble() {
  const bubble = document.getElementById('nameBubble');
  const api = getApiRef();
  if (!bubble || !api) return;

  api.addEventListener('click', function (info) {
    if (info.instanceID == null) {
      hideNameBubble();
      return;
    }

    const rawName = nodePickName(lookupListedNode(info.instanceID));
    if (!rawName || (typeof isIgnoredPickName === 'function' && isIgnoredPickName(rawName))) {
      hideNameBubble();
      return;
    }

    const label = (typeof displayNameForNode === 'function')
      ? displayNameForNode(rawName)
      : String(rawName);
    if (!label) {
      hideNameBubble();
      return;
    }

    showAnchoredNameBubble(label, info.position3D, rawName);
  }, { pick: 'slow' });
}

function placeOverlay(el, canvasCoord) {
  if (!el || !canvasCoord) return;
  el.style.left = canvasCoord[0] + 'px';
  el.style.top = canvasCoord[1] + 'px';
}

function projectWorldToOverlay(worldPos, el) {
  const api = getApiRef();
  if (!api || !worldPos || !el) return;
  api.getWorldToScreenCoordinates(worldPos, function (coord) {
    if (coord && coord.canvasCoord) placeOverlay(el, coord.canvasCoord);
  });
}

function startAnchorTracking() {
  if (anchorRaf) return;
  const tick = function () {
    updateAnchoredLabels();
    anchorRaf = requestAnimationFrame(tick);
  };
  anchorRaf = requestAnimationFrame(tick);
}

function stopAnchorTracking() {
  if (anchorRaf) {
    cancelAnimationFrame(anchorRaf);
    anchorRaf = 0;
  }
  updateAnchoredLabels();
}

function updateAnchoredLabels() {
  const bubble = document.getElementById('nameBubble');
  if (bubble && !bubble.hidden && nameBubbleWorld) {
    if (nameBubblePartKey && !isPartVisible(nameBubblePartKey)) {
      bubble.hidden = true;
    } else {
      projectWorldToOverlay(nameBubbleWorld, bubble);
    }
  }
}

// Vistas a 90° (horario / antihorario) a partir del azimuth actual de la cámara.
// opts.from / opts.target: arrays de 4 puntos [x,y,z] (cámara y look-at).
function enableOrthoSnapViews(opts) {
  const api = getApiRef();
  if (!api || !opts || !opts.from || !opts.target) return;
  const btnCw = document.getElementById(opts.cwId || 'buttonA');
  const btnCcw = document.getElementById(opts.ccwId || 'buttonB');
  const XYZa = opts.from;
  const XYZb = opts.target;
  const duration = opts.duration || 2;

  function azimuthFromCamera(camera) {
    const Cx = camera.position[0];
    const Cy = camera.position[1];
    const Tx = camera.target[0];
    const Ty = camera.target[1];
    return Math.atan2(Cy - Ty, Cx - Tx);
  }

  function viewIndex(azimuth) {
    let XYZi = Math.round((Math.PI - azimuth) / (Math.PI / 2)) - 1;
    if (XYZi === -1) XYZi = 3;
    return XYZi;
  }

  function snap(step) {
    api.getCameraLookAt(function (err, camera) {
      if (err || !camera) return;
      let XYZi = viewIndex(azimuthFromCamera(camera)) + step;
      if (XYZi < 0) XYZi = 3;
      if (XYZi > 3) XYZi = 0;
      api.setCameraLookAt(XYZa[XYZi], XYZb[XYZi], duration);
    });
  }

  if (opts.initialIndex != null) {
    api.setCameraLookAt(XYZa[opts.initialIndex], XYZb[opts.initialIndex], duration);
  }
  if (btnCw) btnCw.addEventListener('click', function () { snap(1); });
  if (btnCcw) btnCcw.addEventListener('click', function () { snap(-1); });
}

// Opacidad 0–1 en un material de Sketchfab (canal Opacity o alpha del albedo)
function setMaterialOpacityFactor(mat, alpha01) {
  if (!mat || !mat.channels) return false;
  const a = Math.max(0, Math.min(1, Number(alpha01)));
  if (mat.channels.Opacity) {
    mat.channels.Opacity.enable = true;
    mat.channels.Opacity.factor = a;
    return true;
  }
  if (mat.channels.AlbedoPBR && Array.isArray(mat.channels.AlbedoPBR.color)) {
    const c = mat.channels.AlbedoPBR.color;
    if (c.length === 3) mat.channels.AlbedoPBR.color = [c[0], c[1], c[2], a];
    else mat.channels.AlbedoPBR.color[3] = a;
    return true;
  }
  return false;
}
