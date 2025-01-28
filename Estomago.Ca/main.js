var model = 'e4fba508c8e04a2d860d145abe07bee9'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

// Buttons
buttonA = document.getElementById( 'keyA' );
buttonB = document.getElementById( 'keyB' );
buttonC = document.getElementById( 'keyC' );
buttonD = document.getElementById( 'keyD' );
buttonE1 = document.getElementById( 'keyE1' );
buttonE2 = document.getElementById( 'keyE2' );
buttonF1 = document.getElementById( 'keyF1' );
buttonF2 = document.getElementById( 'keyF2' );
buttonG = document.getElementById( 'keyG' );
buttonI = document.getElementById( 'keyI' );
buttonH = document.getElementById( 'keyH' );

// Variables
var directory = "../assets/img/endoscopia/estomago.Ca/"; // directorio con las imágenes
var leftSide = "visible";  // on/off para el botón que apaga la mitad izquierda del intestino
var rightSide = "visible"; // on/off para el botón que apaga la mitad derecha del intestino
var pictures = "off";      // on/off para el botón que enciende las zonas sensibles para las imágenes de la endoscópia
var facing = "caudal";     // dirección caudal/rostral de la vista desplazandose dentro del intestino
var infoOnOff = "off";     // on/off del cuadro de instrucciones
var inout = "out";         // in/out para el botón que desplaza hacia el interior o exterior del intestino
var textlabel0 = "";       // registro con la etiqueta de la parte de intestino seleccionada
var filename0 = "";        // registro con el nombre del fichero de la imagen de endoscopia seleccionada
const listedNodes = {};    // registro con los índices de las zonas sensibles Intestino01 a Intestino20
const listedTargets = {};  // registro con los índices de las zonas sensibles Target1 a Target8
let apiRef; // Referencia a la api, para poder llamarla fuera del evetListener

// Correspondencias entre las zonas sensibles y las etiquetas o imágenes que aparecen al clicar
const leyenda = {};
leyenda['Intestino01'] = { name: 'Esófago' };
leyenda['Intestino02'] = { name: 'Cardias' };
leyenda['Intestino03'] = { name: 'Parte Cardial del Estómago' };
leyenda['Intestino04'] = { name: 'Fundus (Fondo) del Estómago' };
leyenda['Intestino05'] = { name: 'Cuerpo del Estómago' };
leyenda['Intestino06'] = { name: 'Cuerpo del Estómago y Pliegues Gástricos' };
leyenda['Intestino07'] = { name: 'Región Pilórica' };
leyenda['Intestino08'] = { name: 'Píloro' };
leyenda['Intestino09'] = { name: 'Duodeno Craneal' };
leyenda['Intestino10'] = { name: 'Flexura Craneal del Duodeno' };
leyenda['Intestino11'] = { name: 'Duodeno Descendente' };
leyenda['Intestino12'] = { name: 'Flexura Caudal del Duodeno' };
leyenda['Intestino13'] = { name: 'Duodeno Transverso' };
leyenda['Intestino14'] = { name: 'Duodeno Ascendente' };
leyenda['Intestino15'] = { name: 'Papila Menor del Duodeno' };
leyenda['Intestino16'] = { name: 'Papila Mayor del Duodeno' };
leyenda['Intestino17'] = { name: 'Curvatura Mayor' };
leyenda['Intestino18'] = { name: 'Incisura Cardial' };
leyenda['Intestino19'] = { name: 'Incisura Angular' };
leyenda['Intestino20'] = { name: 'Curvatura Menor' };
leyenda['Target1'] = { filename: 'endoscopia1.jpg' };
leyenda['Target2'] = { filename: 'endoscopia2.jpg' };
leyenda['Target3'] = { filename: 'endoscopia3.jpg' };
leyenda['Target4'] = { filename: 'endoscopia4.jpg' };
leyenda['Target5'] = { filename: 'endoscopia5.jpg' };
leyenda['Target6'] = { filename: 'endoscopia6.jpg' };
leyenda['Target7'] = { filename: 'endoscopia7.jpg' };
leyenda['Target8'] = { filename: 'endoscopia8.jpg' };

// registro con las coordenadas de los puntos del recorrido dentro del intestino
var XYZ = [];
XYZ.push([615.37, -361.48, -40.29]);
XYZ.push([596.82, -353.99, -41.65]);
XYZ.push([545.85, -335.24, -45.85]);
XYZ.push([518.10, -327.30, -49.13]);
XYZ.push([490.96, -317.75, -52.04]);
XYZ.push([465.78, -305.28, -53.35]);
XYZ.push([450.02, -296.50, -41.46]);
XYZ.push([433.16, -295.50, -39.36]);
XYZ.push([416.03, -296.15, -42.59]);
XYZ.push([399.90, -304.67, -48.30]);
XYZ.push([390.28, -318.26, -55.33]);
XYZ.push([388.18, -329.83, -57.92]);
XYZ.push([393.87, -343.29, -57.60]);
XYZ.push([406.97, -355.73, -55.66]);
XYZ.push([419.10, -366.23, -55.41]);
XYZ.push([435.93, -374.83, -57.89]);
XYZ.push([446.56, -387.54, -62.04]);
XYZ.push([443.09, -400.67, -61.51]);
XYZ.push([433.30, -415.10, -60.41]);
XYZ.push([419.12, -424.54, -60.61]);
XYZ.push([398.26, -428.37, -59.75]);
XYZ.push([377.49, -428.60, -59.71]);
XYZ.push([351.73, -428.14, -58.20]);
XYZ.push([327.27, -427.55, -57.25]);
XYZ.push([303.10, -427.00, -55.39]);
XYZ.push([283.63, -419.83, -57.36]);
XYZ.push([276.44, -400.52, -57.37]);
XYZ.push([270.89, -384.01, -56.16]);
XYZ.push([271.54, -366.60, -56.85]);
XYZ.push([281.24, -352.05, -57.58]);
XYZ.push([291.10, -339.15, -56.55]);
XYZ.push([300.61, -327.06, -54.26]);
XYZ.push([329.00, -286.46, -50.81]);
XYZ.push([340.20, -270.02, -49.55]);

var i = 1;
var N = XYZ.length;

//INICIO Sketchfab
//Asi se llama a la versión de api que esté actualmente
const iframe = document.getElementById('api-frame');
const client = new Sketchfab(iframe);

error = function () {
  console.error( 'Sketchfab API Error!' );
},

success = function( api ) {
  //apiRef = api; //Aquí ya estamos nombrando a la variable creada por nosotros
                  //para poder usarla fuera de lo de Sketchfab
  api.start();
  // Wait for viewer to be ready
  api.addEventListener( 'viewerready', function() {
    // Get the object nodes
    api.getNodeMap( function ( err, nodes ) {
      if ( !err ) {

        var mySplit, myWord;

        for ( var prop in nodes ) {
          if ( nodes.hasOwnProperty( prop ) ) {
            //alert(nodes[prop].instanceID+" : "+nodes[prop].name+" : "+nodes[prop].nodeMask+" : "+nodes[prop].type+" : "+nodes[prop].localMatrix+" ; "+nodes[prop].worldMatrix);

            // asigna los índices de los objetos Sketchfab (Intestino, Target, Flechas), para los lados derecho e izquierdo
            if (nodes[prop].instanceID > 2 && nodes[prop].type === "MatrixTransform") {
              if      ( nodes[ prop ].name === "IntestinoL" ) { var node_IntestinoL  = nodes[prop].instanceID; }
              else if ( nodes[ prop ].name === "IntestinoR" ) { var node_IntestinoR  = nodes[prop].instanceID; }
              else if ( nodes[ prop ].name === "TargetsL" )   { var node_TargetsL  = nodes[prop].instanceID; }
              else if ( nodes[ prop ].name === "TargetsR" )   { var node_TargetsR  = nodes[prop].instanceID; }
              else if ( nodes[ prop ].name === "FlechasL" )   { var node_FlechasL  = nodes[prop].instanceID; }
              else if ( nodes[ prop ].name === "FlechasR" )   { var node_FlechasR  = nodes[prop].instanceID; }
            }

            // asigna los índices de las zonas sensibles, en base a la segunda palabra resultante de separar el nombre del objeto Sketchfab según el caracter "_"
            // por ejemplo, con "189 : IntestinoL_Intestino05_0", el objeto índice 189 se refiere a la zona sensible "Intestino05" (lado iquierdo)
            if (nodes[prop].instanceID > 2 && nodes[prop].type !== "MatrixTransform") {
              mySplit = nodes[prop].name.split("_");
              if (mySplit.length >= 2) {
                word1 = mySplit[0];
                word2 = mySplit[1];
                // rellena los registros listedNodes y listedTargets, dependiendo de si la zona sensible pertenece a "Intestino" y "Flechas", o "Targets"
                if (word1 == "IntestinoL" || word1 == "IntestinoR" || word1 == "FlechasL" || word1 == "FlechasR") {
                  listedNodes[nodes[prop].instanceID] = leyenda[word2].name;
                }
                if (word1 == "TargetsL" || word1 == "TargetsR") {
                  listedTargets[nodes[prop].instanceID] = leyenda[word2].filename;
                }
              }
            }

          }
        }

        // apaga/enciende el lado izquierdo de intestino, flechas y targets
        if (node_IntestinoL && node_TargetsL && node_FlechasL) {buttonA.addEventListener( 'click', function() {switch(leftSide) {
              case "visible": leftSide = "invisible"; buttonA.style.backgroundColor = "#888888"; api.hide(node_IntestinoL); api.hide(node_TargetsL); api.hide(node_FlechasL); break;
              case "invisible": leftSide = "visible"; buttonA.style.backgroundColor = "#1caad9"; api.show(node_IntestinoL); if (pictures == "on") {api.show(node_TargetsL)}; api.show(node_FlechasL); break;
        } }); }

        // apaga/enciende el lado derecho de intestino, flechas y targets
        if (node_IntestinoR && node_TargetsR && node_FlechasR) {buttonB.addEventListener( 'click', function() {switch(rightSide) {
              case "visible": rightSide = "invisible"; buttonB.style.backgroundColor = "#888888"; api.hide(node_IntestinoR); api.hide(node_TargetsR); api.hide(node_FlechasR); break;
              case "invisible": rightSide = "visible"; buttonB.style.backgroundColor = "#1caad9"; api.show(node_IntestinoR); if (pictures == "on") {api.show(node_TargetsR)}; api.show(node_FlechasR); break;
        } }); }

        // apaga/enciende las zonas sensibles de los targes
        if (node_TargetsR && node_TargetsL) {
          api.hide(node_TargetsR); api.hide(node_TargetsL);
          buttonC.addEventListener( 'click', function() {switch(pictures) {
              case "on": pictures = "off"; buttonC.style.backgroundColor = "#888888"; api.hide(node_TargetsR); api.hide(node_TargetsL); document.getElementById("image1").style.display = "none"; break;
              case "off": pictures = "on"; buttonC.style.backgroundColor = "#1caad9"; if (leftSide == "visible") {api.show(node_TargetsR)}; if (rightSide == "visible") {api.show(node_TargetsL)}; break;
          } });
        }

        // abre el cuadro con las instrucciones
        buttonD.addEventListener( 'click', function() {
          var filename = directory + "instrucciones.png";
          if (filename != filename0) {
            document.getElementById("label1").style.display = "none";
            textlabel0 = "";
            document.getElementById("image1").src = filename;
            document.getElementById("image1").style.width = "700px";
            document.getElementById("image1").style.display = "block";
            filename0 = filename;
          }
          else {
            document.getElementById("image1").style.display = "none";
            filename0 = "";
          }
        });

        // orienta la vista hacia el lado rostral
        buttonE1.addEventListener( 'click', function() {
          document.getElementById("keyE1").style.display = "none";
          document.getElementById("keyE2").style.display = "inline";
          facing = "rostral";
          setCamera(i);
        });

        // orienta la vista hacia el lado caudal
        buttonE2.addEventListener( 'click', function() {
          document.getElementById("keyE1").style.display = "inline";
          document.getElementById("keyE2").style.display = "none";
          facing = "caudal";
          setCamera(i);
        });

        // desplaza la vista hacia el interior del intestino
        buttonF1.addEventListener( 'click', function() {
          api.getCameraLookAt(function(err, camera) {
            x1 = camera.position[0];
            y1 = camera.position[1];
            z1 = camera.position[2];
            for (var j = 0; j < N; j++) {
              x2 = XYZ[j][0];  y2 = XYZ[j][1];  z2 = XYZ[j][2];
              dx = x2-x1;  dy = y2-y1;  dz = z2-z1;
              D = Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2) + Math.pow(dz,2));
              if (j == 0) {jmin = j; Dmin = D;}
              else { if (D < Dmin) {jmin = j; Dmin = D;} }
            }
            i = jmin;
            buttonI.innerHTML = i;
            setCamera(i);
          });
          document.getElementById("keyF1").style.display = "none";
          document.getElementById("keyF2").style.display = "inline";
          inout = "in";
        });

        // desplaza la vista hacia el exterior del intestino
        buttonF2.addEventListener( 'click', function() {
          api.getCameraLookAt(function(err, camera) {
            x1 = camera.position[0];
            y1 = camera.position[1];
            z1 = camera.position[2];
            api.setCameraLookAt([x1,y1,200], [x1,y1,z1], 2);
          });
          document.getElementById("keyF1").style.display = "inline";
          document.getElementById("keyF2").style.display = "none";
          inout = "out";
        });

        // desplaza la vista dentro del intestino hacia caudal
        buttonG.addEventListener( 'click', function() {
          if (i < N-1) { i++ }
          buttonI.innerHTML = i;
          setCamera(i);
          document.getElementById("keyF1").style.display = "none";
          document.getElementById("keyF2").style.display = "inline";
          inout = "in";
        });

        // desplaza la vista dentro del intestino hacia rostral
        buttonH.addEventListener( 'click', function() {
          if (i > 1) { i-- }
          buttonI.innerHTML = i;
          setCamera(i);
          document.getElementById("keyF1").style.display = "none";
          document.getElementById("keyF2").style.display = "inline";
          inout = "in";
        });

        // desplaza la vista dentro del intestino en función del índice en el registro "i"
        function setCamera(i) {
          var kr = 0.5;
          x1 = XYZ[i][0];  y1 = XYZ[i][1];  z1 = XYZ[i][2];
          switch(facing) {
            case "caudal":
              x2 = XYZ[i+1][0];  y2 = XYZ[i+1][1];  z2 = XYZ[i+1][2];
              break;
            case "rostral":
              x2 = XYZ[i-1][0];  y2 = XYZ[i-1][1];  z2 = XYZ[i-1][2];
              break;
          }
          dx = x2 - x1;  dy = y2 - y1;  dz = z2 - z1;
          r = Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2) + Math.pow(dz,2));
          dr = kr / r;
          x0 = x1 - dx * dr;  y0 = y1 - dy * dr;  z0 = z1 - dz * dr;
          api.setCameraLookAt([x0,y0,z0], XYZ[i], 2);
        }

      }
    });

    // muestra/apaga la etiqueta/imagen correspondiente, cuando se clica sobre una parte sensible del intestino, una flecha o un target
    api.addEventListener('click', function(info) {
      if (info.instanceID == null) {
        document.getElementById("label1").style.display = "none";
        textlabel0 = "";
        document.getElementById("image1").style.display = "none";
        filename0 = "";
      }
      else {
        if (listedNodes[info.instanceID]) {
          document.getElementById("image1").style.display = "none";
          var textlabel = listedNodes[info.instanceID];
          if (textlabel == textlabel0) {
            document.getElementById("label1").style.display = "none";
            textlabel0 = "";
          }
          else {
            document.getElementById('label1').innerHTML = textlabel;
            document.getElementById("label1").style.display = "block";
            textlabel0 = textlabel;
            filename0 = "";
          }
        }
        else if (listedTargets[info.instanceID]) {
          document.getElementById("label1").style.display = "none";
          var filename = listedTargets[info.instanceID];
          if (filename == filename0) {
            document.getElementById("image1").style.display = "none";
            filename0 = "";
          }
          else {
            document.getElementById("image1").src = directory + filename;
            document.getElementById("image1").style.width = "400px";
            document.getElementById("image1").style.display = "block";
            filename0 = filename;
            textlabel0 = "";
          }
        }
      };
    },
    { pick: 'slow' });

  });
};

// Load the model
client.init( model, {
  success: success,
  error: error,
  ui_infos: 0,
  ui_controls: 0,
  ui_stop: 1,
  watermark: 1,
  supersample: 0
});

// Funciones Propias - Solo por si se usaran
//creadas para solo tener que llamarlas desde el .HTML

//Muestra/oculta un objeto al clicar un botón que cambia de color Ej: encéfalos
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

//Para mostrar/ocultar las anotaciones Sketchfab cuando se muestra/apaga una pestaña Ej: "Exploración" en abdomen.Ca
let showToolTip=false;
function toogleToolTips(){
if (showToolTip){
  for (let i = 0; i<8; i++){
    apiRef.hideAnnotation(i, function(err, index) {
      if (!err) {
          window.console.log('Hiding annotation', index + 1);
      }
  });
  }
} else {
  for (let i = 0; i<8; i++){
    apiRef.showAnnotation(i, function(err, index) {
      if (!err) {
          window.console.log('Showing annotation', index + 1);
      }
  });
}
}
showToolTip=!showToolTip
}


// Muestra nombres de arterias/venas en la "caja" Ej: en abdomen.Ca
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

// Activa-Desactiva grupos de botones Ej: en abdomen.Ca
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
// FIN funciones propias
//FIN Sketchfab