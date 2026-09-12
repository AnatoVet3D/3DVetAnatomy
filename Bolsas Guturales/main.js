const model = '25e00808733e45b4af473b47b8873c12'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

const filteredNodes = {}; // Objeto para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }
var apiRef; // Referencia a la api, para poder llamarla fuera del evetListener
var parts = {}; // visibilidad lógica por botón (viewer-ui.js: círculos de grupo)

//INICIO Sketchfab
//Asi se llama a la versión de api que esté actualmente
iframe = document.getElementById('api-frame');
client = new Sketchfab(iframe);

const nodeNames = []; // Array para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }

// Lista de nodos que quieres ocultar al cargar
const nodosInicialmenteOcultos = [
  "Imagen CorteParasagital",
  "Imagen CorteCraneal",
];

// Nodos controlados por los botones de iconos (keyB, keyP, keyQ)
const skullBones = [
  'Hueso001',
  'Hueso002',
  'Hueso003',
  'Hueso004'
];

const skullImages = [
  'Imagen CorteCraneal',
  'Imagen CorteParasagital'
];

const skullViewNodes = [...skullBones, ...skullImages];

// Círculos de grupo (Venas, Arterias, Hioides y Meatos quedan sueltos)
var PART_GROUPS = {
  bolsas: {
    btnId: 'keyGrpBol',
    parts: [
      { name: 'BolsaGutural', btnId: 'keyE' },
      { name: 'Diverticulo_TrompaAuditiva', btnId: 'keyG' }
    ]
  },
  senos: {
    btnId: 'keyGrpSen',
    parts: [
      { name: 'Seno_Conchofrontal', btnId: 'keyJ' },
      { name: 'Seno_Esfenopalatino', btnId: 'keyK' },
      { name: 'Seno_Etmoidal', btnId: 'keyL' },
      { name: 'Seno_MaxilarCaudal', btnId: 'keyM' },
      { name: 'Seno_MaxilarRostral', btnId: 'keyN' }
    ]
  }
};

parts.BolsaGutural = { visible: true, groupCode: 'BolsaGutural' };
parts.Diverticulo_TrompaAuditiva = { visible: true };
parts.Seno_Conchofrontal = { visible: true };
parts.Seno_Esfenopalatino = { visible: true };
parts.Seno_Etmoidal = { visible: true };
parts.Seno_MaxilarCaudal = { visible: true };
parts.Seno_MaxilarRostral = { visible: true };

let skullOpacityMaterials = []; // materiales del cráneo para el slider

// Configuración de qué se ve en cada botón P y Q
const skullViews = {
  keyP: { // Corte craneal
    'Hueso001': false,
    'Hueso002': false,
    'Hueso003': true,
    'Hueso004': true,
    'Imagen CorteCraneal': true,
    'Imagen CorteParasagital': false
  },
  keyQ: { // Corte parasagital
    'Hueso001': false,
    'Hueso002': true,
    'Hueso003': false,
    'Hueso004': true,
    'Imagen CorteCraneal': false,
    'Imagen CorteParasagital': true
  }
};

// Para saber qué "corte" está activo (P o Q)
let activeSlice = null;


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
              const name = nodes[prop].name;
              nodeNames.push(name);
              filteredNodes[name] = {   //Aquí va rellenando nuestro objeto creado arriba
                show: true,
                instanceId: nodes[prop].instanceID
              };
            };
          };
        };
        // Ocultar nodos especificados al inicio
        nodosInicialmenteOcultos.forEach((nombreNodo) => {
          if (filteredNodes[nombreNodo]) {
            filteredNodes[nombreNodo].show = false;
            apiRef.hide(filteredNodes[nombreNodo].instanceId);
          }
        });
        refreshAllGroupButtons();
        cacheSkullOpacityMaterials(nodes);
        //Para ocultar las anotaciones desde el comienzo ya que el botón de Exploración comienza apagado
        for (let i = 0; i < 13; i++) { // R: Según el nº de anotaciones modificar el último número
          apiRef.hideAnnotation(i, function (err, index) {
            if (!err) {
              //window.console.log('Hiding annotation', index + 1);
            }
          });
        }
      });
    });

    // Puntos de cámara para keyP y keyQ
    const camPos_P = [-0.007580537255248081, -0.9563176979727426, 0.22682669953700535];  // Vista lateral izquierda, por ejemplo
    const camTarget_P = [0.014990176352229136, 0.05734959364337239, 0.20123776708097257];

    const camPos_Q = [1.1125, -0.0995, 0.2066];  // Vista lateral derecha, por ejemplo
    const camTarget_Q = [-0.0964, 0.0682, -0.0081];

    // Solo mover cámara a un punto al hacer clic
    document.getElementById('keyP').addEventListener('click', function () {
      apiRef.setCameraLookAt(camPos_P, camTarget_P, 2);  // último parámetro es duración (segundos)
    });

    document.getElementById('keyQ').addEventListener('click', function () {
      apiRef.setCameraLookAt(camPos_Q, camTarget_Q, 2);
    });

    const opacitySlider = document.getElementById('skullOpacity');
    if (opacitySlider) {
      opacitySlider.addEventListener('input', function () {
        applySkullOpacity(this.value);
      });
    }

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

//   VENTANA DE INFO
// =====================================================
//Abre una ventana con informacion de uso del visor
function showInfo(){
  const modal = document.getElementById("infoModal");
  if (!modal) return;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");

  // Cerrar con ESC
  document.addEventListener("keydown", infoModalEscClose);
}

function closeInfoModal() {
  const modal = document.getElementById("infoModal");
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  document.removeEventListener("keydown", infoModalEscClose);
}

function infoModalEscClose(e) {
  if (e.key === "Escape") closeInfoModal();
}
//FIN VENTANA DE INFO

//Muestra/oculta un objeto al clicar un botón que cambia de color Ej: encéfalos
function showAndHide(nodeName, buttonId = null) {
  //console.log(filteredNodes); //R: esto sólo se descomenta para que en consola del navegador pueda ver como se llaman las partes del modelo y poder buscarlas.
  const key = resolvePartKey(nodeName) || nodeName;
  const visible = !isPartVisible(key);
  setPartVisible(key, visible);
  if (buttonId) setButtonOn(document.getElementById(buttonId), visible);
}

function setNodeVisibleByName(name, visible) {
  const node = filteredNodes[name];
  if (!node) return;
  node.show = visible;
  if (visible) apiRef.show(node.instanceId);
  else apiRef.hide(node.instanceId);
}

function setPartVisible(key, visible, skipSync) {
  if (!parts[key]) parts[key] = { visible: true };
  parts[key].visible = visible;
  const code = parts[key].groupCode;
  if (code) {
    findNodeGroups(code).forEach(function (name) {
      setNodeVisibleByName(name, visible);
    });
  } else {
    setNodeVisibleByName(key, visible);
  }
  if (!skipSync) refreshAllGroupButtons();
}

function isSkullNodeName(name) {
  if (!name) return false;
  return skullBones.some(function (bone) {
    return name === bone || name.indexOf(bone) === 0;
  });
}

function cacheSkullOpacityMaterials(nodes) {
  if (!apiRef || !nodes) return;
  const matIds = {};
  const matIndexes = {};
  for (const prop in nodes) {
    if (!nodes.hasOwnProperty(prop)) continue;
    const node = nodes[prop];
    if (!node || !node.name || !isSkullNodeName(node.name)) continue;
    if (node.materialID != null) matIds[node.materialID] = true;
    if (typeof node.material === 'number') matIndexes[node.material] = true;
    if (node.material && node.material.id != null) matIds[node.material.id] = true;
    if (node.mesh && node.mesh.material != null) matIndexes[node.mesh.material] = true;
  }
  apiRef.getMaterialList(function (err, materials) {
    if (err || !materials) return;
    skullOpacityMaterials = materials.filter(function (mat, i) {
      return mat && (matIds[mat.id] || matIndexes[i]);
    });
    if (!skullOpacityMaterials.length) {
      skullOpacityMaterials = materials.filter(function (mat) {
        return /hueso|bone|craneo|cráneo|skull/i.test(mat.name || '');
      });
    }
    const slider = document.getElementById('skullOpacity');
    if (!slider || !skullOpacityMaterials.length) return;
    const mat = skullOpacityMaterials[0];
    let factor = parseFloat(slider.value);
    if (mat.channels && mat.channels.Opacity && typeof mat.channels.Opacity.factor === 'number') {
      factor = mat.channels.Opacity.factor;
    }
    slider.value = factor;
  });
}

function applySkullOpacity(value) {
  if (!apiRef || !skullOpacityMaterials.length) return;
  const alpha = parseFloat(value);
  skullOpacityMaterials.forEach(function (mat) {
    if (setMaterialOpacityFactor(mat, alpha)) apiRef.setMaterial(mat);
  });
}

//Para mostrar/ocultar las anotaciones Sketchfab cuando se muestra/apaga pestaña "Exploración"
let showToolTip = false;
function toogleToolTips() {
  if (showToolTip) {
    for (let i = 0; i < 13; i++) { // R: Según el nº de anotaciones modificar el último número
      apiRef.hideAnnotation(i, function (err, index) {
      });
    }
  } else {
    for (let i = 0; i < 13; i++) { // R: Según el nº de anotaciones modificar el último número
      apiRef.showAnnotation(i, function (err, index) {
      });
    }
  }
  const btn = document.getElementById("key1");
  if (!showToolTip) {
    btn.classList.replace("hideKey", "showKey");
  } else {
    btn.classList.replace("showKey", "hideKey");
  };
  showToolTip = !showToolTip
};

//Para buscar nodes con siglas/palabras en común
function findNodeGroups(code) {
  return nodeNames.filter((nodeName) => nodeName.includes(code));
}

// Para mostrar/ocultar grupos de objetos por mismo código de color (el "mtl")
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

//AUN HAY QUE AJUSTARLO  -- NO FUNCIONA
function showOnlyNodes(nodeNamesToShow) {
  for (const name in filteredNodes) {
    if (!filteredNodes.hasOwnProperty(name)) continue;

    const node = filteredNodes[name];
    if (!node || typeof node.instanceId === 'undefined') continue;

    const shouldShow = nodeNamesToShow.includes(name);
    node.show = shouldShow;

    if (shouldShow) {
      apiRef.show(node.instanceId);
    } else {
      apiRef.hide(node.instanceId);
    }
  }

  // Mostrar los nodos que sí queremos aunque aún no estén cargados del todo
  nodeNamesToShow.forEach((nodeName) => {
    if (!filteredNodes[nodeName]) {
      console.warn(`Nodo no encontrado aún: ${nodeName}`);
    }
  });
}

function applyBaseSkullState() {
  // Todos los huesos visibles
  skullBones.forEach((name) => {
    const node = filteredNodes[name];
    if (!node) return;
    node.show = true;
    apiRef.show(node.instanceId);
  });

  // Todas las imágenes ocultas
  skullImages.forEach((name) => {
    const node = filteredNodes[name];
    if (!node) return;
    node.show = false;
    apiRef.hide(node.instanceId);
  });

  // Botones P y Q apagados
  ['keyP', 'keyQ'].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.add('hideButton');
    btn.classList.remove('showButton');
  });

  // Botón B encendido (porque todos los huesos están visibles)
  const btnB = document.getElementById('keyB');
  if (btnB) {
    btnB.classList.add('showButton');
    btnB.classList.remove('hideButton');
  }

  activeSlice = null;
}


function setSkullView(buttonId) {
  // 🔘 Caso especial: botón de calavera (keyB) = toggle de TODOS los huesos
  if (buttonId === 'keyB') {
    // ¿Están los 4 huesos visibles?
    const allBonesVisible = skullBones.every((name) => {
      const node = filteredNodes[name];
      return node && node.show;
    });

    const newState = !allBonesVisible; // si todos visibles -> los oculto; si no -> los muestro

    // Mostrar/ocultar huesos
    skullBones.forEach((name) => {
      const node = filteredNodes[name];
      if (!node) {
        console.warn('Hueso no encontrado en filteredNodes:', name);
        return;
      }
      node.show = newState;
      if (newState) {
        apiRef.show(node.instanceId);
      } else {
        apiRef.hide(node.instanceId);
      }
    });

    // Siempre ocultar las imágenes al pulsar la calavera
    skullImages.forEach((name) => {
      const node = filteredNodes[name];
      if (!node) return;
      node.show = false;
      apiRef.hide(node.instanceId);
    });

    // Actualizar estilo del botón keyB según si hay huesos visibles o no
    const btnB = document.getElementById('keyB');
    if (btnB) {
      if (newState) {
        btnB.classList.add('showButton');
        btnB.classList.remove('hideButton');
      } else {
        btnB.classList.add('hideButton');
        btnB.classList.remove('showButton');
      }
    }

    // P y Q siempre vuelven a "oculto" al usar la calavera
    ['keyP', 'keyQ'].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.add('hideButton');
      btn.classList.remove('showButton');
    });

    activeSlice = null;
    return;
  }

  // 🟦 Caso cortes: keyP o keyQ
  const view = skullViews[buttonId];
  if (!view) return;

  // Si ya está activo este corte → volver a la vista base (equivalente a keyB activado)
  if (activeSlice === buttonId) {
    applyBaseSkullState();
    return;
  }

  // Activamos una vista de corte nueva
  activeSlice = buttonId;

  skullViewNodes.forEach((nodeName) => {
    const node = filteredNodes[nodeName];
    if (!node) {
      console.warn('Nodo no encontrado en filteredNodes:', nodeName);
      return;
    }

    const shouldShow = !!view[nodeName];
    node.show = shouldShow;

    if (shouldShow) {
      apiRef.show(node.instanceId);
    } else {
      apiRef.hide(node.instanceId);
    }
  });

  // Actualizar estilos de keyP y keyQ (vista activa)
  ['keyP', 'keyQ'].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    if (id === activeSlice) {
      btn.classList.add('showButton');
      btn.classList.remove('hideButton');
    } else {
      btn.classList.add('hideButton');
      btn.classList.remove('showButton');
    }
  });

  // Actualizar estilo de keyB según si los 4 huesos están visibles tras aplicar la vista
  const btnB = document.getElementById('keyB');
  if (btnB) {
    const allBonesVisibleNow = skullBones.every((name) => {
      const node = filteredNodes[name];
      return node && node.show;
    });

    if (allBonesVisibleNow) {
      btnB.classList.add('showButton');
      btnB.classList.remove('hideButton');
    } else {
      btnB.classList.add('hideButton');
      btnB.classList.remove('showButton');
    }
  }
}
