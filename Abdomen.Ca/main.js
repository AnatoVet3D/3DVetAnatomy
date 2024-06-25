const model = '7b80b3644c5449db8aa1a1fdd3a58cc3'; // Modelo de referencia a Sketchfab

//Redefine los dos botones
const buttonA = document.getElementById('buttonA');
const buttonB = document.getElementById('buttonB');
const buttonC = document.getElementById('buttonC');

let azimuth;  //variable global para pasar el resultado de la función getAzimuth()

//Objeto para recoger las correspondencias entre nombres, nodos y botones
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
  'keyP': { kGroup: 'key4', Name: 'Aorta', nodeName: 'Aorta' },
  'keyQ1': { kGroup: 'key4', Name: 'Arteria Celíaca', nodeName: 'Arteria Celiaca' },
  'keyQ3': { kGroup: 'key4', Name: 'Arteria Ilíaca Externa', nodeName: 'Arteria Iliaca Externa' },
  'keyQ4': { kGroup: 'key4', Name: 'Arteria Ilíaca Interna', nodeName: 'Arteria Iliaca Interna' },
  'keyQ2': { kGroup: 'key4', Name: 'Art. Cicunfl. Ilíaca Profun.', nodeName: 'Arteria Iliaca Profunda' },
  'keyQ5': { kGroup: 'key4', Name: 'Art. Mesentérica Caudal', nodeName: 'Arteria Mesenterica Caudal' },
  'keyQ6': { kGroup: 'key4', Name: 'Art. Mesentérica Craneal', nodeName: 'Arteria Mesenterica Craneal' },
  'keyQ7': { kGroup: 'key4', Name: 'Arteria Renal', nodeName: 'Arteria Renal' },
  'keyQ8': { kGroup: 'key4', Name: 'Arteria Testicular', nodeName: 'Arteria Testicular' },
  'keyR': { kGroup: 'key4', Name: 'V. Cava Caudal', nodeName: 'Vena Cava' },
  'keyS1': { kGroup: 'key4', Name: 'Vena Renal', nodeName: 'Vena Renal' },
  'keyS2': { kGroup: 'key4', Name: 'Vena Ilíaca Externa', nodeName: 'Vena Iliaca Externa' },
  'keyS3': { kGroup: 'key4', Name: 'Vena Ilíaca Interna', nodeName: 'Vena Iliaca Interna' },
  'keyT': { kGroup: 'key4', Name: 'Vena Porta', nodeName: 'Vena Porta' },
  'keyU': { kGroup: 'key4', Name: 'Nódulos Linfáticos', nodeName: 'Nodulos Linfaticos' },
  'keyV': { kGroup: 'key5', Name: 'Glándulas Adrenales', nodeName: 'Glandulas Adrenales' },
  'keyW': { kGroup: 'key5', Name: 'Bazo', nodeName: 'Bazo' },
  'keyX': { kGroup: 'keyX', Name: 'Perro', nodeName: 'Perro' },
  'keyY1': { kGroup: 'key1', Name: 'Planos', nodeName: 'Planos' },
  'keyY2': { kGroup: 'key1', Name: 'Epigastrio', nodeName: 'TEpigastrio' },
  'keyY3': { kGroup: 'key1', Name: 'Hipogastrio', nodeName: 'THipogastrio' },
  'keyY4': { kGroup: 'key1', Name: 'Mesogastrio', nodeName: 'TMesogastrio' }
};

// Rellena el objeto "labelsFor" con las referencias HTML de las etiquetas "label for="
const labelsFor = {};
const labelsHTML = document.getElementsByTagName("label");
for (let i = 0; i < labelsHTML.length; i++) {
  labelsFor[labelsHTML[i].getAttribute("for")] = i;
}

// Inserta en cada etiqueta de un órgano, el nombre del órgano mismo
for (let key in listedKeys) {
  const index = labelsFor[key];
  if (index) { labelsHTML[index].innerText = listedKeys[key].Name; }
}

const listedNodes = {}; // Objeto para guardar todos los nodos, también los que tienen el mismo nombre
const idNodes = {};     // Objeto para guardar los ID de los nodos
let apiRef;             // Referencia a la api, para poder llamarla fuera del evetListener

//INICIO Sketchfab
//Asi se llama a la versión de api que esté actualmente
const iframe = document.getElementById('api-frame');
const client = new Sketchfab(iframe);

function error() {
  console.error('Sketchfab API Error!');
}

function success(api) {
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
            const name = nodes[prop].name.split('_')[0];  //Nombre base, sin nombre de textura (_...)
            const type = nodes[prop].type;

            listedNodes[prop] = name;
            if (name === nodes[prop].name && type === "MatrixTransform") {
              idNodes[name] = nodes[prop].instanceID;
            }
          }
        }
        
        //Deselecciona algunos botones
        document.getElementById('keyX').checked = false; showAndHide('keyX');
        document.getElementById('key1').checked = false; showGroup('key1');
        
        //Bucle: cada 0.5 secundos comprueba la orientación de la vista y, si es el caso, da la vuelta a las tre etiquetas
        setInterval(function () {
          getAzimuth();
          let orientation = (azimuth >= -3.0738 && azimuth <= 0.0296) ? -Math.PI / 2 : Math.PI / 2;
          let node = idNodes[listedKeys['keyY2'].nodeName];
          api.rotate(node, [orientation, 0, 1, 0], { duration: 0, easing: 'easeOutQuad' });
          node = idNodes[listedKeys['keyY3'].nodeName];
          api.rotate(node, [orientation, 0, 1, 0], { duration: 0, easing: 'easeOutQuad' });
          node = idNodes[listedKeys['keyY4'].nodeName];
          api.rotate(node, [orientation, 0, 1, 0], { duration: 0, easing: 'easeOutQuad' });
        }, 500);
      }
    });

    function getAzimuth() {
      api.getCameraLookAt(function (err, camera) {
        azimuth = Math.atan2(camera.position[1] - camera.target[1], camera.position[0] - camera.target[0]);
      });
    }

    //Punto "desde" para las vistas izquierda, anterior, derecha, posterior
    const XYZa = [  
      [0.1542, -0.4590, 0.0947],
      [-0.3681, -0.1279, 0.0145],
      [0.0453, 0.3896, 0.0557],
      [0.5250, 0.0330, 0.0929]
    ];

    //Punto "desde" para las vistas izquierda, anterior, derecha, posterior
    const XYZb = [
      [0.1290, -0.0573, -0.0075],
      [0.0462, -0.0998, 0.0149],
      [0.0413, -0.0222, 0.0025],
      [0.1218, -0.0075, 0.0025]
    ];

    //Hace girar cámara 90º en sentido horario, mirando hacia el lado izquierdo, posterior, derecho o frontal
    //Primero comprueba en qué sector se encuentra, luego gira al siguiente
    buttonA.addEventListener('click', function () {
      getAzimuth();

      //convierte el azimuth de la cámara en un índice de vista: 0=posterior, 1=izquierda, 2=anterior, 3=derecha
      let XYZi = Math.round((Math.PI - azimuth) / (Math.PI / 2)) - 1;
      XYZi = XYZi === -1 ? 3 : XYZi < 3 ? XYZi + 1 : 0;
      api.setCameraLookAt(XYZa[XYZi], XYZb[XYZi], 2);
    });

    //Hace girar la cámara 90º en sentido antihorario, mirando hacia el lado izquierdo, frontal, derecho o posterior
    //Primero comprueba en qué sector se encuentra, luego gira al siguiente sector
    buttonB.addEventListener('click', function () {
      getAzimuth();
      let XYZi = Math.round((Math.PI - azimuth) / (Math.PI / 2)) - 1;
      XYZi = XYZi === -1 ? 3 : XYZi > 0 ? XYZi - 1 : 3;
      api.setCameraLookAt(XYZa[XYZi], XYZb[XYZi], 2);
    });

    //Abre una ventana con informacion de uso del visor
    buttonC.addEventListener('click', function () {
      alert("Modelo 3D \"Abdomen de perro\"\n" +
        "Facultad de Veterinaria - Universidad Complutense de Madrid\n\n" +
        "Controles con el ratón:\n" +
        "- Botón izquierdo: gira el modelo\n" +
        "- Botón central: desplaza el modelo\n" +
        "- Girar rueda: zoom\n" +
        "- Clic en un órgano: muestra el nombre del órgano\n" +
        "- Doble clic en un órgano: lo convierte en el punto de giro del modelo\n" +
        "- Clic en flechas de giro: giran el modelo en las 4 vistas anatómicas\n" +
        "- Opciones del menú: encienden/apagan un órgano o grupo de órganos"
      );
    });

    //Código para mostrar el nombre de un órgano cuando se clica en él
    api.addEventListener('click', function (info) {
      if (info.instanceID === null) {
        document.getElementById('labelpick').innerHTML = 'clic en un órgano...';
      } else {
        const node = listedNodes[info.instanceID];
        for (const kBox in listedKeys) {
          if (listedKeys[kBox].nodeName === node) {
            document.getElementById('labelpick').innerHTML = listedKeys[kBox].Name;
          }
        }
      }
    }, { pick: 'slow' });
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
//FIN Sketchfab

// Funciones Propias
//creadas para solo tener que llamarlas desde el .HTML
function showAndHide(key) {
  const node = listedKeys[key].nodeName;
  const group = listedKeys[key].kGroup;
  const checkBox = document.getElementById(key);
  const checkGroup = document.getElementById(group);

  if (checkBox.checked && checkGroup.checked) {
    apiRef.show(idNodes[node]);
    if (key === "keyP") { displayArterias(true); }
    if (key === "keyR") { displayVenas(true); }
  } else {
    apiRef.hide(idNodes[node]);
    if (key === "keyP") { displayArterias(false); }
    if (key === "keyR") { displayVenas(false); }
  }
}

function displayArterias(show) {
  const keys = ["keyQ1", "keyQ2", "keyQ3", "keyQ4", "keyQ5", "keyQ6", "keyQ7", "keyQ8"];
  for (const key of keys) {
    const node = listedKeys[key].nodeName;
    if (show) { apiRef.show(idNodes[node]); }
    else { apiRef.hide(idNodes[node]); }
  }
}

function displayVenas(show) {
  const keys = ["keyS1", "keyS2", "keyS3"];
  for (const key of keys) {
    const node = listedKeys[key].nodeName;
    if (show) { apiRef.show(idNodes[node]); }
    else { apiRef.hide(idNodes[node]); }
  }
}

// Activa-Desactiva los grupos de botones
function showGroup(groupId) {
  const checkGroup = document.getElementById(groupId);
  const group = [];

  switch (groupId) {
    case "key1":
      group.push("keyY1", "keyY2", "keyY3", "keyY4");
      break;
    case "key2":
      group.push("keyB", "keyC", "keyD", "keyE", "keyF", "keyG", "keyH", "keyI", "keyJ", "keyK");
      break;
    case "key3":
      group.push("keyL", "keyM", "keyN", "keyO");
      break;
    case "key4":
      group.push("keyP", "keyR", "keyT", "keyU");
      break;
    case "key5":
      group.push("keyV", "keyW");
      break;
  }

  for (const key of group) {
    const node = listedKeys[key].nodeName;
    const checkBox = document.getElementById(key);

    if (checkGroup.checked) {
      if (groupId === "key1" || checkBox.checked) { apiRef.show(idNodes[node]); }
      if (key === "keyP" && checkBox.checked) { displayArterias(true); }
      if (key === "keyR" && checkBox.checked) { displayVenas(true); }
      if (groupId !== "key1") {
        checkBox.disabled = false;
        labelsHTML[labelsFor[key]].style.color = 'blue';
      }
    } else {
      apiRef.hide(idNodes[node]);
      if (key === "keyP") { displayArterias(false); }
      if (key === "keyR") { displayVenas(false); }
      if (groupId !== "key1") {
        checkBox.disabled = true;
        labelsHTML[labelsFor[key]].style.color = 'gray';
      }
    }
  }
}
//FIN Sketchfab