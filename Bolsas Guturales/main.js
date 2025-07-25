const model = '25e00808733e45b4af473b47b8873c12'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

const filteredNodes = {}; // Objeto para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }
let apiRef; // Referencia a la api, para poder llamarla fuera del evetListener

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

  //Abre una ventana con informacion de uso del visor
  buttonC.addEventListener('click', function () {
    alert("Información de uso\n\n" +
      "- Botón izquierdo: gira el modelo\n" +
      "- Botón central: desplaza el modelo\n" +
      "- Girar rueda: zoom\n" +
      "- Doble clic en un órgano: lo convierte en el punto de giro del modelo\n" +
      "- Clic en calavera: muestra/oculta cráneo de équido de referencia\n" +
      "- Clic en nota: muestra/oculta anotaciones\n" +
      "- Clic en plano horizontal: muestra/oculta plano rostral del modelo\n" +
      "- Clic en plano lateral: muestra/oculta plano parasagital del modelo\n" +
      "- Opciones del menú: encienden/apagan un órgano o grupo de órganos"
    );
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

//Muestra/oculta un objeto al clicar un botón que cambia de color Ej: encéfalos
function showAndHide(nodeName, buttonId = null) {
  const btn = document.getElementById(buttonId);
  //console.log(filteredNodes); //R: esto sólo se descomenta para que en consola del navegador pueda ver como se llaman las partes del modelo y poder buscarlas.
  filteredNodes[nodeName].show = !filteredNodes[nodeName].show;
  if (filteredNodes[nodeName].show) {
    if (buttonId){
      btn.classList.replace("hideButton", "showButton");
    }
    apiRef.show(filteredNodes[nodeName].instanceId)
  } else {
    if (buttonId){
      btn.classList.replace("showButton", "hideButton");
     }
    apiRef.hide(filteredNodes[nodeName].instanceId)
  };
};

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

function findNodeGroups(code) {
  return nodeNames.filter((nodeName)=> nodeName.includes(code));
}

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
