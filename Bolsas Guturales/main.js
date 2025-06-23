const model = '25e00808733e45b4af473b47b8873c12'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

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

    // function getAzimuth() {
    //   api.getCameraLookAt(function (err, camera) {
    //         var Cx = camera.position[0];
    //         var Cy = camera.position[1];
    //         var Tx = camera.target[0];
    //         var Ty = camera.target[1];
    //         azimuth = Math.atan2(Cy-Ty, Cx-Tx);
    //   });
    // }

    // //Punto "desde" para las vistas izquierda, anterior, derecha, posterior
    // const XYZa = [  
    //   [-0.0573, -1.0648, 0.0359],
    //   [-1.0623, 0.1739, 0.0266],
    //   [0.0597, 0.9722, 0.1828],
    //   [1.1125, -0.0995, 0.2066]
    // ];

    // //Punto "desde" para las vistas izquierda, anterior, derecha, posterior
    // const XYZb = [
    //   [0.0472, 0.0512, 0.0183],
    //   [0.0400, -0.0297, 0.0207],
    //   [-0.0320, -0.0237, 0.0160],
    //   [-0.0964, 0.0682, -0.0081]
    // ];
    
    // //Al abrirse el modelo, pone la vista estandar del lado izquierdo
    // api.setCameraLookAt(XYZa[3], XYZb[3], 2);
    
    // //Hace girar cámara 90º en sentido horario, mirando hacia el lado izquierdo, posterior, derecho o frontal
    // //Primero comprueba en qué sector se encuentra, luego gira al siguiente
    // keyP.addEventListener('click', function () {
    //   getAzimuth();

    //   //convierte el azimuth de la cámara en un índice de vista: 0=posterior, 1=izquierda, 2=anterior, 3=derecha
    //       let XYZi = Math.round((Math.PI-azimuth)/(Math.PI/2))-1;
    //       if (XYZi == -1) {XYZi = 3}

    //       if (XYZi < 3) { XYZi ++ }
    //       else          { XYZi = 0 };
    //       api.setCameraLookAt(XYZa[XYZi], XYZb[XYZi], 2);
    // });

    // //Hace girar la cámara 90º en sentido antihorario, mirando hacia el lado izquierdo, frontal, derecho o posterior
    // //Primero comprueba en qué sector se encuentra, luego gira al siguiente sector
    // keyQ.addEventListener('click', function () {
    //   getAzimuth();
    //       let XYZi = Math.round((Math.PI-azimuth)/(Math.PI/2))-1;
    //       if (XYZi == -1) {XYZi = 3}

    //       if (XYZi > 0) { XYZi -- }
    //       else          { XYZi = 3 };
    //       api.setCameraLookAt(XYZa[XYZi], XYZb[XYZi], 2);
    // });
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
  console.log(filteredNodes); //R: esto sólo se descomenta para que en consola del navegador pueda ver como se llaman las partes del modelo y poder buscarlas.
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