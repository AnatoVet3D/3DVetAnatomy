const model = '9abcd6e5dcc942afa0f74266d396c41e'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

const filteredNodes = {}; // Objeto para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }
let apiRef; // Referencia a la api, para poder llamarla fuera del evetListener

//INICIO Sketchfab
//Asi se llama a la versión de api que esté actualmente
iframe = document.getElementById('api-frame');
client = new Sketchfab(iframe);

const nodeNames = []; // Array para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }


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

        //Para ocultar las anotaciones desde el comienzo ya que el botón de Exploración comienza apagado
        for (let i = 0; i < 6; i++) { // R: Según el nº de anotaciones modificar el último número
          apiRef.hideAnnotation(i, function (err, index) {
            if (!err) {
              //window.console.log('Hiding annotation', index + 1);
            }
          });
        }
      });
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
    for (let i = 0; i < 6; i++) { // R: Según el nº de anotaciones modificar el último número
      apiRef.hideAnnotation(i, function (err, index) {
      });
    }
  } else {
    for (let i = 0; i < 6; i++) { // R: Según el nº de anotaciones modificar el último número
      apiRef.showAnnotation(i, function (err, index) {
      });
    }
  }
  const btn = document.getElementById("key1");
  if (!showToolTip) {
    btn.classList.replace("hideButton", "showKey");
  } else {
    btn.classList.replace("showKey", "hideButton");
  };
  showToolTip = !showToolTip
};

function findNodeGroups(code) {
  return nodeNames.filter((nodeName)=> nodeName.includes(code));
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
};

function setOpacityGroup(code, value) {
  const opacity = parseFloat(value);
  const nodeList = findNodeGroups(code);

  if (!nodeList || nodeList.length === 0) {
    console.warn(`No se encontraron nodos para el código: ${code}`);
    return;
  }

  apiRef.getMaterialList((err, materials) => {
    if (err) {
      console.error('Error al obtener materiales:', err);
      return;
    }

    // Vamos a recorrer los nodos y usar los instanceIDs almacenados
    nodeList.forEach((nodeName) => {
      const node = filteredNodes[nodeName];
      if (!node) return;

      const instanceID = node.instanceId;

      // Ahora usamos apiRef.getMeshMaterial para obtener el material del nodo
      apiRef.getNodeMap((err, nodes) => {
        if (err) {
          console.error('Error obteniendo nodos para mapeo de materiales', err);
          return;
        }

        const nodeData = Object.values(nodes).find(n => n.name === nodeName && n.mesh);
        if (!nodeData || !nodeData.mesh) {
          console.warn(`Nodo sin malla: ${nodeName}`);
          return;
        }

        const materialIndex = nodeData.mesh.material;
        const material = materials[materialIndex];

        if (!material) {
          console.warn(`Material no encontrado para nodo ${nodeName}`);
          return;
        }

        // Aplicar opacidad
        material.channels.Alpha = {
          enable: true,
          factor: opacity
        };
        material.transparent = true;
        material.opacity = opacity;

        apiRef.setMaterial(material, () => {
          console.log(`Opacidad aplicada a nodo ${nodeName}`);
        });
      });
    });
  });
}

