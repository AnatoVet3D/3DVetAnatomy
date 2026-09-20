const model = '91309c230b964704bc4cbe7026cf817f'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

const filteredNodes = {}; // Objeto para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }
const nodeNames = []; // Array para guardar nombres de nodos, y si se debe mostrar o no.
let apiRef; // Referencia a la api, para poder llamarla fuera del evetListener
const parts = {}; // Piezas únicas (agrupa mallas duplicadas de Sketchfab)

// Sketchfab duplica cada pieza (MatrixTransform + Group + Geometry).
const MESH_SUFFIX = /_(hueso|ligamento|musculo|músculo|tendon|nervio|white|mtl\d+)(_\d+)?$/i;
const SKIP_NAME = /^(RootNode|Camera|Light|Dummy|Helper|Scene|undefined)$/i;
const DISPLAY_NAMES = { // Etiquetas de los botones de piezas (nombre Sketchfab → texto en pantalla) // Etiquetas de los botones de piezas (nombres de Sketchfab → texto en pantalla)
  'Colon': 'Colon',
  'femur dch': 'Fémur dcho',
  'femur izq': 'Fémur izq',
  'Frag Ilion izq': 'Frag. ilion izq',
  'Frag. Ilion + isquion izq': 'Frag. ilion + isquion izq',
  'Frag.Pubis izq': 'Frag. pubis izq',
  'hemipelvis dch': 'Hemipelvis dcha',
  'pierna dch': 'Pierna dcha',
  'Pierna izq': 'Pierna izq',
  'Raquis': 'Raquis',
  'Vajiga + uretra': 'Vejiga + uretra'
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
              filteredNodes[name] = {   //Aquí va rellenando nuestro objeto creado arriba
                show: true,
                instanceId: node.instanceID
              };
              registerNamedPart(node);
            };
          };
        };

        buildStructureButtons(nodes || {});

        //Para ocultar las anotaciones desde el comienzo
        hideAllAnnotations();
        // Carga las medidas 3D Slicer (.mrk.json) y dibuja el overlay. Definida en slicer-measures.js
        startSlicerMeasurements(api);
      });

      if (api.getAnnotationList) {
        api.getAnnotationList(function (err, annotations) {
          if (!err && annotations) hideAllAnnotations(annotations.length);
        });
      }
    });
  };

client.init(model, {
  success: success,
  error: error,
  ui_infos: 0,
  ui_controls: 0,
  ui_stop: 1,
  watermark: 1,
  supersample: 0
});
//FIN Sketchfab

// Funciones Propias
//creadas para solo tener que llamarlas desde el .HTML

// Nombres de Sketchfab que no deben generar botón (cámara, luces, el propio .fbx…)
function isSkippedName(name) {
  if (!name || name === 'undefined') return true;
  if (SKIP_NAME.test(name)) return true;
  if (/\.fbx$/i.test(name)) return true;
  return false;
}

// Quita el sufijo de malla de Sketchfab (_mtl123_0, _hueso_0…) para agrupar la pieza
function baseName(name) {
  if (!name) return '';
  return String(name)
    .replace(MESH_SUFFIX, '')
    .replace(/_\d+$/, '')
    .replace(/\.\d{3}$/, '');
}

// True si el nodo es una geometría / malla (la que hay que show/hide)
function isMeshNode(node) {
  if (!node || !node.name) return false;
  if (node.type === 'Geometry') return true;
  return MESH_SUFFIX.test(node.name);
}

// Agrupa instanceID de una misma pieza (Sketchfab duplica MatrixTransform + Geometry)
function registerNamedPart(node) {
  const key = baseName(node.name);
  if (isSkippedName(key)) return;

  if (!parts[key]) {
    parts[key] = { meshIds: [], fallbackIds: [], visible: true };
  }
  parts[key].fallbackIds.push(node.instanceID);
  if (isMeshNode(node)) parts[key].meshIds.push(node.instanceID);
}

// Texto del botón: DISPLAY_NAMES si existe, si no el nombre de Sketchfab
function displayLabel(name) {
  if (DISPLAY_NAMES[name]) return DISPLAY_NAMES[name];
  const label = String(name || '').replace(/_/g, ' ').trim();
  if (!label) return '';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Lista ordenada de piezas que tendrán botón a la derecha
function structureKeys() {
  const all = Object.keys(parts).filter(function (key) {
    return !isSkippedName(key);
  });
  const withMesh = all.filter(function (key) {
    return parts[key].meshIds.length;
  });
  return (withMesh.length ? withMesh : all).sort(function (a, b) {
    return a.localeCompare(b, 'es', { sensitivity: 'base' });
  });
}

// Crea los botones de estructuras al estar listo el visor
function buildStructureButtons(nodes) {
  const container = document.getElementById('structureButtons');
  if (!container) return;

  const keys = structureKeys();
  // Si Sketchfab no dejó nombres útiles, un botón por material
  if (keys.length < 2) {
    Object.keys(parts).forEach(function (key) { delete parts[key]; });
    registerPartsFromMaterials(nodes, function () {
      renderButtons(structureKeys());
    });
    return;
  }
  renderButtons(keys);
}

// Plan B: si no hay nombres de malla útiles, un botón por material de Sketchfab
function registerPartsFromMaterials(nodes, done) {
  if (!apiRef || !apiRef.getMaterialList) {
    if (done) done();
    return;
  }
  apiRef.getMaterialList(function (err, materials) {
    if (err || !materials) {
      if (done) done();
      return;
    }
    Object.keys(nodes || {}).forEach(function (id) {
      const node = nodes[id];
      if (!node || node.type !== 'Geometry' || !node.mesh) return;
      const mat = materials[node.mesh.material];
      const key = (mat && mat.name) ? mat.name : ('Material ' + node.mesh.material);
      if (isSkippedName(key)) return;
      if (!parts[key]) parts[key] = { meshIds: [], fallbackIds: [], visible: true };
      parts[key].meshIds.push(node.instanceID);
      parts[key].fallbackIds.push(node.instanceID);
    });
    if (done) done();
  });
}

// Pinta un botón azul por pieza en #structureButtons
function renderButtons(keys) {
  const container = document.getElementById('structureButtons');
  if (!container) return;
  container.innerHTML = '';
  keys.forEach(function (key, i) {
    const btn = document.createElement('button');
    btn.className = 'showButton';
    btn.id = 'keyStruct' + i;
    btn.textContent = displayLabel(key);
    btn.addEventListener('click', function () {
      showAndHide(key, btn.id);
    });
    container.appendChild(btn);
  });
}

// Busca la clave real en parts aunque cambien mayúsculas
function resolvePartKey(query) {
  if (parts[query]) return query;
  const q = String(query || '').toLowerCase();
  const keys = Object.keys(parts);
  return keys.find(function (key) {
    return key.toLowerCase() === q;
  }) || query;
}

// Enciende o apaga todas las mallas de una pieza
function setPartVisible(key, visible) {
  const part = parts[key];
  if (!part || !apiRef) return;
  part.visible = visible;
  const ids = part.meshIds.length ? part.meshIds : part.fallbackIds;
  ids.forEach(function (id) {
    if (visible) apiRef.show(id);
    else apiRef.hide(id);
  });
}

// Oculta las anotaciones numeradas de Sketchfab al abrir
function hideAllAnnotations(count) {
  const n = typeof count === 'number' ? count : 20;
  for (let i = 0; i < n; i++) {
    apiRef.hideAnnotation(i, function () {});
  }
}

//Muestra/oculta un objeto al clicar un botón que cambia de color Ej: encéfalos
function showAndHide(nodeName, buttonId = null) {
  const btn = document.getElementById(buttonId);
  //console.log(filteredNodes); //R: esto sólo se descomenta para que en consola del navegador pueda ver como se llaman las partes del modelo y poder buscarlas.

  const key = resolvePartKey(nodeName);
  if (key && parts[key]) {
    const visible = !parts[key].visible;
    setPartVisible(key, visible);
    if (buttonId && btn) {
      if (visible) btn.classList.replace('hideButton', 'showButton');
      else btn.classList.replace('showButton', 'hideButton');
    }
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

// Nombres de nodo que contienen un código (p. ej. el "mtl" del material)
function findNodeGroups(code) {
  return nodeNames.filter((nodeName) => nodeName.includes(code));
};

// Para mostrar/ocultar grupos de huesos por mismo código de color (el "mtl")
function showAndHideGroup(code, buttonId) {
  const nodeNames = findNodeGroups(code);
  nodeNames.forEach((node, i) => {
    if (i === 0) {
      showAndHide(node, buttonId);
    } else {
      showAndHide(node);
    }
  });
}

// =====================================================
//   VENTANA DE INFO
// =====================================================
// Abre el modal con la guía de uso del visor
function showInfo() {
  const modal = document.getElementById('infoModal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.addEventListener('keydown', infoModalEscClose);
}

// Cierra el modal de información
function closeInfoModal() {
  const modal = document.getElementById('infoModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', infoModalEscClose);
}

// Cerrar el modal de info con la tecla Escape
function infoModalEscClose(e) {
  if (e.key === 'Escape') closeInfoModal();
}
