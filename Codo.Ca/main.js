const model = '0bf24253bf6e4ff39932caf47a8cc0fc'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

const filteredNodes = {}; // Objeto para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }
let apiRef; // Referencia a la api, para poder llamarla fuera del evetListener

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
              const name = nodes[prop].name;
              filteredNodes[name] = {   //Aquí va rellenando nuestro objeto creado arriba
                show: true,
                instanceId: nodes[prop].instanceID
              };
            };
          };
        };

        //Para ocultar las anotaciones desde el comienzo ya que el botón de Exploración comienza apagado
        for (let i = 0; i < 4; i++) { // R: Según el nº de anotaciones modificar el último número
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
function showAndHide(nodeName, buttonId) {
  const btn = document.getElementById(buttonId);
  filteredNodes[nodeName].show = !filteredNodes[nodeName].show;
  //console.log(filteredNodes); //R: esto sólo se descomenta, y se comenta lo de arriba para que en consola del navegador pueda ver como se llaman las partes del modelo y poder buscarlas.
  if (filteredNodes[nodeName].show) {
    btn.classList.replace("hideButton", "showButton");
    apiRef.show(filteredNodes[nodeName].instanceId)
  } else {
    btn.classList.replace("showButton", "hideButton");
    apiRef.hide(filteredNodes[nodeName].instanceId)
  };
};

//Para mostrar/ocultar las anotaciones Sketchfab cuando se muestra/apaga pestaña "Exploración"
let showToolTip = false;
function toogleToolTips() {
  if (showToolTip) {
    for (let i = 0; i < 4; i++) { // R: Según el nº de anotaciones modificar el último número
      apiRef.hideAnnotation(i, function (err, index) {
      });
    }
  } else {
    for (let i = 0; i < 4; i++) { // R: Según el nº de anotaciones modificar el último número
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