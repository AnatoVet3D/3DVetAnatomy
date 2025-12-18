const model = '73db1d364e054f3d9a6d9833213572a5'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

const filteredNodes = {}; // Objeto para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }
let apiRef; // Referencia a la api, para poder llamarla fuera del evetListener

// Array para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }
const nodeNames = [];

// Lista de nodos que quieres ocultar al cargar
const nodosInicialmenteOcultos = [
  "Plano_Medio",
  "Text_PlanoMedio",
];

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
        
        // Ocultar nodos especificados al inicio
        nodosInicialmenteOcultos.forEach((nombreNodo) => {
          if (filteredNodes[nombreNodo]) {
            filteredNodes[nombreNodo].show = false;
            apiRef.hide(filteredNodes[nombreNodo].instanceId);
          }
        });        

        //Para ocultar las anotaciones desde el comienzo ya que el botón de Exploración comienza apagado
        for (let i = 0; i < 4; i++) { // R: Según el nº de anotaciones modificar el último número
          apiRef.hideAnnotation(i, function (err, index) {
            if (!err) {
              //window.console.log('Hiding annotation', index + 1);
            }
          });
        }
      });
      
      //Para que se pueda aplicar el hover sobre los modelos cuando se pasa el ratón por encima
      enableHoverHighlight();

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

// =====================================================
//               FUNCIONES PROPIAS
//  creadas para solo tener que llamarlas desde el .HTML
// =====================================================


//   VENTANA DE INFO
// =====================================================
//Abre una ventana con informacion de uso del visor
function showInfo(){
    alert("Información de uso:\n\n" +
    "En la parte inferior están las opciones de reproducción y animaciones\n"
  );
}
//FIN VENTANA DE INFO

// Muestra/oculta uno o varios nodos y actualiza el estado visual del botón
function showAndHide(nodeNameOrList, buttonId) {
  const btn = document.getElementById(buttonId);
  // Acepta string o array
  const nodeNames = Array.isArray(nodeNameOrList)? nodeNameOrList : [nodeNameOrList];
  // Estado objetivo (basado en el primer nodo)
  const nextShowState = !filteredNodes[nodeNames[0]].show;

  // Mostrar / ocultar nodos
  nodeNames.forEach((nodeName) => {
    if (!filteredNodes[nodeName]) return;

    filteredNodes[nodeName].show = nextShowState;

    if (nextShowState) {
      apiRef.show(filteredNodes[nodeName].instanceId);
    } else {
      apiRef.hide(filteredNodes[nodeName].instanceId);
    }
  });

  // Detectar tipo de botón por clase base
  let showClass, hideClass;
  if (btn.classList.contains("symbols")) {
    showClass = "showSymbol";
    hideClass = "hideSymbol";
  } else if (btn.classList.contains("hideKey") || btn.classList.contains("showKey")) {
    showClass = "showKey";
    hideClass = "hideKey";
  } else {
    showClass = "showButton";
    hideClass = "hideButton";
  }
  // Aplicar estado visual
  if (nextShowState) {
    btn.classList.remove(hideClass);
    btn.classList.add(showClass);
  } else {
    btn.classList.remove(showClass);
    btn.classList.add(hideClass);
  }
}

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
    btn.classList.replace("hideKey", "showKey");
  } else {
    btn.classList.replace("showKey", "hideKey");
  };
  showToolTip = !showToolTip
};

//   ILUMINAR ÁREAS AL PASAR EL RATÓN
// =======================================================

function enableHoverHighlight() {
  if (!apiRef) {
      console.warn("Sketchfab API no lista todavía");
      return;
  }

  // --- ENTRAR con el ratón ---
  apiRef.addEventListener("nodeMouseEnter", function (info) {
    var y = info.material;
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
  apiRef.addEventListener("nodeMouseLeave", function (info) {
    var y = info.material;
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

// FIN funciones propias
//FIN Sketchfab