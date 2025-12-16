var model = 'e4fba508c8e04a2d860d145abe07bee9'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

// Buttons
const buttonA  = document.getElementById('keyA');
const buttonB  = document.getElementById('keyB');
const buttonC  = document.getElementById('keyC');
const buttonD  = document.getElementById('keyD');
const buttonE1 = document.getElementById('keyE1');
const buttonE2 = document.getElementById('keyE2');
const buttonF1 = document.getElementById('keyF1');
const buttonF2 = document.getElementById('keyF2');
const buttonG  = document.getElementById('keyG');
const buttonI  = document.getElementById('keyI');
const buttonH  = document.getElementById('keyH');
// //AutoPlay recorrido endoscopia
// document.getElementById("autoEndo").addEventListener("click", () => {
//   toggleAutoEndoscopy("autoEndo");
// });

// // Slider funcional
// document.getElementById("speedSlider").addEventListener("input", function () {
//   const min = parseInt(this.min);
//   const max = parseInt(this.max);
//   const val = parseInt(this.value);

//   // Inversión: si el slider está a la derecha, queremos velocidad alta (steps bajos)
//   splineSteps = max - (val - min);

//   //console.log("Nueva velocidad spline:", splineSteps);
// });

// Variables generales
var directory = "../assets/img/endoscopia/estomago.Ca/"; // directorio con las imágenes
var leftSide  = "visible";   // on/off para el botón que apaga la mitad izquierda del intestino
var rightSide = "visible";   // on/off para el botón que apaga la mitad derecha del intestino
var pictures  = "off";       // on/off para el botón que enciende las zonas sensibles para las imágenes
var facing    = "caudal";    // dirección caudal/rostral de la vista dentro del intestino
var infoOnOff = "off";       // on/off del cuadro de instrucciones
var inout     = "out";       // in/out para el botón que desplaza dentro/fuera
let lastInsideIndex = null;


var textlabel0 = "";         // última etiqueta mostrada
var filename0  = "";         // último fichero de imagen mostrado

/* AUTOPLAY */
let autoRunning = false;
let autoPlay = null;
let lastCameraPos = null;   // posición real durante el spline


/* Velocidad del autoplay */
let splineSteps = 200;      // igual que en colon
let speedSlider = null;

// Para mapear zonas sensibles a nombres o imágenes
const listedNodes   = {};    // índice -> nombre anatómico (IntestinoXX, FlechasXX)
const listedTargets = {};    // índice -> filename de imagen de endoscopia

let apiRef;                  // referencia global a la API

// Nodos principales (mitades, flechas, targets)
let node_IntestinoL = null;
let node_IntestinoR = null;
let node_TargetsL   = null;
let node_TargetsR   = null;
let node_FlechasL   = null;
let node_FlechasR   = null;

// Correspondencias entre las zonas sensibles y las etiquetas o imágenes
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
leyenda['Target1']     = { filename: 'endoscopia1.jpg' };
leyenda['Target2']     = { filename: 'endoscopia2.jpg' };
leyenda['Target3']     = { filename: 'endoscopia3.jpg' };
leyenda['Target4']     = { filename: 'endoscopia4.jpg' };
leyenda['Target5']     = { filename: 'endoscopia5.jpg' };
leyenda['Target6']     = { filename: 'endoscopia6.jpg' };
leyenda['Target7']     = { filename: 'endoscopia7.jpg' };
leyenda['Target8']     = { filename: 'endoscopia8.jpg' };

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

// Variables para recorrido endoscopia
var i = 0;
var N = XYZ.length;
const UNIT_FIX = 1;   // Constante de correccion de unidades para curva endoscopia


// ============================
//   INICIALIZACIÓN SKETCHFAB
// ============================
const iframe = document.getElementById('api-frame');
const client = new Sketchfab(iframe);

function error() {
  console.error('Sketchfab API Error!');
}

function success(api) {
  apiRef = api;
  apiRef.start();

  apiRef.addEventListener('viewerready', function () {

    // Obtener nodos
    apiRef.getNodeMap(function (err, nodes) {
      if (err) {
        console.error(err);
        return;
      }

      // Rellenar node_* y los mapas listedNodes/listedTargets
      for (var prop in nodes) {
        if (!nodes.hasOwnProperty(prop)) continue;

        const node = nodes[prop];

        // Nodos principales (mitades, targets, flechas)
        if (node.instanceID > 2 && node.type === "MatrixTransform") {
          if      (node.name === "IntestinoL") node_IntestinoL = node.instanceID;
          else if (node.name === "IntestinoR") node_IntestinoR = node.instanceID;
          else if (node.name === "TargetsL")   node_TargetsL   = node.instanceID;
          else if (node.name === "TargetsR")   node_TargetsR   = node.instanceID;
          else if (node.name === "FlechasL")   node_FlechasL   = node.instanceID;
          else if (node.name === "FlechasR")   node_FlechasR   = node.instanceID;
        }

        // Zonas sensibles (IntestinoXX, FlechasXX, TargetsXX)
        if (node.instanceID > 2 && node.type !== "MatrixTransform") {
          const mySplit = node.name.split("_");
          if (mySplit.length >= 2) {
            const word1 = mySplit[0];
            const word2 = mySplit[1];

            // Intestino/Flechas → etiqueta de texto
            if (word1 == "IntestinoL" || word1 == "IntestinoR" ||
                word1 == "FlechasL"   || word1 == "FlechasR") {
              if (leyenda[word2]) {
                listedNodes[node.instanceID] = leyenda[word2].name;
              }
            }

            // Targets → imagen de endoscopia
            if (word1 == "TargetsL" || word1 == "TargetsR") {
              if (leyenda[word2]) {
                listedTargets[node.instanceID] = leyenda[word2].filename;
              }
            }
          }
        }
      }

      // Una vez que tenemos los nodos, ligamos los botones a funciones externas
      bindUIEvents();
    });

    // Click sobre el modelo: etiquetas o imágenes
    apiRef.addEventListener('click', function (info) {
      handleClickOnScene(info);
    }, { pick: 'slow' });

    // Hover highlight (igual que en colon)
    enableHoverHighlight();
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

// ============================
//   ENLACE BOTONES → FUNCIONES
// ============================
function bindUIEvents() {
  // Lado izquierdo
  if (node_IntestinoL && node_TargetsL && node_FlechasL && buttonA) {
    buttonA.addEventListener('click', toggleLeftSide);
  }

  // Lado derecho
  if (node_IntestinoR && node_TargetsR && node_FlechasR && buttonB) {
    buttonB.addEventListener('click', toggleRightSide);
  }

  // Targets ON/OFF
  if (node_TargetsR && node_TargetsL && buttonC) {
    buttonC.addEventListener('click', togglePictures);
    // Inicialmente esconder targets
    apiRef.hide(node_TargetsR);
    apiRef.hide(node_TargetsL);
  }

  // Instrucciones
  if (buttonD) {
    buttonD.addEventListener('click', toggleInstructions);
  }

  // Facing rostral / caudal
  if (buttonE1) {
    buttonE1.addEventListener('click', setFacingRostral);
  }
  if (buttonE2) {
    buttonE2.addEventListener('click', setFacingCaudal);
  }

  // Dentro / fuera
  if (buttonF1) {
    buttonF1.addEventListener('click', goInside);
  }
  if (buttonF2) {
    buttonF2.addEventListener('click', goOutside);
  }

  // Desplazamiento dentro del intestino
  if (buttonG) {
    buttonG.addEventListener('click', moveEndoBackward);
  }
  if (buttonH) {
    buttonH.addEventListener('click', moveEndoForward);
  }
}

// ============================
//   FUNCIONES DE VISOR
// ============================

// ON/OFF mitad izquierda (IntestinoL, TargetsL, FlechasL)
function toggleLeftSide() {
  if (!apiRef || !node_IntestinoL || !node_TargetsL || !node_FlechasL) return;

  switch (leftSide) {
    case "visible":
      leftSide = "invisible";
      buttonA.style.backgroundColor = "#888888";
      apiRef.hide(node_IntestinoL);
      apiRef.hide(node_TargetsL);
      apiRef.hide(node_FlechasL);
      break;
    case "invisible":
      leftSide = "visible";
      buttonA.style.backgroundColor = "#1caad9";
      apiRef.show(node_IntestinoL);
      if (pictures == "on") { apiRef.show(node_TargetsL); }
      apiRef.show(node_FlechasL);
      break;
  }
}

// ON/OFF mitad derecha (IntestinoR, TargetsR, FlechasR)
function toggleRightSide() {
  if (!apiRef || !node_IntestinoR || !node_TargetsR || !node_FlechasR) return;

  switch (rightSide) {
    case "visible":
      rightSide = "invisible";
      buttonB.style.backgroundColor = "#888888";
      apiRef.hide(node_IntestinoR);
      apiRef.hide(node_TargetsR);
      apiRef.hide(node_FlechasR);
      break;
    case "invisible":
      rightSide = "visible";
      buttonB.style.backgroundColor = "#1caad9";
      apiRef.show(node_IntestinoR);
      if (pictures == "on") { apiRef.show(node_TargetsR); }
      apiRef.show(node_FlechasR);
      break;
  }
}

// ON/OFF de las zonas sensibles (Targets) e imágenes
function togglePictures() {
  if (!apiRef || !node_TargetsL || !node_TargetsR) return;

  switch (pictures) {
    case "on":
      pictures = "off";
      buttonC.style.backgroundColor = "#888888";
      apiRef.hide(node_TargetsR);
      apiRef.hide(node_TargetsL);
      document.getElementById("image1").style.display = "none";
      break;

    case "off":
      pictures = "on";
      buttonC.style.backgroundColor = "#1caad9";
      if (leftSide  == "visible") { apiRef.show(node_TargetsR); }
      if (rightSide == "visible") { apiRef.show(node_TargetsL); }
      break;
  }
}

// Muestra/oculta la imagen de instrucciones
function toggleInstructions() {
  const label  = document.getElementById("label1");
  const img    = document.getElementById("image1");
  const filename = directory + "instrucciones.png";

  // mismo comportamiento que el original
  if (filename !== filename0) {
    if (label) label.style.display = "none";
    textlabel0 = "";
    img.src = filename;
    img.style.width = "700px";
    img.style.display = "block";
    filename0 = filename;
  } else {
    img.style.display = "none";
    filename0 = "";
  }
}

// Facing rostral
function setFacingRostral() {
  document.getElementById("keyE1").style.display = "none";
  document.getElementById("keyE2").style.display = "inline";
  facing = "rostral";
  setCamera(i);
}

// Facing caudal
function setFacingCaudal() {
  document.getElementById("keyE1").style.display = "inline";
  document.getElementById("keyE2").style.display = "none";
  facing = "caudal";
  setCamera(i);
}

// Entrar al interior: ir al punto de XYZ más cercano a la cámara
function goInside() {
  if (!apiRef) return;

  apiRef.getCameraLookAt(function (err, camera) {
    if (err) return;

    var x1 = camera.position[0];
    var y1 = camera.position[1];
    var z1 = camera.position[2];

    var jmin = 0;
    var Dmin = 0;

    for (var j = 0; j < N; j++) {
      var x2 = XYZ[j][0];
      var y2 = XYZ[j][1];
      var z2 = XYZ[j][2];

      var dx = x2 - x1;
      var dy = y2 - y1;
      var dz = z2 - z1;
      var D  = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (j === 0) {
        jmin = j;
        Dmin = D;
      } else {
        if (D < Dmin) {
          jmin = j;
          Dmin = D;
        }
      }
    }

    i = jmin;
    buttonI.innerHTML = i;
    setCamera(i);
  });

  document.getElementById("keyF1").style.display = "none";
  document.getElementById("keyF2").style.display = "inline";
  inout = "in";
}

// Salir hacia fuera: alejar la cámara en Z
function goOutside() {
  if (!apiRef) return;

  apiRef.getCameraLookAt(function (err, camera) {
    if (err) return;

    var x1 = camera.position[0];
    var y1 = camera.position[1];
    var z1 = camera.position[2];

    apiRef.setCameraLookAt([x1, y1, 200], [x1, y1, z1], 2);
  });

  document.getElementById("keyF1").style.display = "inline";
  document.getElementById("keyF2").style.display = "none";
  inout = "out";
}

// Desplaza vista dentro del intestino hacia caudal (i++)
function moveEndoBackward() {
  if (XYZ.length === 0) return; 

  if (i < N - 1) { 
      i++; 
  }

  // Actualizar contador
  const counter = document.getElementById("keyI");
  if (counter) counter.innerHTML = i;

  // Reposicionar cámara
  setCamera(i);

  // Ajustar botones
  document.getElementById("keyF1").style.display = "none";
  document.getElementById("keyF2").style.display = "inline";

  inout = "in";
}

// Desplaza vista dentro del intestino hacia rostral (i--)
function moveEndoForward() {
  if (XYZ.length === 0) return; 

  if (i > 1) { 
      i--; 
  }

  // Actualizar contador
  const counter = document.getElementById("keyI");
  if (counter) counter.innerHTML = i;

  // Reposicionar cámara
  setCamera(i);

  // Ajustar botones de estado
  document.getElementById("keyF1").style.display = "none";
  document.getElementById("keyF2").style.display = "inline";

  inout = "in";

}

// Coloca la cámara según i y facing (lógica original)
function setCamera(iIndex) {
  var kr = 0.5;
  var x1 = XYZ[iIndex][0];
  var y1 = XYZ[iIndex][1];
  var z1 = XYZ[iIndex][2];

  var x2, y2, z2;

  switch (facing) {
    case "caudal":
      x2 = XYZ[iIndex + 1][0];
      y2 = XYZ[iIndex + 1][1];
      z2 = XYZ[iIndex + 1][2];
      break;
    case "rostral":
      x2 = XYZ[iIndex - 1][0];
      y2 = XYZ[iIndex - 1][1];
      z2 = XYZ[iIndex - 1][2];
      break;
  }

  var dx = x2 - x1;
  var dy = y2 - y1;
  var dz = z2 - z1;

  var r  = Math.sqrt(dx*dx + dy*dy + dz*dz);
  var dr = kr / r;

  var x0 = x1 - dx * dr;
  var y0 = y1 - dy * dr;
  var z0 = z1 - dz * dr;

  apiRef.setCameraLookAt([x0, y0, z0], XYZ[iIndex], 2);
}

// ============================
//   CLICK EN LA ESCENA
// ============================
function handleClickOnScene(info) {
  if (info.instanceID == null) {
    document.getElementById("label1").style.display = "none";
    textlabel0 = "";
    document.getElementById("image1").style.display = "none";
    filename0 = "";
    return;
  }

  // ¿Es una zona tipo Intestino/Flecha? → etiqueta
  if (listedNodes[info.instanceID]) {
    document.getElementById("image1").style.display = "none";
    var textlabel = listedNodes[info.instanceID];

    if (textlabel === textlabel0) {
      document.getElementById("label1").style.display = "none";
      textlabel0 = "";
    } else {
      document.getElementById('label1').innerHTML = textlabel;
      document.getElementById("label1").style.display = "block";
      textlabel0 = textlabel;
      filename0 = "";
    }
  }
  // ¿Es un target? → imagen endoscopia
  else if (listedTargets[info.instanceID]) {
    document.getElementById("label1").style.display = "none";
    var filename = listedTargets[info.instanceID];

    if (filename === filename0) {
      document.getElementById("image1").style.display = "none";
      filename0 = "";
    } else {
      document.getElementById("image1").src = directory + filename;
      document.getElementById("image1").style.width = "400px";
      document.getElementById("image1").style.display = "block";
      filename0 = filename;
      textlabel0 = "";
    }
  }
}

//Catmull-Rom Spline - Para hacer que el recorrido de la endoscopia siga la curva
function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;

    return [
        0.5 * (2*p1[0] + (-p0[0] + p2[0]) * t + (2*p0[0] - 5*p1[0] + 4*p2[0] - p3[0]) * t2 + (-p0[0] + 3*p1[0] - 3*p2[0] + p3[0]) * t3),
        0.5 * (2*p1[1] + (-p0[1] + p2[1]) * t + (2*p0[1] - 5*p1[1] + 4*p2[1] - p3[1]) * t2 + (-p0[1] + 3*p1[1] - 3*p2[1] + p3[1]) * t3),
        0.5 * (2*p1[2] + (-p0[2] + p2[2]) * t + (2*p0[2] - 5*p1[2] + 4*p2[2] - p3[2]) * t2 + (-p0[2] + 3*p1[2] - 3*p2[2] + p3[2]) * t3)
    ];
}
//FIN

//   INTERPOLACIÓN SUAVE ENTRE PUNTOS XYZ
// =====================================================

function animateSpline(i, callback = null) {
    let steps = splineSteps;
    let t = 0;

    // Seguridad de bordes
    if (i < 1) i = 1;
    if (i > N - 3) i = N - 3;

    const p0 = XYZ[i - 1];
    const p1 = XYZ[i];
    const p2 = XYZ[i + 1];
    const p3 = XYZ[i + 2];

    function frame() {
        t += 1/steps;
        if (t > 1) t = 1;

        // Punto interpolado en spline
        const pos = catmullRom(p0, p1, p2, p3, t);

        // Punto ligeramente adelantado para "mirar"
        const posLook = catmullRom(p0, p1, p2, p3, Math.min(t + 0.02, 1));

        apiRef.setCameraLookAt(
            [pos[0] * UNIT_FIX, pos[1] * UNIT_FIX, pos[2] * UNIT_FIX],
            [posLook[0] * UNIT_FIX, posLook[1] * UNIT_FIX, posLook[2] * UNIT_FIX],
            0.0
        );

        if (t < 1) {
            requestAnimationFrame(frame);
        } else if (callback) {
            callback();
        }
    }

    frame();
}
// FIN INTERPOLACION

function orientToNextPoint() {
    if (!apiRef || XYZ.length < 2) return;

    // 1. POSICIÓN ACTUAL REAL (si viene del spline)
    const currentPos = lastCameraPos ?
        [ lastCameraPos[0], lastCameraPos[1], lastCameraPos[2] ]
        :
        null;

    let nextIndex = (facing === "caudal")
        ? Math.min(i + 1, N - 1)
        : Math.max(i - 1, 0);

    const nextPos = XYZ[nextIndex];

    // Si no tenemos lastCameraPos, lo pedimos a Sketchfab 1 frame después
    if (!currentPos) {
        requestAnimationFrame(() => {
            apiRef.getCameraLookAt((err, cam) => {
                if (err || !cam) return;
                apiRef.setCameraLookAt(cam.position, nextPos, 0.5);
            });
        });
        return;
    }

    // Si SÍ tenemos lastCameraPos → orientación perfecta
    apiRef.setCameraLookAt(
        currentPos,   // posición REAL exacta del spline
        nextPos,      // mira al siguiente punto
        0.5           // suave
    );
}


// --------------------------------------------------------
// MOVIMIENTO SUAVE HASTA EL PUNTO 1 (inicio del recorrido)
// --------------------------------------------------------
function smoothMoveToStart(callback) {
    apiRef.getCameraLookAt((err, cam) => {
        if (err) return callback();

        const startPos = XYZ[1];
        const lookPos  = XYZ[2];

        const steps = 60;
        let t = 0;

        const p0 = cam.position;
        const l0 = cam.target;

        function frame() {
            t += 1 / steps;
            if (t > 1) t = 1;

            const pos = [
                p0[0] + (startPos[0] - p0[0]) * t,
                p0[1] + (startPos[1] - p0[1]) * t,
                p0[2] + (startPos[2] - p0[2]) * t
            ];

            const look = [
                l0[0] + (lookPos[0] - l0[0]) * t,
                l0[1] + (lookPos[1] - l0[1]) * t,
                l0[2] + (lookPos[2] - l0[2]) * t
            ];

            apiRef.setCameraLookAt(pos, look, 0.0);

            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                callback();   // cuando termina → seguimos
            }
        }

        frame();
    });
}


//   Función autoPlay endoscopia
// =====================================================

function toggleAutoEndoscopy(buttonId) {
  if (XYZ.length === 0) return; 

  const btn  = document.getElementById(buttonId);
  const icon = btn.querySelector("span");

  // Si ya está corriendo → parar
  if (autoRunning) {
    autoRunning = false;

    // Cambiar icono a PLAY
    if (icon) icon.innerHTML = "play_circle";
    
    return;
  }

  // Vamos a arrancar autoplay
  autoRunning = true;

  // Cambiar icono a PAUSE
  if (icon) icon.innerHTML = "pause_circle";

  // Forzar estado "inside"
  document.getElementById("keyF1").style.display = "none";
  document.getElementById("keyF2").style.display = "inline";
  inout = "in";

  function autoStep() {
    if (XYZ.length === 0) return; 
    if (!autoRunning) return;

    if (facing === "caudal") {

      if (i >= N - 2) return toggleAutoEndoscopy(buttonId);

      animateSpline(i, () => {
        i++;
        keyI.innerHTML = i;
        autoStep();
      });

    } else { // facing rostral

      if (i <= 1) return toggleAutoEndoscopy(buttonId);

      animateSpline(i, () => {
        i++;
        keyI.innerHTML = i;
        autoStep();
      });

    }
  }

  // -------- PRIMERA VEZ: i = 0 → entrar SUAVEMENTE al punto 1 --------
  if (i === 0) {
    i = 1;
    const counter = document.getElementById("keyI");
    if (counter) counter.innerHTML = i;

    // Movimiento suave desde donde esté la cámara hasta el punto 1
    smoothMoveToStart(() => {
      // cuando termina la entrada suave → empezamos recorrido normal
      if (autoRunning) autoStep();
    });

    return; // importantísimo para no llamar también a autoStep() justo debajo
  }

  // Si ya habíamos estado dentro (i > 0), arrancamos directamente el spline
  autoStep();
}


//Fin función autoPlay

// =======================================================
//   ILUMINAR ÁREAS AL PASAR EL RATÓN
// =======================================================
function enableHoverHighlight() {
  if (!apiRef) {
    console.warn("Sketchfab API no lista todavía");
    return;
  }

  apiRef.addEventListener("nodeMouseEnter", function (info) {
    var y = info.material;
    if (!y || !y.channels || !y.channels.EmitColor) return;

    y.channels.EmitColor.factor = 1;
    y.channels.EmitColor.enable = true;
    y.channels.EmitColor.color = [0.1, 0.1, 0.0];
    apiRef.setMaterial(y, function () {});
  }, { pick: 'fast' });

  apiRef.addEventListener("nodeMouseLeave", function (info) {
    var y = info.material;
    if (!y || !y.channels || !y.channels.EmitColor) return;

    y.channels.EmitColor.factor = 1;
    y.channels.EmitColor.enable = false;
    y.channels.EmitColor.color = [0.5, 0.5, 0.0];
    apiRef.setMaterial(y, function () {});
  }, { pick: 'fast' });
}

// ===========================================
//   RESET DEL RECORRIDO DE ENDOSCOPIA
// ===========================================
function resetEndoscopy() {
    if (XYZ.length === 0) return;

    // Detener autoplay si estaba corriendo
    if (autoRunning) {
        toggleAutoEndoscopy("autoEndo");
    }

    // Reiniciar índice
    i = 1;

    // Actualizar botón numérico
    const counter = document.getElementById("keyI");
    if (counter) counter.innerHTML = i;

    // Asegurar orientación caudal
    facing = "caudal";
    document.getElementById("keyE1").style.display = "inline";
    document.getElementById("keyE2").style.display = "none";

    // Asegurar estado "inside" igual que cuando usamos flechas
    inout = "in";
    document.getElementById("keyF1").style.display = "none";
    document.getElementById("keyF2").style.display = "inline";

    // Colocar cámara en el punto 1
    setCamera(i);
}