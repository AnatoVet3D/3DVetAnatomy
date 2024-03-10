const model = '0b924d86cdbb464a92dc429c89c690e0'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

const filteredNodes = {}; // Objeto para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }
let apiRef; // Referencia a la api, para poder llamarla fuera del evetListener


iframe = document.getElementById('api-frame');
client = new Sketchfab( iframe);

error = function () {
  console.error('Sketchfab API Error!');
},

success = function (api) {
  apiRef = api;
  api.start();
  // Wait for viewer to be ready
  api.addEventListener('viewerready', function () {
    // Get the object nodes
    api.getNodeMap(function (err, nodes) { 
      if (!err) {
        for ( const prop in nodes ) {
          if ( nodes.hasOwnProperty( prop ) ) {
            const name = nodes[ prop ].name;
            filteredNodes[name] = { 
              show: true, 
              instanceId : nodes[prop].instanceID 
            };
          };
        };
      };
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


function showAndHide(nodeName, buttonId) {
  const btn = document.getElementById(buttonId);
  filteredNodes[nodeName].show = !filteredNodes[nodeName].show;

  if (filteredNodes[nodeName].show) {
    btn.classList.replace("hideButton","showButton");
    apiRef.show(filteredNodes[nodeName].instanceId)
  } else {
    btn.classList.replace("showButton", "hideButton");
    apiRef.hide(filteredNodes[nodeName].instanceId)
  };
};
