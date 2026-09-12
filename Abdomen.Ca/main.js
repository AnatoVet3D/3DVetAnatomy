const model = '7b80b3644c5449db8aa1a1fdd3a58cc3'; // Modelo de referencia a Sketchfab

// var (no let/const): viewer-ui.js las usa desde el ámbito global
var parts = {};          // nombre Sketchfab -> { visible }
var listedNodes = {};    // instanceID -> { name }
var idNodes = {};        // nombre Sketchfab -> instanceID (MatrixTransform)
var apiRef;              // Referencia a la api, para poder llamarla fuera del eventListener
var annotationCount = 8;
var showToolTip = false;

let azimuth; // orientación de cámara para girar las etiquetas de los planos

// Nombre visible (con tildes) y nombre del nodo en Sketchfab
const listedKeys = {
  'keyA': { kGroup: 'keyA', Name: 'Esqueleto', nodeName: 'Esqueleto' },
  'keyB': { kGroup: 'key2', Name: 'Esófago', nodeName: 'Esofago' },
  'keyC': { kGroup: 'key2', Name: 'Estómago', nodeName: 'Estomago' },
  'keyD': { kGroup: 'key2', Name: 'Duodeno', nodeName: 'Duodeno' },
  'keyE': { kGroup: 'key2', Name: 'Yeyuno', nodeName: 'Yeyuno' },
  'keyF': { kGroup: 'key2', Name: 'Íleon', nodeName: 'Ileon' },
  'keyG': { kGroup: 'key2', Name: 'Colon', nodeName: 'Colon' },
  'keyH': { kGroup: 'key2', Name: 'Ciego', nodeName: 'Ciego' },
  'keyI': { kGroup: 'key2', Name: 'Hígado', nodeName: 'Higado' },
  'keyJ': { kGroup: 'key2', Name: 'Vesícula Biliar', nodeName: 'Vesicula Biliar' },
  'keyK': { kGroup: 'key2', Name: 'Páncreas', nodeName: 'Pancreas' },
  'keyL': { kGroup: 'key3', Name: 'Riñones', nodeName: 'Rinones' },
  'keyM': { kGroup: 'key3', Name: 'Uréteres', nodeName: 'Ureteres' },
  'keyN': { kGroup: 'key3', Name: 'Vejiga', nodeName: 'Vejiga' },
  'keyO': { kGroup: 'key3', Name: 'Uretra', nodeName: 'Uretra' },
  'keyP': { kGroup: 'key4', Name: 'Aorta Abdominal', nodeName: 'Arteria Aorta' },
  'keyQ1': { kGroup: 'key4', Name: 'A. Celíaca', nodeName: 'Arteria Celiaca' },
  'keyQ3': { kGroup: 'key4', Name: 'A. Ilíaca Externa', nodeName: 'Arteria Iliaca Externa' },
  'keyQ4': { kGroup: 'key4', Name: 'A. Ilíaca Interna', nodeName: 'Arteria Iliaca Interna' },
  'keyQ2': { kGroup: 'key4', Name: 'A. Cicunfl. Ilíaca Profun.', nodeName: 'Arteria Iliaca Profunda' },
  'keyQ5': { kGroup: 'key4', Name: 'A. Mesentérica Caudal', nodeName: 'Arteria Mesenterica Caudal' },
  'keyQ6': { kGroup: 'key4', Name: 'A. Mesentérica Craneal', nodeName: 'Arteria Mesenterica Craneal' },
  'keyQ7': { kGroup: 'key4', Name: 'A. Renal', nodeName: 'Arteria Renal' },
  'keyQ8': { kGroup: 'key4', Name: 'A. Testicular', nodeName: 'Arteria Testicular' },
  'keyR': { kGroup: 'key4', Name: 'V. Cava Caudal', nodeName: 'Vena Cava' },
  'keyS1': { kGroup: 'key4', Name: 'Vena Renal', nodeName: 'Vena Renal' },
  'keyS2': { kGroup: 'key4', Name: 'V. Ilíaca Externa', nodeName: 'Vena Iliaca Externa' },
  'keyS3': { kGroup: 'key4', Name: 'V. Ilíaca Interna', nodeName: 'Vena Iliaca Interna' },
  'keyT': { kGroup: 'key4', Name: 'V. Porta', nodeName: 'Vena Porta' },
  'keyU': { kGroup: 'key4', Name: 'Linfonódulos', nodeName: 'Nodulos Linfaticos' },
  'keyV': { kGroup: 'key5', Name: 'Glándulas Adrenales', nodeName: 'Glandulas Adrenales' },
  'keyW': { kGroup: 'key5', Name: 'Bazo', nodeName: 'Bazo' },
  'keyX': { kGroup: 'keyX', Name: 'Perro', nodeName: 'Perro' },
  'keyY1': { kGroup: 'key1', Name: 'Planos', nodeName: 'Planos' },
  'keyY2': { kGroup: 'key1', Name: 'Epigastrio', nodeName: 'TEpigastrio' },
  'keyY3': { kGroup: 'key1', Name: 'Hipogastrio', nodeName: 'THipogastrio' },
  'keyY4': { kGroup: 'key1', Name: 'Mesogastrio', nodeName: 'TMesogastrio' }
};

const EXPLORATION_NODES = ['Planos', 'TEpigastrio', 'THipogastrio', 'TMesogastrio'];

// Aorta y cava arrastran arterias / venas hijas (igual que displayArterias / displayVenas)
const PART_EXTRAS = {
  'Arteria Aorta': [
    'Arteria Celiaca', 'Arteria Iliaca Externa', 'Arteria Iliaca Interna',
    'Arteria Iliaca Profunda', 'Arteria Mesenterica Caudal', 'Arteria Mesenterica Craneal',
    'Arteria Renal', 'Arteria Testicular'
  ],
  'Vena Cava': ['Vena Renal', 'Vena Iliaca Externa', 'Vena Iliaca Interna']
};

// Círculos de grupo (Perro y Esqueleto van sueltos, como los huesos del codo)
var PART_GROUPS = {
  digestivo: {
    btnId: 'keyGrpDig',
    parts: [
      { name: 'Esofago', btnId: 'keyEsofago' },
      { name: 'Estomago', btnId: 'keyEstomago' },
      { name: 'Duodeno', btnId: 'keyDuodeno' },
      { name: 'Yeyuno', btnId: 'keyYeyuno' },
      { name: 'Ileon', btnId: 'keyIleon' },
      { name: 'Ciego', btnId: 'keyCiego' },
      { name: 'Colon', btnId: 'keyColon' },
      { name: 'Higado', btnId: 'keyHigado' },
      { name: 'Vesicula Biliar', btnId: 'keyVesicula' },
      { name: 'Pancreas', btnId: 'keyPancreas' }
    ]
  },
  circulatorio: {
    btnId: 'keyGrpCir',
    parts: [
      { name: 'Arteria Aorta', btnId: 'keyAorta' },
      { name: 'Vena Cava', btnId: 'keyCava' },
      { name: 'Vena Porta', btnId: 'keyPorta' },
      { name: 'Nodulos Linfaticos', btnId: 'keyLinfo' }
    ]
  },
  urinario: {
    btnId: 'keyGrpUri',
    parts: [
      { name: 'Rinones', btnId: 'keyRinones' },
      { name: 'Ureteres', btnId: 'keyUreteres' },
      { name: 'Vejiga', btnId: 'keyVejiga' },
      { name: 'Uretra', btnId: 'keyUretra' }
    ]
  },
  otras: {
    btnId: 'keyGrpOtr',
    parts: [
      { name: 'Glandulas Adrenales', btnId: 'keyAdrenales' },
      { name: 'Bazo', btnId: 'keyBazo' }
    ]
  }
};

function displayNameForNode(rawName) {
  const base = String(rawName || '').split('_')[0];
  const q = normalizeKey(base);
  for (const k in listedKeys) {
    const nodeName = listedKeys[k].nodeName;
    if (nodeName === base || nodeName === rawName || normalizeKey(nodeName) === q) {
      return listedKeys[k].Name;
    }
  }
  return base;
}

function isIgnoredPickName(rawName) {
  const base = String(rawName || '').split('_')[0];
  return /^(RootNode|Camera|Light)$/i.test(base);
}

function setNodeVisible(name, visible) {
  if (!parts[name]) parts[name] = { visible: true };
  parts[name].visible = visible;
  const id = idNodes[name];
  if (id == null) return;
  if (visible) apiRef.show(id);
  else apiRef.hide(id);
}

function setPartVisible(key, visible, skipSync) {
  if (!parts[key] && idNodes[key] == null) return;
  setNodeVisible(key, visible);
  const extras = PART_EXTRAS[key];
  if (extras) {
    extras.forEach(function (name) {
      setNodeVisible(name, visible);
    });
  }
  if (!skipSync) {
    refreshAllGroupButtons();
    updateAnchoredLabels();
  }
}

function afterGroupToggle() {
  updateAnchoredLabels();
}

// El 1.er argumento es el nombre EXACTO del nodo en Sketchfab
function showAndHide(nodeName, buttonId) {
  const key = resolvePartKey(nodeName) || nodeName;
  const visible = !isPartVisible(key);
  setPartVisible(key, visible);
  if (buttonId) setButtonOn(document.getElementById(buttonId), visible);
  refreshAllGroupButtons();
}

function hideAllAnnotations() {
  for (let i = 0; i < annotationCount; i++) {
    apiRef.hideAnnotation(i, function () {});
  }
}

function showAllAnnotations() {
  for (let i = 0; i < annotationCount; i++) {
    apiRef.showAnnotation(i, function () {});
  }
}

function setExplorationVisible(visible) {
  EXPLORATION_NODES.forEach(function (name) {
    setPartVisible(name, visible, true);
  });
  if (visible) showAllAnnotations();
  else hideAllAnnotations();
}

function toogleToolTips() {
  const btn = document.getElementById('key1');
  showToolTip = !showToolTip;
  setExplorationVisible(showToolTip);
  if (btn) {
    if (showToolTip) btn.classList.replace('hideKey', 'showKey');
    else btn.classList.replace('showKey', 'hideKey');
  }
}

const iframe = document.getElementById('api-frame');
const client = new Sketchfab(iframe);

function error() {
  console.error('Sketchfab API Error!');
}

function success(api) {
  apiRef = api;
  api.start();
  api.addEventListener('viewerready', function () {
    api.getNodeMap(function (err, nodes) {
      if (!err) {
        for (const prop in nodes) {
          if (!nodes.hasOwnProperty(prop)) continue;
          const node = nodes[prop];
          const fullName = node.name;
          if (!fullName || fullName === 'undefined') continue;
          const name = fullName.split('_')[0];
          const entry = { name: name, instanceID: node.instanceID };
          listedNodes[prop] = entry;
          if (node.instanceID != null) listedNodes[node.instanceID] = entry;
          if (name === fullName && node.type === 'MatrixTransform') {
            idNodes[name] = node.instanceID;
            if (!parts[name]) parts[name] = { visible: true };
          }
        }

        setPartVisible('Perro', false, true);
        setExplorationVisible(false);
        showToolTip = false;
        refreshAllGroupButtons();
      }

      hideAllAnnotations();

      // Cada 0,5 s: si la vista lo pide, da la vuelta a las etiquetas de los planos
      setInterval(function () {
        getAzimuth();
        const orientation = (azimuth >= -1.6461 && azimuth <= 1.4736) ? -Math.PI / 2 : Math.PI / 2;
        ['keyY2', 'keyY3', 'keyY4'].forEach(function (k) {
          const node = idNodes[listedKeys[k].nodeName];
          if (node != null) api.rotate(node, [orientation, 0, 1, 0], { duration: 0, easing: 'easeOutQuad' });
        });
      }, 500);
    });

    if (api.getAnnotationList) {
      api.getAnnotationList(function (err, annotations) {
        if (!err && annotations) annotationCount = annotations.length;
        hideAllAnnotations();
      });
    }

    function getAzimuth() {
      api.getCameraLookAt(function (err, camera) {
        var Cx = camera.position[0];
        var Cy = camera.position[1];
        var Tx = camera.target[0];
        var Ty = camera.target[1];
        azimuth = Math.atan2(Cy - Ty, Cx - Tx);
      });
    }

    // Punto "desde" / "hacia": izquierda, anterior, derecha, posterior
    const XYZa = [
      [-0.0573, -1.0648, 0.0359],
      [-1.0623, 0.1739, 0.0266],
      [0.0597, 0.9722, 0.1828],
      [1.1125, -0.0995, 0.2066]
    ];
    const XYZb = [
      [0.0472, 0.0512, 0.0183],
      [0.0400, -0.0297, 0.0207],
      [-0.0320, -0.0237, 0.0160],
      [-0.0964, 0.0682, -0.0081]
    ];

    enableOrthoSnapViews({
      from: XYZa,
      target: XYZb,
      initialIndex: 3,
      duration: 2
    });

    enableHoverHighlight();
    enableClickNameBubble();
    api.addEventListener('camerastart', startAnchorTracking);
    api.addEventListener('camerastop', stopAnchorTracking);
    window.addEventListener('resize', updateAnchoredLabels);
  });
}

client.init(model, {
  success: success,
  error: error,
  ui_infos: 0,
  ui_controls: 0,
  ui_stop: 1,
  watermark: 1,
  supersample: 0
});
