var model = 'c85155ac62ed42cc84f86f72175ef07c', // Modelo de referencia a Sketchfab,este fichero cuando lo abres irá al modelo de ese código

// Buttons
buttonA = document.getElementById('keyA'),
buttonB = document.getElementById('keyB'),
buttonC = document.getElementById('keyC'),
buttonD = document.getElementById('keyD'),
buttonE = document.getElementById('keyE'),
buttonI = document.getElementById('keyI'),

//INICIO Sketchfab
//Asi se llama a la versión de api que esté actualmente
iframe = document.getElementById('api-frame');
client = new Sketchfab( iframe);

error = function () {
  console.error('Sketchfab API Error!');
},

success = function(api) {
  api.start();
  // Wait for viewer to be ready
  api.addEventListener('viewerready', function() {
    // Get the object nodes

    // Define variables to store cuts and slices nodes
    var cut = [];
    var slice = [];
    var front_label = [];
    var back_label = [];

    api.getNodeMap(function (err, nodes) {
      if (!err) {
        for (var prop in nodes) {
          if (nodes.hasOwnProperty(prop)) {
            var n1 = nodes[prop].name.substring(0, 1);
            var n = Number(nodes[prop].name.substring(1));
            if (!Number.isNaN(n)) {
              if (n1 === 'c') { cut[n] = nodes[prop].instanceID; }
              else if (n1 === 's') { slice[n] = nodes[prop].instanceID; }
              else if (n1 === 'f') { front_label[n] = nodes[prop].instanceID; }
              else if (n1 === 'b') { back_label[n] = nodes[prop].instanceID; }
            }
          }
        }

        // Define reference cut and hide all unnecessary cuts and slices
        var index = 11;
        update_display(index);

        const winHtml = `<!DOCTYPE html>
                          <html>
                              <head>
                                  <title>Leyenda</title>
                              </head>
                              <body>
                                Th  – Tálamo<br>
                                Ht  – Hipotálamo<br>
                                St  – Subtálamo<br>
                                Fr  – Formación reticular<br>
                                1   – Cuerpo calloso<br>
                                2   – Ventrículo lateral<br>
                                3   – Nc. Caudado<br>
                                3b  – Nc. Basales<br>
                                4   – Comisura blanca rostral<br>
                                5   – Nc. del septo<br>
                                6   – Nc. accumbens<br>
                                7   – Pallidum<br>
                                8   – Putamen<br>
                                9   – Claustro<br>
                                10  – Fimbria<br>
                                11  – Amígdala<br>
                                12  – Lóbulo piriforme<br>
                                13  – Columnas del fórnix<br>
                                14  – Adhesión intertalámica<br>
                                15  – Quiasma óptico<br>
                                16  – Cápsula interna<br>
                                17  – Cápsula externa<br>
                                18  – Cápsula extrema<br>
                                19  – Fórnix<br>
                                19b – Comisura del hipocampo<br>
                                20  – III ventrículo<br>
                                21  – Fascículo mamilotalámico<br>
                                24  – Nc. rostral del tálamo<br>
                                26  – Lámina medular externa del tálamo<br>
                                27  – Nc. reticular talámico<br>
                                28  – Tracto óptico<br>
                                30  – Álveus<br>
                                32  – Lámina medular interna<br>
                                33  – Hipocampo<br>
                                35  – Nc. mamilar (cuerpo mamilar)<br>
                                36a – Nc. habenular<br>
                                36b – Epífisis<br>
                                37a – Nc. geniculado lateral dorsal<br>
                                37b – Nc. geniculado lateral ventral<br>
                                38  – Nc. geniculado medial<br>
                                39  – Comisura blanca caudal<br>
                                40  – Nc rojo<br>
                                41  – Sustancia negra<br>
                                42  – Pie del pedúnculo cerebral<br>
                                43  – Nc. n. troclear<br>
                                44  – S. gris periacueductal<br>
                                45  – Acueducto mesencefálico<br>
                                46a – Nc. espinal del nervio trigémino<br>
                                46b – Tracto espinal del nervio trigémino<br>
                                47  – Nc. n. oculomotor<br>
                                48a – Colículo rostral<br>
                                48b – Brazo del colículo rostral<br>
                                49  - Nc. interpeduncular<br>
                                50  - Brazo del colículo caudal<br>
                                51  - Vermis del cerebelo<br>
                                53  - Colículo caudal<br>
                                53b - Comisura de los colículos caudales<br>
                                55  - Nc. puente<br>
                                56  - Pedúnculo cerebeloso medio<br>
                                57  - IV ventrículo<br>
                                58  - Fibras longitudinales del puente<br>
                                59  - Pirámides (vías corticoespinales)<br>
                                60  - Pedúnculo cerebeloso rostral<br>
                                61  - Fascículo longitudinal medial<br>
                                62  - Lemnisco lateral<br>
                                63  - Lemnisco medial<br>
                                64a - Nc. motor del trigémino<br>
                                64b - Nc. sensitivo del trigémino<br>
                                65  - Hemisferios cerebelosos<br>
                                66  - Nc. fastigio<br>
                                67  - Nc. Interpuesto o Interpositus<br>
                                68  - Nc. dentado<br>
                                69  - Cuerpo trapezoide<br>
                                70  - Nc. cuerpo trapezoide<br>
                                71  - Nc.n. abducente<br>
                                72  - Ncs. n. vestibular<br>
                                73  - Ncs. n. coclear<br>
                                74a - Nc. n. facial<br>
                                74b - Raíz n. facial<br>
                                75  - Nc. parasimpático n. vago<br>
                                76  - Nc. n. hipogloso<br>
                                77  - Nc. gracilis<br>
                                78  - Nc. cuneatus<br>
                                79a - Fascículo gracilis<br>
                                79b - Fascículo cuneatus<br>
                                80  - Pedúnculo cerebeloso caudal<br>
                                81  - Oliva bulbar<br>
                                82  - Fisura mediana ventral<br>
                                83  - Nc. cuneatus accesorio<br>
                                84  - Decusación de las pirámides<br>
                              </body>
                          </html>`;

        buttonA.addEventListener('click', function() {
          var win = window.open("", "", 'width=300, height=1000, top="", left="", menubar=0, toolbar=0');
          win.document.body.innerHTML = winHtml;
        });

        buttonB.addEventListener('click', function() {
          switch(buttonB.innerHTML) {
            case "Rostral": buttonB.innerHTML = " Rostral "; buttonB.style.backgroundColor = "#888888"; update_display(index); break;
            case " Rostral ": buttonB.innerHTML = "Rostral"; buttonB.style.backgroundColor = "#1caad9"; update_display(index); break;
          }
        });

        buttonC.addEventListener('click', function() {
          switch(buttonC.innerHTML) {
            case "Caudal": buttonC.innerHTML = " Caudal "; buttonC.style.backgroundColor = "#888888"; update_display(index); break;
            case " Caudal ": buttonC.innerHTML = "Caudal"; buttonC.style.backgroundColor = "#1caad9"; update_display(index); break;
          }
        });

        buttonD.addEventListener('click', function() {
          if (index > 1) { index = index - 1; }
          update_display(index);
        });

        buttonE.addEventListener('click', function() {
          if (index < 22) { index = index + 1; }
          update_display(index);
        });

        function update_display(i) {
          buttonI.innerHTML = i;

          for (var j = 1; j <= 22; j++) {
            if (cut[j] && i == j) { api.show(cut[j]); } else { api.hide(cut[j]); }
          }

          for (var j = 5; j <= 22; j++) {
            if (front_label[j] && back_label[j]) {
              if (buttonB.innerHTML == "Rostral" && buttonC.innerHTML == " Caudal " && i == j) {
                api.hide(front_label[j]); api.show(back_label[j]);
              } else if (buttonB.innerHTML == " Rostral " && buttonC.innerHTML == "Caudal" && i == j) {
                api.show(front_label[j]); api.hide(back_label[j]);
              } else {
                api.hide(front_label[j]); api.hide(back_label[j]);
              }
            }
          }

          for (var j = 1; j <= 23; j++) {
            if (slice[j] && ((buttonC.innerHTML == "Caudal" && i < j) || (buttonB.innerHTML == "Rostral" && i >= j))) {
              api.show(slice[j]);
            } else {
              api.hide(slice[j]);
            }
          }

          return;
        }

      }
    });

  });
};

// Load the model
client.init(model, {
  success: success,
  error: error,
  ui_infos: 0,
  ui_controls: 0,
  ui_stop: 1,
  watermark: 1,
  supersample: 0
});
