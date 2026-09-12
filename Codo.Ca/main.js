const model = '4ea6bcb881ef4aa1977752dfc99eb2ec'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

const filteredNodes = {}; // Objeto para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }
const nodeNames = []; // Array para guardar nombres de nodos (útil para showAndHideGroup)
let apiRef; // Referencia a la api, para poder llamarla fuera del evetListener
const listedNodes = {}; // instanceID -> nodo completo (para el clic y el bocadillo de nombre)

// Sketchfab duplica cada pieza (MatrixTransform + Group + Geometry).
// hide/show fiable = malla (*_hueso_0, *_ligamento_0…), agrupada por el nombre base.
const parts = {};

// Nodos de la cruz de orientación (palos + letras Cr/Cd/Lt/Md)
const COMPASS_NODES = ['Cruz', 'Cr', 'Cd', 'Lt', 'Md'];

// Sufijo de malla en filteredNodes (ej. Humero_hueso_0, Lig. anular_ligamento_0)
const MESH_SUFFIX = /_(hueso|ligamento|musculo|músculo|tendon|nervio|white)(_\d+)?$/i;

let annotationCount = 18; // R: Según el nº de anotaciones modificar este número
let compassOn = true; // La cruz de orientación arranca encendida

// Ancla 3D del bocadillo de nombre (se reproyecta al girar la cámara)
let nameBubbleWorld = null;
let nameBubblePartKey = null;
let anchorRaf = 0;

// Zonas grandes ligadas al húmero / radio (posición mundo; se afina con las anotaciones).
const REGION_AREAS = {
  condilo: {
    elId: 'regionCondilo',
    partKey: 'Humero',
    position: [0.003639, 0.021105, 0.017754] // fallback: tróclea + capítulo
  },
  cabeza: {
    elId: 'regionCabeza',
    partKey: 'Radio',
    position: [-0.003409, 0.008, 0.001877] // fallback: más distal, hacia el cuello
  }
};

// Pines de Sketchfab por hueso (índice 0 = anotación nº 1). Sesamoideo no tiene.
const ANNOTATION_PART_FALLBACK = [
  'Humero', 'Humero', 'Humero', 'Humero', 'Humero', 'Humero', 'Humero',
  'Radio', 'Radio', 'Radio', 'Radio',
  'Cubito', 'Cubito', 'Cubito', 'Cubito', 'Cubito', 'Cubito', 'Cubito'
];
let annotationPartByIndex = ANNOTATION_PART_FALLBACK.slice();

// Grupos de botones azules (el título enciende/apaga todos; huesos no van aquí)
const PART_GROUPS = {
  ligamentos: {
    btnId: 'keyGrpLig',
    parts: [
      { name: 'Lig. colateral lateral', btnId: 'keyLcolatLat' },
      { name: 'Lig. colateral medial', btnId: 'keyLcolatMed' },
      { name: 'Lig. anular', btnId: 'keyLanular' },
      { name: 'Lig. del olecranon', btnId: 'keyLolecranon' },
      { name: 'Lig. interoseo', btnId: 'keyLinteroseo' },
      { name: 'Lig. oblicuo', btnId: 'keyLoblicuo' }
    ]
  },
  musculos: {
    btnId: 'keyGrpMus',
    parts: [
      { name: 'M. supinador', btnId: 'keyMsupinador' },
      { name: 'M. pronador redondo', btnId: 'keyMpronador' }
    ]
  },
  tendones: {
    btnId: 'keyGrpTen',
    parts: [
      { name: 'T. del m. biceps braquial', btnId: 'keyTbiceps' },
      { name: 'T. del m. braquial', btnId: 'keyTbraquial' }
    ]
  },
  nervios: {
    btnId: 'keyGrpNer',
    parts: [
      { name: 'N. radial', btnId: 'keyNradial' },
      { name: 'N. mediano', btnId: 'keyNmediano' },
      { name: 'N. ulnar', btnId: 'keyNulnar' }
    ]
  }
};

//INICIO Sketchfab
//Asi se llama a la versión de api que esté actualmente
iframe = document.getElementById('api-frame');
client = new Sketchfab(iframe);

error = function () {
  console.error('Sketchfab API Error!');
},

  success = function (api) {
    apiRef = api; //Aquí ya estamos nombrando a la variable creada por nosotros
    //para poder usarla fuera de lo de Sketchfab
    api.start();
    // Wait for viewer to be ready
    api.addEventListener('viewerready', function () {
      // Get the object nodes
      api.getNodeMap(function (err, nodes) {
        if (!err) {
          for (const prop in nodes) {
            if (nodes.hasOwnProperty(prop)) {
              const node = nodes[prop];
              const name = node.name;
              if (!name || name === 'undefined') continue;
              nodeNames.push(name);
              listedNodes[node.instanceID] = node;
              filteredNodes[name] = {   //Aquí va rellenando nuestro objeto creado arriba
                show: true,
                instanceId: node.instanceID
              };
              registerNamedPart(node);
            };
          };
        };

        //Para ocultar las anotaciones desde el comienzo ya que el botón de Exploración comienza apagado
        hideAllAnnotations();

        // Cruz de orientación visible al cargar (botón verde)
        applyCompassVisibility();
      });

      // Si Sketchfab informa del nº real de anotaciones, lo usamos
      if (api.getAnnotationList) {
        api.getAnnotationList(function (err, annotations) {
          if (!err && annotations) {
            annotationCount = annotations.length;
            bindRegionAnchors(annotations); // cóndilo y cabeza del radio sobre el hueso
            bindAnnotationParts(annotations); // ligar pines al húmero / radio / cúbito
            updateRegionLabels(true); // dejar left/top listos para que salgan a la vez que los pines
          }
          hideAllAnnotations();
        });
      }

      //Para que se pueda aplicar el hover sobre los modelos cuando se pasa el ratón por encima
      enableHoverHighlight();

      // Bocadillo con el nombre al clicar una pieza
      enableClickNameBubble();

      // Mientras gira/desplaza/zoom, las etiquetas siguen el punto 3D anclado
      api.addEventListener('camerastart', startAnchorTracking);
      api.addEventListener('camerastop', stopAnchorTracking);
      window.addEventListener('resize', updateAnchoredLabels);
    });
  };

client.init(model, {
  success: success,
  error: error,
  ui_infos: 0,
  ui_controls: 0,
  ui_stop: 1,
  ui_annotations: 0,
  watermark: 1,
  supersample: 0
});
//FIN Sketchfab

// =====================================================
//               FUNCIONES PROPIAS
//  creadas para solo tener que llamarlas desde el .HTML
// =====================================================


//   VENTANA DE INFO
// =====================================================
//Abre una ventana con informacion de uso del visor
function showInfo() {
  const modal = document.getElementById('infoModal');
  if (!modal) return;

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');

  // Cerrar con ESC
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
//FIN VENTANA DE INFO

//Muestra/oculta un objeto al clicar un botón que cambia de color Ej: encéfalos
function showAndHide(nodeName, buttonId = null) {
  const btn = document.getElementById(buttonId);
  
  //console.log(filteredNodes); //R: esto sólo se descomenta, y se comenta lo de arriba para que en consola del navegador pueda ver como se llaman las partes del modelo y poder buscarlas.

  const key = resolvePartKey(nodeName);
  if (key && parts[key]) {
    const visible = !parts[key].visible;
    setPartVisible(key, visible);
    if (buttonId && btn) {
      if (visible) btn.classList.replace('hideButton', 'showButton');
      else btn.classList.replace('showButton', 'hideButton');
    }
    refreshAllGroupButtons();
    return;
  }

  if (!filteredNodes[nodeName]) {
    console.warn('Nodo no encontrado:', nodeName);
    return;
  }

  filteredNodes[nodeName].show = !filteredNodes[nodeName].show;
  if (filteredNodes[nodeName].show) {
    if (buttonId) {
      btn.classList.replace('hideButton', 'showButton');
    }
    apiRef.show(filteredNodes[nodeName].instanceId)
  } else {
    if (buttonId) {
      btn.classList.replace('showButton', 'hideButton');
    }
    apiRef.hide(filteredNodes[nodeName].instanceId)
  };
};

//Para mostrar/ocultar las anotaciones Sketchfab cuando se muestra/apaga pestaña "Exploración"
let showToolTip = false;
function toogleToolTips() {
  const btn = document.getElementById('key1');
  showToolTip = !showToolTip;
  if (showToolTip) {
    // Proyectar primero: si no, las etiquetas HTML salen tarde (showToolTip aún era false)
    updateRegionLabels(true);
    syncVisibleAnnotations();
    showRegionLabels();
    if (btn) btn.classList.replace('hideKey', 'showKey');
  } else {
    hideAllAnnotations();
    hideRegionLabels();
    if (btn) btn.classList.replace('showKey', 'hideKey');
  }
};

function hideAllAnnotations() {
  for (let i = 0; i < annotationCount; i++) { // R: Según el nº de anotaciones modificar annotationCount
    apiRef.hideAnnotation(i, function (err, index) {
      if (!err) {
        //window.console.log('Hiding annotation', index + 1);
      }
    });
  }
}

function showAllAnnotations() {
  syncVisibleAnnotations();
}

function syncVisibleAnnotations() {
  if (!apiRef) return;
  for (let i = 0; i < annotationCount; i++) {
    const partKey = annotationPartByIndex[i];
    const on = showToolTip && (!partKey || isPartVisible(partKey));
    if (on) apiRef.showAnnotation(i, function () {});
    else apiRef.hideAnnotation(i, function () {});
  }
}

//Para buscar nodes con siglas/palabras en común
function findNodeGroups(code) {
  return nodeNames.filter((nodeName) => nodeName.includes(code));
}

// Para mostrar/ocultar grupos de objetos por mismo código de color (el "mtl")
function showAndHideGroup(code, buttonId) {
  const grouped = findNodeGroups(code);
  grouped.forEach((node, i) => {
    if (i === 0) {
      showAndHide(node, buttonId);
    } else {
      showAndHide(node);
    }
  });
}

//   ILUMINAR ÁREAS AL PASAR EL RATÓN
// =======================================================

function enableHoverHighlight() {
  if (!apiRef) {
    console.warn('Sketchfab API no lista todavía');
    return;
  }

  // --- ENTRAR con el ratón ---
  apiRef.addEventListener('nodeMouseEnter', function (info) {
    var y = info.material;
    if (!y || !y.channels || !y.channels.EmitColor) return;
    y.channels.EmitColor.factor = 1;
    y.channels.EmitColor.enable = true;
    y.channels.EmitColor.color = [0.1, 0.1, 0.0];
    apiRef.setMaterial(y, function () {
      //console.log('highlighted ' + y.name);
    });
    //console.log('nodeMouseEnter', info);
  }, {
    pick: 'fast'
  });

  // --- SALIR con el ratón ---
  apiRef.addEventListener('nodeMouseLeave', function (info) {
    var y = info.material;
    if (!y || !y.channels || !y.channels.EmitColor) return;
    y.channels.EmitColor.factor = 1;
    y.channels.EmitColor.enable = false;
    y.channels.EmitColor.color = [0.5, 0.5, 0.0];
    apiRef.setMaterial(y, function () {
      //console.log('highlighted ' + y.name);
    });
    //console.log('nodeMouseLeave', info);
  }, {
    pick: 'fast'
  });

  //console.log("Hover highlight ACTIVADO (versión restauración directa)");
}

// Función para aprovechar lo escrito en el nombre de cada pieza del modelo.
function limpiarNombre(str) {
  if (!str) return '';
  str = String(str);

  // Quitar sufijos de malla de Sketchfab, NO el "Lig." / "M." / "N." / "T."
  str = str.replace(MESH_SUFFIX, '');

  // ----------------------------------------
  // 1) Reparación anatómica de nombres (tildes y caracteres rotos)
  // ----------------------------------------
  // Cada entrada contiene:
  //   - regex: formas sin tilde o rotas
  //   - replace: forma correcta con tildes
  const fixes = [
    { regex: /esf��nter|esf�nter|esfï¿½ï¿½nter|esfï¿½nter|esfinter/i, replace: 'esfínter' },
    { regex: /c��lica|c�lica|cï¿½ï¿½lica|cï¿½lica|colica/i, replace: 'cólica' },
    { regex: /c��lico|c�lico|cï¿½ï¿½lico|cï¿½lico|colico/i, replace: 'cólico' },
    { regex: /col��nica|col�nica|colï¿½ï¿½nica|colï¿½lnica|colonica/i, replace: 'colónica' },
    { regex: /cecoc��lico|cecoc�lico|cecocï¿½ï¿½lico|cecocï¿½lico|cecocolico/i, replace: 'cecocólico' },
    { regex: /v��lvula|v�lvula|vï¿½ï¿½lvula|vï¿½lvula|valvula/i, replace: 'válvula' },
    { regex: /ileon|ï¿½leon|��leon|�leon/i, replace: 'íleon' },
    { regex: /gastr�|g��strico|g�strico/i, replace: 'gástrico' },
    { regex: /humero/i, replace: 'húmero' },
    { regex: /anconeo/i, replace: 'ancóneo' },
    { regex: /cubito/i, replace: 'cúbito' },
    { regex: /biceps/i, replace: 'bíceps' },
    { regex: /olecranon/i, replace: 'olécranon' },
    // El nodo en Sketchfab es "Lig. interoseo" (sin tilde); botón y bocadillo: "Lig. interóseo"
    { regex: /Lig\.\s*interoseo/i, replace: 'Lig. interóseo' },
    { regex: /interï¿½+seo|inter�+seo|inter\uFFFD+seo|interoseo/i, replace: 'interóseo' },
    { regex: /obl¿½+cuo|obl�+cuo|obl\uFFFD+cuo|oblicuo/i, replace: 'oblícuo' }
  ];

  for (const rule of fixes) {
    if (rule.regex.test(str)) {
      str = str.replace(rule.regex, rule.replace);
    }
  }

  // ----------------------------------------
  // 2) LIMPIEZA GENERAL DEL STRING
  // ----------------------------------------
  str = str
    .replace(/material/gi, '')
    .replace(/^_+|_+$/g, '')
    .replace(/(?<=\p{L})_(?=\p{L})/gu, ' ')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =====================================================
//  NUEVAS — específicas de Codo (nombres, cruz, bocadillo, zonas)
// =====================================================

// Nombre base según filteredNodes: "Humero_hueso_0" → "Humero", "Lig. anular" → "Lig. anular"
function baseName(name) {
  if (!name) return '';
  return String(name).replace(MESH_SUFFIX, '');
}

// Iguala tildes; "Lig. interoseo" del modelo se muestra como "Lig. interóseo" en limpiarNombre
function normalizeKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/ï¿½+/g, 'o')
    .replace(/�+/g, 'o')
    .replace(/\uFFFD+/g, 'o')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function isMeshNode(node) {
  if (!node || !node.name) return false;
  if (node.type === 'Geometry') return true;
  return MESH_SUFFIX.test(node.name);
}

function registerNamedPart(node) {
  const key = baseName(node.name);
  if (!key || key === 'RootNode' || key === 'Camera' || key === 'Light') return;
  if (/\.fbx$/i.test(key)) return;

  if (!parts[key]) {
    parts[key] = { meshIds: [], fallbackIds: [], visible: true };
  }
  parts[key].fallbackIds.push(node.instanceID);
  if (isMeshNode(node)) parts[key].meshIds.push(node.instanceID);
}

function resolvePartKey(query) {
  if (parts[query]) return query;
  const q = normalizeKey(query);
  const keys = Object.keys(parts);
  const exact = keys.find((key) => normalizeKey(key) === q);
  if (exact) return exact;
  // Solo si el nombre del botón es un trozo claro del nodo (p. ej. interoseo)
  return keys.find((key) => {
    const k = normalizeKey(key);
    return q.length >= 8 && (k.includes(q) || q.includes(k));
  });
}

function setButtonOn(btn, on) {
  if (!btn) return;
  btn.classList.remove('showButton', 'hideButton');
  btn.classList.add(on ? 'showButton' : 'hideButton');
}

function refreshGroupButton(groupId) {
  const group = PART_GROUPS[groupId];
  if (!group) return;
  const allOn = group.parts.every(function (item) {
    return isPartVisible(item.name);
  });
  setButtonOn(document.getElementById(group.btnId), allOn);
}

function refreshAllGroupButtons() {
  Object.keys(PART_GROUPS).forEach(refreshGroupButton);
}

// Círculo a la izq. de Ligamentos / Músculos / Tendones / Nervios: todos a la vez
function togglePartGroup(groupId) {
  const group = PART_GROUPS[groupId];
  if (!group) return;
  const anyOn = group.parts.some(function (item) {
    return isPartVisible(item.name);
  });
  const visible = !anyOn;
  group.parts.forEach(function (item) {
    const key = resolvePartKey(item.name);
    if (key) setPartVisible(key, visible, true);
    setButtonOn(document.getElementById(item.btnId), visible);
  });
  setButtonOn(document.getElementById(group.btnId), visible);
  if (showToolTip) syncVisibleAnnotations();
  updateAnchoredLabels();
}

function setPartVisible(key, visible, skipSync) {
  const part = parts[key];
  if (!part) return;
  part.visible = visible;
  const ids = part.meshIds.length ? part.meshIds : part.fallbackIds;
  ids.forEach((id) => {
    if (visible) apiRef.show(id);
    else apiRef.hide(id);
  });
  if (!skipSync && showToolTip) syncVisibleAnnotations();
  if (!skipSync) updateAnchoredLabels();
}

function applyCompassVisibility() {
  COMPASS_NODES.forEach((name) => {
    const key = resolvePartKey(name);
    if (key) setPartVisible(key, compassOn);
  });

  const btn = document.getElementById('keyCompass');
  if (!btn) return;
  if (compassOn) btn.classList.replace('hideKey', 'showKey');
  else btn.classList.replace('showKey', 'hideKey');
}

// Botón cuadrado con cruz: verde = se ve, gris = oculta
function toggleCompass() {
  compassOn = !compassOn;
  applyCompassVisibility();
}

function isCompassName(name) {
  const key = baseName(name);
  return COMPASS_NODES.includes(key);
}

function hideNameBubble() {
  const bubble = document.getElementById('nameBubble');
  if (bubble) bubble.hidden = true;
  nameBubbleWorld = null;
  nameBubblePartKey = null;
}

// Bocadillo azul oscuro con el nombre de la pieza clicada
function enableClickNameBubble() {
  const bubble = document.getElementById('nameBubble');
  if (!bubble || !apiRef) return;

  apiRef.addEventListener('click', function (info) {
    if (info.instanceID == null) {
      hideNameBubble();
      return;
    }

    const node = listedNodes[info.instanceID];
    if (!node || isCompassName(node.name)) {
      hideNameBubble();
      return;
    }

    const label = limpiarNombre(node.name);
    if (!label) {
      hideNameBubble();
      return;
    }

    bubble.textContent = label;
    bubble.hidden = false;
    nameBubblePartKey = baseName(node.name);
    nameBubbleWorld = info.position3D ? info.position3D.slice(0, 3) : null;
    updateAnchoredLabels();
  }, { pick: 'slow' });
}

function annotationWorldPos(ann) {
  if (!ann) return null;
  const raw = ann.position || ann.target;
  if (Array.isArray(raw) && raw.length >= 3) return raw.slice(0, 3);
  if (raw && typeof raw.x === 'number') return [raw.x, raw.y, raw.z];
  return null;
}

function avg3(points) {
  if (!points.length) return null;
  const s = [0, 0, 0];
  points.forEach(function (p) {
    s[0] += p[0];
    s[1] += p[1];
    s[2] += p[2];
  });
  return [s[0] / points.length, s[1] / points.length, s[2] / points.length];
}

function lerp3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

// Puntos verdes de la captura: cóndilo en el húmero (bajo el pin 4) y cabeza del radio (justo sobre el pin 9)
function bindRegionAnchors(annotations) {
  const pts = (annotations || []).map(annotationWorldPos);
  const fosaOlecranon = pts[3]; // pin 4, sobre el cóndilo
  const capitulo = pts[6];      // pin 7
  const troclea = pts[5];       // pin 6
  if (fosaOlecranon && capitulo) REGION_AREAS.condilo.position = lerp3(fosaOlecranon, capitulo, 0.32);
  else if (fosaOlecranon && troclea) REGION_AREAS.condilo.position = lerp3(fosaOlecranon, troclea, 0.28);
  else if (fosaOlecranon) REGION_AREAS.condilo.position = fosaOlecranon.slice();

  const fovea = pts[7];            // pin 8, techo de la cabeza
  const cuello = pts[8];           // pin 9
  const circunferencia = pts[10];  // pin 11, ecuador de la cabeza
  // Punto verde: centro de la cabeza, entre el pin 8 (fóvea) y el 9 (cuello), no pegado al cuello
  if (fovea && cuello) REGION_AREAS.cabeza.position = lerp3(fovea, cuello, 0.58);
  else if (circunferencia && cuello) REGION_AREAS.cabeza.position = lerp3(circunferencia, cuello, 0.42);
  else if (cuello) REGION_AREAS.cabeza.position = cuello.slice();
}

function annotationNodeId(ann) {
  if (!ann) return null;
  return firstDefined(ann.instanceID, ann.instanceId, ann.uid, ann.objectUid, ann.objectUID, ann.geometryUid, ann.geometryUID);
}

function firstDefined() {
  for (let i = 0; i < arguments.length; i++) {
    if (arguments[i] != null) return arguments[i];
  }
  return null;
}

// Asocia cada pin al hueso sobre el que está (API o índice conocido)
function bindAnnotationParts(annotations) {
  annotationPartByIndex = ANNOTATION_PART_FALLBACK.slice();
  (annotations || []).forEach(function (ann, i) {
    const id = annotationNodeId(ann);
    const node = id != null ? listedNodes[id] : null;
    if (!node) return;
    const key = baseName(node.name);
    if (key && parts[key] && COMPASS_NODES.indexOf(key) === -1) {
      annotationPartByIndex[i] = key;
    }
  });
}

function isPartVisible(partName) {
  const key = resolvePartKey(partName);
  if (key && parts[key]) return parts[key].visible !== false;
  return true;
}

function placeOverlay(el, canvasCoord) {
  if (!el || !canvasCoord) return;
  el.style.left = canvasCoord[0] + 'px';
  el.style.top = canvasCoord[1] + 'px';
}

function projectWorldToOverlay(worldPos, el) {
  if (!apiRef || !worldPos || !el) return;
  apiRef.getWorldToScreenCoordinates(worldPos, function (coord) {
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
  updateRegionLabels();
}

function showRegionLabels() {
  const wrap = document.getElementById('regionLabels');
  if (wrap) wrap.hidden = false;
  updateRegionLabels();
}

function hideRegionLabels() {
  const wrap = document.getElementById('regionLabels');
  if (wrap) wrap.hidden = true;
}

function updateRegionLabels(force) {
  if (!apiRef) return;
  if (!force && !showToolTip) return;
  Object.values(REGION_AREAS).forEach(function (area) {
    const el = document.getElementById(area.elId);
    if (!el) return;
    const onBone = isPartVisible(area.partKey);
    el.style.display = onBone ? '' : 'none';
    if (!onBone) return;
    projectWorldToOverlay(area.position, el);
  });
}

// FIN funciones propias
//FIN Sketchfab
