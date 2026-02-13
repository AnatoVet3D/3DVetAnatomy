var model = '047f7992fa7242f685d2b0f9d691da99'; // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

// Buttons

//AutoPlay recorrido endoscopia
document.getElementById("autoEndo").addEventListener("click", () => {
  toggleAutoEndoscopy("autoEndo");
});

// Slider funcional
document.getElementById("speedSlider").addEventListener("input", function () {
  const min = parseInt(this.min);
  const max = parseInt(this.max);
  const val = parseInt(this.value);

  // Inversión: si el slider está a la derecha, queremos velocidad alta (steps bajos)
  splineSteps = max - (val - min);

  //console.log("Nueva velocidad spline:", splineSteps);
});

// Enlaza botón fotos
document.getElementById("keyC").addEventListener("click", togglePhotosMode);



// Variables
var directory = "../assets/img/endoscopia/colon.Ca/"; // directorio con las imágenes

var textlabel0 = "";       // registro con la etiqueta de la parte de intestino seleccionada

var CiegoSide = "visible";  // on/off para el botón que apaga la zona de ciego y demás (NO APAGAR)
var RestoSide = "visible"; // on/off para el botón que apaga el resto de colon y dejar la zona de papilas
var facing = "caudal";     // dirección caudal/rostral de la vista desplazandose dentro del intestino
var infoOnOff = "off";     // on/off del cuadro de instrucciones
var inout = "out";         // in/out para el botón que desplaza hacia el interior o exterior del intestino

// --- Modo fotos (photo_camera) ---
let photosMode = "off";         // "on" | "off"
let filename0 = "";             // última imagen mostrada (para toggle al reclicar)
const listedPhotoNodes = {};    // instanceID -> filename (solo nodos FotoX.*)
const photoNodeIds = [];        // lista de instanceIDs para show/hide rápido

// Nombre fotos reales (tal cual están escritas)
const photoFilesByIndex = {
  0: "0-Ileon.jpg",
  1: "1-Orificios ileocolico e ileocecal.jpg",
  2: "2-Flexura derecha del colon.jpg",
  3: "3-Colon transverso.jpg",
  4: "4-Flexura izquierda del colon.jpg",
  5: "5-Colon descendente.jpg",
  6: "6-Recto.jpg"
};

// Para Modo transparencia de una malla
let xrayOn = false;
let xrayOriginalMaterial = null; // copia del material original


// Helper: construye una URL segura aunque haya espacios/tildes
function buildPhotoSrc(dir, file) {
  // OJO: encodeURIComponent para que " " y "á" no rompan la ruta
  return dir + encodeURIComponent(file);
}

let autoPlay = null;     // interval del recorrido
let autoRunning = false; // estado del botón único
let splineSteps = 200;   // valor por defecto: recorrido suave

let lastInsideIndex = null;

let highlightActive = false;
let originalVisibility = {};
let originalCamera = null;
let initialCameraSaved = false;

//Nodos
const filteredNodes = {}; // Objeto para guardar nombres de nodos, y si se debe mostrar o no. Ejemplo --> { "A" : { show: true, instanceId: 4} }
const listedTargets = {};  // registro con los índices de las zonas sensibles Target1 a Target8
let apiRef; // Referencia a la api, para poder llamarla fuera del evetListener
let listedNodes = {}; 

//Curva de recorrido endoscopia
var XYZ = [];
var i = 0;
var N = 0;

// registro con las coordenadas de los puntos del recorrido dentro del colon
// ===============
// CARGA DE CSV - 
// ===============

// Desde un archivo csv, el cual debe estar localizado en la misma carpeta del órgano. 
// En caso de no querer usar esta función de carga automática de los puntos, habrá que meterlos a mano y tendría que verse así:
// var XYZ = [];
// XYZ.push([615.37, -361.48, -40.29]);
//  (...) --> Tantas líneas como filas tenga ese csv

// var i = 0;
// var N = XYZ.length;

async function loadEndoscopyCSV() {
  try {
      const response = await fetch("Colonoscopia_final.csv");
      const text = await response.text();

      XYZ = text
          .trim()
          .split("\n")
          .map(line => {
            // Divide por coma, punto y coma o tabulador y limpia espacios
            const cols = line.split(/[,\t;]+/).map(v => v.trim());

              return [
                  parseFloat(cols[0]), // X CORRECTO
                  parseFloat(cols[1]), // Y CORRECTO
                  parseFloat(cols[2])  // Z CORRECTO
              ];
          })
          .filter(p => p.every(v => !isNaN(v)));  // elimina filas vacías

      // console.log("CSV cargado. Puntos:", XYZ.length);
      // console.log("Ejemplo primer punto:", XYZ[0]);

      // Igual que hacías antes
      XYZ.reverse();

      N = XYZ.length;
      i = 0;

      //console.log("CSV cargado. Total puntos:", N);

    } catch (err) {
        //console.error("ERROR cargando CSV:", err);
    }
}


loadEndoscopyCSV();
//INICIO Sketchfab
//Asi se llama a la versión de api que esté actualmente
const iframe = document.getElementById('api-frame');
const client = new Sketchfab(iframe);

error = function () {
  console.error( 'Sketchfab API Error!' );
},

success = function( api ) {
  apiRef = api; //Aquí ya estamos nombrando a la variable creada por nosotros
                  //para poder usarla fuera de lo de Sketchfab
  api.start();
  // Wait for viewer to be ready
  api.addEventListener( 'viewerready', function() {

    // Get the object nodes
    api.getNodeMap( function ( err, nodes ) {
      if (!err) {

        listedNodes = nodes;

        for ( var prop in nodes ) {
          if ( nodes.hasOwnProperty( prop ) ) {
                          const name = nodes[prop].name;
              filteredNodes[name] = {   //Aquí va rellenando nuestro objeto creado arriba
                show: true,
                instanceId: nodes[prop].instanceID
              };
              // Registro de nodos fotos
              // Detectar nodos tipo: Foto0.Ileon, Foto1.CAscendente, ...
              const m = name.match(/^Foto(\d+)\./i);
              if (m) {
                const idx = parseInt(m[1], 10);
                const file = photoFilesByIndex[idx];

                if (file) {
                  const instId = nodes[prop].instanceID;
                  listedPhotoNodes[instId] = file;
                  photoNodeIds.push(instId);

                  // Por defecto, ocultos (solo se ven si activas modo fotos)
                  api.hide(instId);
                }
              }

          }
        }

      }
    });

    // Estado inicial XRay al cargar
    xrayOn = false;
    updateXrayButtonUI();


    //Para ocultar las anotaciones desde el comienzo ya que el botón de Exploración comienza apagado
    for (let i = 0; i < 9; i++) { // R: Según el nº de anotaciones modificar el último número
      apiRef.hideAnnotation(i, function (err, index) {
        if (!err) {
          //window.console.log('Hiding annotation', index + 1);
        }
      });
    }

    // Guardar cámara inicial solo una vez, y con retardo para que Sketchfab la estabilice - Util para la función de highlightView
    api.addEventListener("camerastop", () => {
        if (!initialCameraSaved) {
            api.getCameraLookAt((err, cam) => {
                if (!err) {
                    originalCamera = {
                        position: [...cam.position],
                        target: [...cam.target]
                    };
                    initialCameraSaved = true;
                    //console.log("📌 Cámara inicial guardada automáticamente:", originalCamera);
                }
            });
        }
    });

    // muestra/apaga la etiqueta/imagen correspondiente, cuando se clica sobre una parte sensible del intestino, una flecha o un target
    // NECESARIO que esté en la api porque se clicka sobre ella no sobre un botón posterior
    api.addEventListener('click', function(info) {
      const name = limpiarNombre(listedNodes[info.instanceID]?.name || '') ;
      //console.log(filteredNodes);
      const id = info.instanceID;

        // Si estamos en modo fotos y el nodo clicado es uno de FotoX.* -> mostrar imagen
        if (photosMode === "on" && listedPhotoNodes[id]) {
          // ocultar label normal
          document.getElementById("label1").style.display = "none";
          textlabel0 = "";

          const file = listedPhotoNodes[id];
          const src = buildPhotoSrc(directory, file);

          const lbl = document.getElementById("label2");
          const img = document.getElementById("image2");

          // Título (si no quieres mapping extra, usamos el nombre del archivo sin extensión)
          const title = limpiarNombre(file); // quita ".jpg"
          lbl.innerHTML = title;
          lbl.style.display = "block";

          // Toggle: si clicas el mismo, se cierra
          if (filename0 === src) {
            lbl.style.display = "none";
            img.style.display = "none";
            filename0 = "";
          } else {
            img.src = src;
            img.style.display = "block";
            filename0 = src;
          }

          return;
        }


        if (info.instanceID == null) {
          document.getElementById("label1").style.display = "none";
          textlabel0 = "";

          document.getElementById("image1").style.display = "none";
          filename0 = "";
        }
        else {
          document.getElementById("label2").style.display = "none";
          document.getElementById("image2").style.display = "none";
          filename0 = "";
          document.getElementById('label1').innerHTML = name;
          document.getElementById("label1").style.display = "block";
        };
      },
      { pick: 'slow' });

    //Para que se pueda aplicar el hover sobre los modelos cuando se pasa el ratón por encima
    enableHoverHighlight();

    ListaAnimaciones();
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

// =====================================================
//               FUNCIONES PROPIAS
//  creadas para solo tener que llamarlas desde el .HTML
// =====================================================


//   VENTANA DE INFO
// =====================================================
//Abre una ventana con informacion de uso del visor
function showInfo(){
  const modal = document.getElementById("infoModal");
  if (!modal) return;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");

  // Cerrar con ESC
  document.addEventListener("keydown", infoModalEscClose);
}

function closeInfoModal() {
  const modal = document.getElementById("infoModal");
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  document.removeEventListener("keydown", infoModalEscClose);
}

function infoModalEscClose(e) {
  if (e.key === "Escape") closeInfoModal();
}
//FIN VENTANA DE INFO

//   MOSTRAR FOTOS REALES DE ENDOSCOPIA
// =====================================================
function togglePhotosMode() {
  if (!apiRef) return;

  const btn = document.getElementById("keyC");

  if (photosMode === "on") {
    photosMode = "off";
    if (btn) btn.classList.remove("toggle-active");

    // Ocultar nodos FotoX.*
    photoNodeIds.forEach(id => apiRef.hide(id));

    // Cerrar imagen si estaba abierta
    document.getElementById("label2").style.display = "none";
    document.getElementById("image2").style.display = "none";
    filename0 = "";

    applyAnnotationsVisibility();

    // // Ocultar botón de anotaciones cuando se sale del modo fotos
    // const toolBtn = document.getElementById("key1");
    // if (toolBtn) toolBtn.style.visibility  = "hidden";
    // toolBtn.style.pointerEvents = "none";


    // // si las anotaciones estaban activas, se apagan
    // if (showToolTip) {
    //   toogleToolTips(); // deja el estado coherente + cambia el color del botón
    // }

    return;
  }

  // Encender
  photosMode = "on";
  if (btn) btn.classList.add("toggle-active");
  
  applyAnnotationsVisibility();

  // // Mostrar botón de anotaciones solo en modo fotos
  // const toolBtn = document.getElementById("key1");
  // if (toolBtn) toolBtn.style.visibility  = "visible";
  // toolBtn.style.pointerEvents = "auto";

  // // Asegurar estado visual inicial (gris)
  // toolBtn.classList.remove("showKey");
  // toolBtn.classList.add("hideKey");



  // Mostrar nodos FotoX.*
  photoNodeIds.forEach(id => apiRef.show(id));
}
//FIN MODO FOTOS

//   RECORRIDO CÁMARA PARA ENDOSCOPIA
// =====================================================

  // Conversión de unidades-> mm (Slicer/Blender) a metros (Sketchfab)
  const UNIT_FIX = 1 / 1000;
  
  // Función de recorrido de cámara tipo “endoscopia”
  // Coloca la cámara un poco por detrás del punto i y mirando al propio punto i
  function setCamera(i) {
    if (XYZ.length === 0) return; 

    var kr = 0.5;   // distancia de retroceso a lo largo de la curva (en mm)

    // Seguridad en los límites
    if (i < 1) i = 1;
    if (i > N - 1) i = N - 1;

    // Punto central (donde queremos mirar)
    var x1 = XYZ[i][0];
    var y1 = XYZ[i][1];
    var z1 = XYZ[i][2];

    var x2, y2, z2;

    // Punto siguiente o anterior según facing (dirección del tubo)
    switch (facing) {
      case "caudal":
        x2 = XYZ[i + 1][0];
        y2 = XYZ[i + 1][1];
        z2 = XYZ[i + 1][2];
        break;
      case "rostral":
        x2 = XYZ[i - 1][0];
        y2 = XYZ[i - 1][1];
        z2 = XYZ[i - 1][2];
        break;
    }

    // Vector tangente a la curva
    var dx = x2 - x1;
    var dy = y2 - y1;
    var dz = z2 - z1;

    var r = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (r === 0) r = 1e-6;  // evitar división por cero

    var dr = kr / r;

    // Punto de la cámara un poco "antes" del punto i
    var x0 = x1 - dx * dr;
    var y0 = y1 - dy * dr;
    var z0 = z1 - dz * dr;

    // PASO A METROS para Sketchfab
    var camPos = [x0 * UNIT_FIX, y0 * UNIT_FIX, z0 * UNIT_FIX];
    var target = [x1 * UNIT_FIX, y1 * UNIT_FIX, z1 * UNIT_FIX];

    apiRef.setCameraLookAt(camPos, target, 2);
  }
//FIN RECORRIDO ENDOSCOPIA

// MOVER HACIA ATRÁS (retroceder índice)
function moveEndoBackward() {
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

// MOVER HACIA DELANTE (avanzar índice)
function moveEndoForward() {
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

// --------------------------------------------------------
// MOVIMIENTO SUAVE HASTA EL PUNTO 1 (inicio del recorrido)
// --------------------------------------------------------
function smoothMoveToStart(callback) {
  if (!apiRef || XYZ.length < 3) {
    if (callback) callback();
    return;
  }

  apiRef.getCameraLookAt((err, cam) => {
    if (err) {
      if (callback) callback();
      return;
    }

    // Punto 1 y 2 de la curva, convertidos a METROS
    const startPos = [
      XYZ[1][0] * UNIT_FIX,
      XYZ[1][1] * UNIT_FIX,
      XYZ[1][2] * UNIT_FIX
    ];
    const lookPos  = [
      XYZ[2][0] * UNIT_FIX,
      XYZ[2][1] * UNIT_FIX,
      XYZ[2][2] * UNIT_FIX
    ];

    const p0 = cam.position.slice();
    const l0 = cam.target.slice();

    const steps = 60;
    let t = 0;

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

      // Ponemos duración 0 porque ya interpolamos “a mano”
      apiRef.setCameraLookAt(pos, look, 0.0);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else if (callback) {
        callback();   // cuando termina → seguimos con el autoplay normal
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



//   Función ENTRAR/SALIR de órgano
// =====================================================

//Función para ubicarse dentro de un órgano donde haya puntos internos
function goInside() {
  // Caso 1: ya estaba dentro → solo recolocar cámara en el i actual
  if (inout === "in") {
    setCamera(i);
    document.getElementById("keyF1").style.display = "none";
    document.getElementById("keyF2").style.display = "inline";
    return;
  }

  // Caso 2: vengo de fuera pero YA he estado dentro antes
  if (inout === "out" && lastInsideIndex !== null) {
    i = Math.max(1, Math.min(N - 2, lastInsideIndex));

    const counter = document.getElementById("keyI");
    if (counter) counter.innerHTML = i;

    setCamera(i);

    document.getElementById("keyF1").style.display = "none";
    document.getElementById("keyF2").style.display = "inline";
    inout = "in";
    return;
  }

  // Caso 3: nunca he estado dentro aún → buscar el punto más cercano
  apiRef.getCameraLookAt(function (err, camera) {
    if (err) {
      console.error(err);
      return;
    }

    const camX = camera.position[0] / UNIT_FIX;
    const camY = camera.position[1] / UNIT_FIX;
    const camZ = camera.position[2] / UNIT_FIX;

    let jmin = 0;
    let Dmin = Infinity;

    for (let j = 0; j < N; j++) {
      const dx = XYZ[j][0] - camX;
      const dy = XYZ[j][1] - camY;
      const dz = XYZ[j][2] - camZ;

      const D = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (D < Dmin) {
        Dmin = D;
        jmin = j;
      }
    }

    i = Math.max(1, Math.min(N - 2, jmin));
    lastInsideIndex = i;  // primera vez que entramos, lo guardamos

    const counter = document.getElementById("keyI");
    if (counter) counter.innerHTML = i;

    setCamera(i);

    document.getElementById("keyF1").style.display = "none";
    document.getElementById("keyF2").style.display = "inline";
    inout = "in";
  });
}

// Función para ubicarse fuera  de un órgano donde haya puntos internos: aleja un poco la cámara manteniendo dirección
function goOutside() {

  // Guardamos el último punto interno antes de salir
  lastInsideIndex = i;
  
  apiRef.getCameraLookAt(function (err, camera) {
    if (err) {
      console.error(err);
      return;
    }

    const pos = camera.position;  // [x,y,z] en METROS
    const target = camera.target; // [x,y,z] en METROS

    // Vector cámara ← objetivo
    let dx = pos[0] - target[0];
    let dy = pos[1] - target[1];
    let dz = pos[2] - target[2];

    let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist === 0) dist = 1e-6;

    // Alejar cámara un poco (0.15 m = 15 cm)
    const EXTRA = 0.15;
    const factor = (dist + EXTRA) / dist;

    const newPos = [
      target[0] + dx * factor,
      target[1] + dy * factor,
      target[2] + dz * factor
    ];

    apiRef.setCameraLookAt(newPos, target, 0.5);

    document.getElementById("keyF1").style.display = "inline";
    document.getElementById("keyF2").style.display = "none";
    inout = "out";
  });
}

// ---------------------------------------------------------
// CAMBIAR DIRECCIÓN DE CAMARA ENDOSCOPIA
// ---------------------------------------------------------

function setFacingRostral() {
    facing = "rostral";

    // Alterna visibilidad botones
    document.getElementById("keyE1").style.display = "none";
    document.getElementById("keyE2").style.display = "inline";

    // Reposicionar cámara según punto actual
    setCamera(i);
}

function setFacingCaudal() {
    facing = "caudal";

    // Alterna visibilidad botones
    document.getElementById("keyE1").style.display = "inline";
    document.getElementById("keyE2").style.display = "none";

    // Reposicionar cámara según punto actual
    setCamera(i);
}

//   VISTA ESPECIAL PAPILAS / DESTACAR REGIÓN
// =====================================================

function highlightView() {
  if (!apiRef) return;

  const btn = document.getElementById("keyA"); // ⬅ botón que cambia de color

  // --- 1) Si YA está activo → restaurar todo ---
  if (highlightActive) {

      // Restaurar visibilidad original
      for (const name in originalVisibility) {
          const node = filteredNodes[name];
          if (!node) continue;

          const shouldShow = originalVisibility[name];
          node.show = shouldShow;

          if (shouldShow) apiRef.show(node.instanceId);
          else apiRef.hide(node.instanceId);
      }

      // Restaurar cámara original
      if (originalCamera) {
          apiRef.setCameraLookAt(
              originalCamera.position,
              originalCamera.target,
              1.0
          );
      }

      highlightActive = false;

      // 🔸 QUITAR color naranja
      btn.classList.remove("toggle-active");      
      return;
  }

  // ------------------------------------------------------
  // --- 2) Primera vez que se pulsa → ACTIVAR HIGHLIGHT ---
  // ------------------------------------------------------

  highlightActive = true;

  // 🔸 AÑADIR color naranja
  btn.classList.add("toggle-active");

  // Guardar visibilidad original (solo primera vez)
  originalVisibility = {};
  for (const name in filteredNodes) {
      originalVisibility[name] = filteredNodes[name].show;
  }

  const showList = [
      "Colon_ascendente.Fin",
      "Ileon",
      "Ciego",
      "Mesoileon"
  ];

  const hideList = [
      "Piel",
      "Saco_anal_izquierdo",
      "Saco_anal_derecho",
      "Esfinter_y_piel_del_ano",
      "Canal_anal",
      "Mesorrecto",
      "Mesocolon",
      "Recto",
      "Colon_ascendente",
      "Colon_transverso",
      "Flexura_derecha_del_colon",
      "Flexura_izquierda_del_colon",
      "Colon_descendente"
  ];

  // Aplicar visibilidad según lista
  for (const name in filteredNodes) {
      const node = filteredNodes[name];
      if (!node) continue;

      if (showList.includes(name)) {
          apiRef.show(node.instanceId);
          node.show = true;
      } else if (hideList.includes(name)) {
          apiRef.hide(node.instanceId);
          node.show = false;
      }
  }

  // =========================================================
  // USAR AUTOMÁTICAMENTE EL PUNTO DE LA CURVA (XYZ)
  // =========================================================

  // Cambia este número por el índice correcto en tu XYZ[] // si se quiere el punto concreto de la curva de endoscopia
  // const VIEW_INDEX = 51;   // ← EJEMPLO, cámbialo por el que sea en tu curva

  // const p = XYZ[VIEW_INDEX];
  // const cam = [ p[0] * UNIT_FIX, p[1] * UNIT_FIX, p[2] * UNIT_FIX ];
  // const target = cam;   // si quieres mirar hacia ese mismo punto

  // Si se quiere poner un punto exacto no presente en el array de la curva, 
      // para obtener el punto se puede usar en alguna función la siguiente función propia de Sketchfab para que lo muestre en consola:
      // apiRef.getCameraLookAt(function(err, camera) {
      //   console.log(camera.position); // [x, y, z]
      //   console.log(camera.target); // [x, y, z]
      // });

  const cam = [
    -0.04344194575044541, 
    -0.006924547850715794, 
    0.027077766549710888
  ];

  const target = [
    -0.04213967449796018, 
    -0.006176856472109502, 
    0.025644837530264065
  ];

  apiRef.setCameraLookAt(cam, target, 1.4);
};
//FIN VISTA ESPECIAL


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

//   VENTANA DE ANATOMÍA
// =====================================================
//Abre una ventana con informacion de anatomía
function openAnatomySheet() {
  const sheet = document.getElementById("anatomySheet");
  if (!sheet) return;

  sheet.classList.add("is-open");
  sheet.setAttribute("aria-hidden", "false");
  document.addEventListener("keydown", anatomySheetEscClose);
}

function closeAnatomySheet() {
  const sheet = document.getElementById("anatomySheet");
  if (!sheet) return;

  sheet.classList.remove("is-open");
  sheet.setAttribute("aria-hidden", "true");
  document.removeEventListener("keydown", anatomySheetEscClose);
}

function anatomySheetEscClose(e) {
  if (e.key === "Escape") closeAnatomySheet();
}
//FIN VENTANA DE ANATOMÍA

//Función para anclar la aparición de un botón cuando se clica otro
function onKey1Click() {
  const wasOn = showToolTip;   // estado ANTES

  toogleToolTips();            // alterna estado

  // Si antes estaba apagado, ahora está encendido -> abrir sheet
  if (!wasOn) {
    openAnatomySheet();
  }
}

//   MODO RAYOS X EN PIEL
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function setOpacity(mat, alpha01) {
  // Opción A: canal Opacity
  if (mat.channels && mat.channels.Opacity) {
    mat.channels.Opacity.enable = true;
    mat.channels.Opacity.factor = alpha01; // 0..1
    return true;
  }

  // Opción B: alpha en AlbedoPBR.color (RGBA)
  if (mat.channels && mat.channels.AlbedoPBR && Array.isArray(mat.channels.AlbedoPBR.color)) {
    const c = mat.channels.AlbedoPBR.color;
    if (c.length === 3) mat.channels.AlbedoPBR.color = [c[0], c[1], c[2], alpha01];
    else mat.channels.AlbedoPBR.color[3] = alpha01;
    return true;
  }

  return false;
}

function updateXrayButtonUI() {
  const btn = document.getElementById("keyX");
  if (!btn) return;

  const icon = btn.querySelector("span.material-symbols-outlined");
  if (!icon) return;

  if (xrayOn) {
    btn.classList.remove("xray-off");
    btn.classList.add("xray-on");
    icon.textContent = "visibility";
  } else {
    btn.classList.remove("xray-on");
    btn.classList.add("xray-off");
    icon.textContent = "visibility_off";
  }
}

// MODO REDUCCION OPACIDAD EN PIEL
function toggleXrayPiel(alpha = 0.22) {
  if (!apiRef) return;

  xrayOn = !xrayOn;

  updateXrayButtonUI();

  apiRef.getMaterialList((err, mats) => {
    if (err || !mats) return;

    // Buscar el material por nombre
    const mat = mats.find(m => m.name === "Material.014");
    if (!mat) {
      console.warn("No encuentro el material 'Material.014' en Sketchfab. Mira nombres con getMaterialList().");
      xrayOn = !xrayOn;
      updateXrayButtonUI();
      return;
    }

    // Guardar el original una sola vez
    if (!xrayOriginalMaterial) xrayOriginalMaterial = clone(mat);

    const updated = clone(mat);

    if (xrayOn) {
      const ok = setOpacity(updated, alpha);
      updateXrayButtonUI();
      if (!ok) {
        console.warn("No pude aplicar opacidad: el material no tiene Opacity ni AlbedoPBR.color usable.");
        xrayOn = !xrayOn;
        return;
      }
    } else {
      updateXrayButtonUI();
      // Restaurar exactamente como estaba
      Object.assign(updated, clone(xrayOriginalMaterial));
    }

    apiRef.setMaterial(updated);
  });
}


//Para mostrar/ocultar las anotaciones Sketchfab cuando se muestra/apaga una pestaña Ej: "Exploración" en abdomen.Ca
let showToolTip=false;
function toogleToolTips() {
  showToolTip = !showToolTip;

  const btn = document.getElementById("key1");
  if (btn) {
    if (showToolTip) btn.classList.replace("hideKey", "showKey");
    else btn.classList.replace("showKey", "hideKey");
  }

  applyAnnotationsVisibility();
};

// Para mostrar/ocultar anotaciones de numeración específica según se dé a otro botón distinto de toogleToolTips
function applyAnnotationsVisibility() {
  if (!apiRef) return;

  // si el usuario tiene el botón de anotaciones en OFF -> ocultar TODAS (0..8)
  if (!showToolTip) {
    for (let k = 0; k <= 8; k++) apiRef.hideAnnotation(k);
    return;
  }

  // showToolTip = ON:
  // base: 0..6 siempre
  for (let k = 0; k <= 6; k++) apiRef.showAnnotation(k);

  // extras: 7..8 SOLO si cámara ON
  if (photosMode === "on") {
    apiRef.showAnnotation(7);
    apiRef.showAnnotation(8);
  } else {
    apiRef.hideAnnotation(7);
    apiRef.hideAnnotation(8);
  }
};

//Para buscar nodes con siglas/palabras en común
function findNodeGroups(code) {
  return nodeNames.filter((nodeName)=> nodeName.includes(code));
}

// Para mostrar/ocultar grupos de objetos por mismo código de color (el "mtl")
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

//AUN HAY QUE AJUSTARLO  -- Oferta de ChatGPT
function showOnlyNodes(nodeNamesToShow) {

  // 1. Ocultar todo lo que no esté en la lista
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

  // 2. Avisar si intentamos mostrar algo que no existe
  nodeNamesToShow.forEach((nodeName) => {
    if (!filteredNodes[nodeName]) {
      console.warn(`Nodo no encontrado en filteredNodes: ${nodeName}`);
    }
  });
}

//Mueve la camara a un punto determinado en el espacio
function setCameraToPoints(position, target, duration = 1.0) {
  apiRef.setCameraLookAt(
    position,
    target,
    duration,
    (err) => { if (err) console.error("Error setCameraLookAt:", err); }
  );
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

// Función para aprovechar lo escrito en el nombre de cada pieza del modelo.
function limpiarNombre(str) {
  // Si hay sufijo tipo ".Fin", ".Algo", etc → nos quedamos con lo anterior
  if (str.includes(".")) {
    str = str.split(".")[0];
  }

  // Quitar extensión de archivo (.jpg, .png, etc.)
  str = str.replace(/\.[a-z0-9]+$/i, "");

  // ----------------------------------------
  // 0) NORMALIZACIÓN ESPECÍFICA (fotos, títulos)
  // ----------------------------------------

  // Quitar prefijo número + guion (ej: "2-")
  str = str.replace(/^\d+\s*-\s*/, "");

  // Convertir ordinales ANTES de eliminar dígitos
  str = str
    .replace(/1era\b/gi, "1ª")
    .replace(/2a\b/gi, "2ª")
    .replace(/3a\b/gi, "3ª")
    .replace(/1er\b/gi, "1º");

  // ----------------------------------------
  // 1) Reparación anatómica de nombres rotos
  // ----------------------------------------
  // Estos patrones corrigen palabras devueltas por Sketchfab con caracteres inválidos (�, ï¿½, etc.)
  // Cada entrada contiene:
  //   - regex: formas rotas de una palabra
  //   - replace: forma correcta con tildes
  const fixes = [
    { regex: /esf��nter|esf�nter|esfï¿½ï¿½nter|esfï¿½nter|esfinter/i, replace: "esfínter" },
    { regex: /c��lica|c�lica|cï¿½ï¿½lica|cï¿½lica|colica/i, replace: "cólica" },
    { regex: /c��lico|c�lico|cï¿½ï¿½lico|cï¿½lico|colico/i, replace: "cólico" },    
    { regex: /col��nica|col�nica|colï¿½ï¿½nica|colï¿½lnica|colonica/i, replace: "colónica" },
    { regex: /cecoc��lico|cecoc�lico|cecocï¿½ï¿½lico|cecocï¿½lico|cecocolico/i, replace: "cecocólico" },
    { regex: /v��lvula|v�lvula|vï¿½ï¿½lvula|vï¿½lvula|valvula/i, replace: "válvula" },
    { regex: /ileon|ï¿½leon|��leon|�leon/i, replace: "íleon" },
    //{ regex: /ileo|ï¿½leo|��leo|�leo/i, replace: "íleo" },
    { regex: /gastr�|g��strico|g�strico/i, replace: "gástrico" }
  ];

  // Recorremos todas las reglas y aplicamos la primera que coincida
  for (const rule of fixes) {
    if (rule.regex.test(str)) {
      str = str.replace(rule.regex, rule.replace);
    }
  }

  // ----------------------------------------
  // 2) LIMPIEZA GENERAL DEL STRING
  // ----------------------------------------
  str = str
    // Quitar "Material" o "material" en cualquier parte
    .replace(/material/gi, "")

    // Eliminar puntos y números (".001", ".002", etc.)
    .replace(/[.\d](?!ª|º)/g, "")

    // Eliminar guiones bajos al inicio o final
    .replace(/^_+|_+$/g, "")

    // Sustituir "_" solo cuando está entre letras → espacio
    .replace(/(?<=\p{L})_(?=\p{L})/gu, " ")

    // Convertir secuencias de "_" a espacios (por si queda alguna suelta)
    .replace(/_+/g, " ")

    // Convertir múltiples espacios en uno solo
    .replace(/\s+/g, " ")

    // Quitar espacios al inicio y al final
    .trim();

  // ----------------------------------------
  // 3) Capitalizar solo primera letra
  // ----------------------------------------
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =======================================================
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


// FIN funciones propias
//FIN Sketchfab