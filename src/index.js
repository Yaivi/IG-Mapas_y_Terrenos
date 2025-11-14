import * as THREE from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";

let scene, renderer, camera, camcontrols;
let mapa,
  mapsx,
  mapsy,
  scale = 10;

// Latitud y longitud de los extremos del mapa de la imagen
let minlon = -10.92,
  maxlon = 5.03;
let minlat = 35.31,
  maxlat = 44.12;
// Dimensiones textura (mapa)
let txwidth, txheight;
let texturacargada = false;

let objetos = [];
//Datos fecha, estaciones, préstamos
const fechaInicio = new Date(2018, 4, 1); //Desde mayo (enero es 0)
let fechaActual;
let totalMinutos = 480, //8:00 como arranque
  fecha2show;
const datosEnergia = [];
const teclas = {
  w: false,
  a: false,
  s: false,
  d: false,
};
let centrales = [];
init();
animate();

function init() {
  //Muestra fecha actual como título
  fecha2show = document.createElement("div");
  fecha2show.style.position = "absolute";
  fecha2show.style.top = "30px";
  fecha2show.style.width = "100%";
  fecha2show.style.textAlign = "center";
  fecha2show.style.color = "#fff";
  fecha2show.style.fontWeight = "bold";
  fecha2show.style.backgroundColor = "transparent";
  fecha2show.style.zIndex = "1";
  fecha2show.style.fontFamily = "Monospace";
  fecha2show.innerHTML = "";
  document.body.appendChild(fecha2show);

  // Slider para filtrar por año
  const sliderContainer = document.createElement("div");
  sliderContainer.style.position = "absolute";
  sliderContainer.style.bottom = "30px";
  sliderContainer.style.width = "100%";
  sliderContainer.style.textAlign = "center";
  sliderContainer.style.zIndex = "1";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "1950"; // año mínimo
  slider.max = "2025"; // año máximo
  slider.value = "2018"; // valor inicial
  slider.step = "1";

  const label = document.createElement("span");
  label.style.color = "#fff";
  label.style.marginLeft = "10px";
  label.innerText = slider.value;

  sliderContainer.appendChild(slider);
  sliderContainer.appendChild(label);
  document.body.appendChild(sliderContainer);

  slider.addEventListener("input", () => {
    const year = parseInt(slider.value);
    label.innerText = year;

    centrales.forEach((c) => {
      c.mesh.visible = c.año <= year; // visible si ya estaba construida
    });
  });

  const botonBarras = document.createElement("button");
  botonBarras.innerText = "Mostrar/Ocultar Barras";
  botonBarras.style.position = "absolute";
  botonBarras.style.top = "80px";
  botonBarras.style.left = "50%";
  botonBarras.style.transform = "translateX(-50%)";
  botonBarras.style.padding = "8px 16px";
  botonBarras.style.backgroundColor = "#333";
  botonBarras.style.color = "#fff";
  botonBarras.style.border = "1px solid #777";
  botonBarras.style.borderRadius = "5px";
  botonBarras.style.cursor = "pointer";
  document.body.appendChild(botonBarras);

  let barrasVisibles = false; // estado inicial: ocultas
  botonBarras.addEventListener("click", () => {
    barrasVisibles = !barrasVisibles;
    centrales.forEach((c) => {
      if (c.columnas && c.columnas.estimated) {
        c.columnas.estimated.visible = barrasVisibles;
      }
    });
  });

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  //Posición de la cámara
  camera.position.set(0, -5, 5);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camcontrols = new TrackballControls(camera, renderer.domElement);

  camcontrols.rotateSpeed = 1.0;
  camcontrols.zoomSpeed = 1.2;
  camcontrols.panSpeed = 0.8;

  camcontrols.noZoom = false;
  camcontrols.noPan = false;

  camcontrols.staticMoving = false;
  camcontrols.dynamicDampingFactor = 0.15;
  camcontrols.keys = {
    LEFT: 37, // flecha izquierda
    UP: 38, // flecha arriba
    RIGHT: 39, // flecha derecha
    BOTTOM: 40, // flecha abajo
  };

  const velocidad = 0.2;
  const teclas = { w: false, a: false, s: false, d: false };

  window.addEventListener("keydown", (e) => {
    if (teclas.hasOwnProperty(e.key.toLowerCase())) {
      teclas[e.key.toLowerCase()] = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (teclas.hasOwnProperty(e.key.toLowerCase())) {
      teclas[e.key.toLowerCase()] = false;
    }
  });

  //CARGA TEXTURA (MAPA)
  //Crea plano, ajustando su tamaño al de la textura, manteniendo relación de aspecto
  const tx1 = new THREE.TextureLoader().load(
    "src/Mapa_espana.PNG",

    // Acciones a realizar tras la carga
    function (texture) {
      //Objeto sobre el que se mapea la textura del mapa
      //Plano para mapa manteniendo proporciones de la textura de entrada
      const txaspectRatio = texture.image.width / texture.image.height;
      mapsy = scale;
      mapsx = mapsy * txaspectRatio;
      Plano(0, 0, 0, mapsx, mapsy);

      //Dimensiones, textura
      //console.log(texture.image.width, texture.image.height);
      mapa.material.map = texture;
      mapa.material.needsUpdate = true;

      texturacargada = true;

      //
      //CARGA DE DATOS
      //Antes debe disponerse de las dimensiones de la textura, su carga debe haber finalizado
      //Lectura del archivo csv con localizaciones de las centrales energéticas
      fetch("src/csv_energy_spain.csv")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Error: " + response.statusText);
          }
          return response.text();
        })
        .then((content) => {
          procesarCSV(content);
        })
        .catch((error) => {
          console.error("Error al cargar el archivo:", error);
        });
    }
  );
}

function generarColumnasCentral(centralEntry, dataEnergia) {
  if (!centralEntry || !dataEnergia) return;

  const valor = dataEnergia.generacion.estimated || 0;
  if (valor <= 0) return;

  const altura = Math.cbrt(valor) * 0.02;
  const geo = new THREE.BoxGeometry(0.04, altura, 0.04);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  const barra = new THREE.Mesh(geo, mat);

  barra.position.set(
    centralEntry.mesh.position.x,
    centralEntry.mesh.position.y,
    altura / 2 + 0.12
  );

  barra.visible = false;
  barra.rotation.x = -Math.PI / 2;
  scene.add(barra);

  centralEntry.columnas = { estimated: barra };
}

//Procesamiento datos csv
function procesarCSV(content) {
  const sep = ","; // separador ;
  const filas = content
    .split("\n")
    .map((f) => f.replace(/\r/g, "").trim())
    .filter((f) => f.length > 0);

  const encabezados = filas[0].split(sep);
  const indices = {
    id: encabezados.indexOf("gppd_idnr"),
    nombre: encabezados.indexOf("name"),
    capacidad: encabezados.indexOf("capacity_mw"),
    lat: encabezados.indexOf("latitude"),
    lon: encabezados.indexOf("longitude"),
    combustible: encabezados.indexOf("fuel1"),
    año: encabezados.indexOf("commissioning_year"),
    estimated_generation_gwh: encabezados.indexOf("estimated_generation_gwh"),
  };
  console.log(indices);

  // Extrae los datos de interés
  for (let i = 1; i < filas.length; i++) {
    const columna = filas[i].split(sep); // separador ;
    if (columna.length > 1) {
      // No fila vacía
      datosEnergia.push({
        id: columna[indices.id],
        nombre: columna[indices.nombre],
        capacidad: parseFloat(columna[indices.capacidad]),
        lat: parseFloat(columna[indices.lat]),
        lon: parseFloat(columna[indices.lon]),
        combustible: columna[indices.combustible],
        año: parseInt(columna[indices.año]) || 1975,
        generacion: {
          estimated: parseFloat(columna[indices.estimated_generation_gwh]) || 0,
        },
      });
    }

    //longitudes crecen hacia la derecha, como la x
    let mlon = Map2Range(
      columna[indices.lon],
      minlon,
      maxlon,
      -mapsx / 2,
      mapsx / 2
    );
    //Latitudes crecen hacia arriba, como la y
    let mlat = Map2Range(
      columna[indices.lat],
      minlat,
      maxlat,
      -mapsy / 2,
      mapsy / 2
    );
    switch (columna[indices.combustible]) {
      case "Coal":
        colocarCentral(
          mlon,
          mlat,
          0x030100,
          columna[indices.año],
          datosEnergia[datosEnergia.length - 1]
        );
        break;
      case "Nuclear":
        colocarCentralNuclear(
          mlon,
          mlat,
          0x3c3d3b,
          columna[indices.año],
          datosEnergia[datosEnergia.length - 1]
        );
        break;
      case "Hydro":
        colocarCentralHidro(
          mlon,
          mlat,
          0x0e0bde,
          columna[indices.año],
          datosEnergia[datosEnergia.length - 1]
        );
        break;
      case "Gas":
        colocarCentral(
          mlon,
          mlat,
          0xede8e8,
          columna[indices.año],
          datosEnergia[datosEnergia.length - 1]
        );
        break;
      case "Solar":
        colocarCentralSolar(
          mlon,
          mlat,
          0xeb8405,
          columna[indices.año],
          datosEnergia[datosEnergia.length - 1]
        );
        break;
      case "Oil":
        colocarCentral(
          mlon,
          mlat,
          0xd2b48c,
          columna[indices.año],
          datosEnergia[datosEnergia.length - 1]
        );
        break;
      case "Biomass":
        colocarCentral(
          mlon,
          mlat,
          0x07630a,
          columna[indices.año],
          datosEnergia[datosEnergia.length - 1]
        );
        break;
      case "Waste":
        colocarCentral(
          mlon,
          mlat,
          0x551694,
          columna[indices.año],
          datosEnergia[datosEnergia.length - 1]
        );
        break;
      case "Wind":
        colocarTurbina(
          mlon,
          mlat,
          0.3,
          0.05,
          0x53b4f5,
          columna[indices.año],
          datosEnergia[datosEnergia.length - 1]
        );
        break;
    }
  }

  console.log("Archivo csv energia cargado");
}

//Dados los límites del mapa del latitud y longitud, mapea posiciones en ese rango
//valor, rango origen, rango destino
function Map2Range(val, vmin, vmax, dmin, dmax) {
  //Normaliza valor en el rango de partida, t=0 en vmin, t=1 en vmax
  let t = 1 - (vmax - val) / (vmax - vmin);
  return dmin + t * (dmax - dmin);
}

function Esfera(px, py, pz, radio, nx, ny, col) {
  let geometry = new THREE.SphereBufferGeometry(radio, nx, ny);
  let material = new THREE.MeshBasicMaterial({
    color: col,
  });
  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  objetos.push(mesh);
  scene.add(mesh);
}

function Plano(px, py, pz, sx, sy) {
  let geometry = new THREE.PlaneGeometry(sx, sy);
  let material = new THREE.MeshBasicMaterial({});
  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  mapa = mesh;
}

function crearEdificioBase(
  ancho = 0.4,
  largo = 0.6,
  alto = 0.3,
  colorBase,
  colorTecho
) {
  const edificio = new THREE.Group();
  const baseGeo = new THREE.BoxGeometry(ancho, alto, largo);
  const baseMat = new THREE.MeshBasicMaterial({ color: colorBase });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = alto / 2;
  edificio.add(base);

  const mitadAncho = ancho / 2;
  const mitadLargo = largo / 2;
  const alturaTecho = alto * 0.5;
  const vertices = new Float32Array([
    -mitadAncho,
    alto,
    -mitadLargo,
    mitadAncho,
    alto,
    -mitadLargo,
    mitadAncho,
    alto,
    mitadLargo,
    -mitadAncho,
    alto,
    mitadLargo,
    0,
    alto + alturaTecho,
    0,
  ]);
  const indices = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4];
  const techoGeo = new THREE.BufferGeometry();
  techoGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  techoGeo.setIndex(indices);
  techoGeo.computeVertexNormals();
  const techoMat = new THREE.MeshBasicMaterial({ color: colorTecho });
  const techo = new THREE.Mesh(techoGeo, techoMat);
  edificio.add(techo);

  const edgesBase = new THREE.LineSegments(
    new THREE.EdgesGeometry(baseGeo),
    new THREE.LineBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.4,
    })
  );
  base.add(edgesBase);
  const edgesTecho = new THREE.LineSegments(
    new THREE.EdgesGeometry(techoGeo),
    new THREE.LineBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.4,
    })
  );
  techo.add(edgesTecho);

  return edificio;
}

function crearCilindro(radio = 0.02, altura = 0.6, color) {
  const geom = new THREE.CylinderGeometry(radio, radio, altura, 16);
  const mat = new THREE.MeshBasicMaterial({ color: color });
  const cyl = new THREE.Mesh(geom, mat);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geom),
    new THREE.LineBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.4,
    })
  );
  cyl.add(edges);
  return cyl;
}

function colocarCentral(x, y, col, año, data) {
  const central = new THREE.Group();
  const edificio = crearEdificioBase(0.4, 0.6, 0.3, col, col);
  central.add(edificio);
  const chim1 = crearCilindro(0.05, 0.6, col);
  const chim2 = crearCilindro(0.05, 0.6, col);

  chim1.position.set(-0.1, 0.3, 0.05);
  chim2.position.set(0.1, 0.3, -0.05);

  central.add(chim1);
  central.add(chim2);

  central.position.set(x, y, 0);
  scene.add(central);
  central.scale.set(0.3, 0.3, 0.3);
  central.rotation.x = Math.PI / 2;

  centrales.push({ mesh: central, año, columnas: {} });

  if (data) {
    generarColumnasCentral(centrales[centrales.length - 1], data);
  }
}

function crearTorreNuclear(
  altura = 0.6,
  radioBase = 0.25,
  radioMedio = 0.15,
  radioSuperior = 0.22,
  color
) {
  const puntos = [];

  const segmentos = 20;
  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos;
    const y = t * altura;

    // Interpolamos radio: base → medio → arriba
    let radio;
    if (t < 0.5) {
      radio = THREE.MathUtils.lerp(radioBase, radioMedio, t * 2); // desde base hasta mitad
    } else {
      radio = THREE.MathUtils.lerp(radioMedio, radioSuperior, (t - 0.5) * 2); // mitad hasta arriba
    }

    puntos.push(new THREE.Vector2(radio, y));
  }

  // Genera la geometría girando el perfil 2D alrededor del eje Y
  const geometry = new THREE.LatheGeometry(puntos, 64);
  const material = new THREE.MeshBasicMaterial({
    color,
    flatShading: true,
  });

  const torre = new THREE.Mesh(geometry, material);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.4,
    })
  );
  torre.add(edges);
  torre.position.y = altura / 2;
  torre.castShadow = true;
  torre.receiveShadow = true;

  return torre;
}

function colocarCentralNuclear(x, y, col, año, data) {
  const central = new THREE.Group();
  const edificio = crearEdificioBase(0.4, 0.6, 0.3, col, col);
  central.add(edificio);
  const torre = crearTorreNuclear(0.6, 0.25, 0.15, 0.22, col);
  torre.position.set(-0.45, 0, -0.05);

  central.add(torre);
  central.position.set(x, y, 0);
  central.rotation.x = Math.PI / 2;
  central.scale.set(0.3, 0.3, 0.3);
  scene.add(central);
  centrales.push({ mesh: central, año, columnas: {} });

  if (data) {
    generarColumnasCentral(centrales[centrales.length - 1], data);
  }
}

function colocarCentralHidro(x, y, col, año, data) {
  const central = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: col });

  const wallLeftGeo = new THREE.BoxGeometry(0.4, 0.6, 0.3);
  const wallLeft = new THREE.Mesh(wallLeftGeo, material);
  const edgesLeft = new THREE.LineSegments(
    new THREE.EdgesGeometry(wallLeftGeo),
    new THREE.LineBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.4,
    })
  );
  wallLeft.add(edgesLeft);
  wallLeft.position.set(-0.45, 0.3, 0);
  central.add(wallLeft);

  const wallRightGeo = new THREE.BoxGeometry(0.4, 0.6, 0.3);
  const wallRight = new THREE.Mesh(wallRightGeo, material);
  const edgesRight = new THREE.LineSegments(
    new THREE.EdgesGeometry(wallRightGeo),
    new THREE.LineBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.4,
    })
  );
  wallRight.add(edgesRight);
  wallRight.position.set(0.45, 0.3, 0);
  central.add(wallRight);

  const middleGeo = new THREE.BoxGeometry(0.6, 0.3, 0.2);
  const middle = new THREE.Mesh(middleGeo, material);
  const edgesMiddle = new THREE.LineSegments(
    new THREE.EdgesGeometry(middleGeo),
    new THREE.LineBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.4,
    })
  );
  middle.add(edgesMiddle);
  middle.position.set(0, 0.15, 0);
  central.add(middle);

  central.position.set(x, y, 0);
  central.rotation.x = Math.PI / 2;
  central.rotation.y = -Math.PI / 6; // diagonal
  central.scale.set(0.3, 0.3, 0.3);

  scene.add(central);
  centrales.push({ mesh: central, año, columnas: {} });

  if (data) {
    generarColumnasCentral(centrales[centrales.length - 1], data);
  }
}
function crearPalas(colorPalas) {
  const grupoPalas = new THREE.Group();

  const palaGeom = new THREE.BoxGeometry(0.05, 0.4, 0.02);
  const palaMat = new THREE.MeshBasicMaterial({ color: colorPalas });

  for (let i = 0; i < 3; i++) {
    const pala = new THREE.Mesh(palaGeom, palaMat);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(palaGeom),
      new THREE.LineBasicMaterial({
        color: 0x222222,
        transparent: true,
        opacity: 0.4,
      })
    );
    pala.add(edges);
    pala.position.y = 0.2; // centro de rotación
    pala.rotation.z = (i * 120 * Math.PI) / 180; // separación de 120º
    grupoPalas.add(pala);
  }

  return grupoPalas;
}

function colocarTurbina(x, y, altura = 0.3, radio = 0.05, col, año, data) {
  const turbina = new THREE.Group();

  const torreGeom = new THREE.CylinderGeometry(
    radio,
    radio * 1.2,
    altura * 2,
    16
  );
  const torreMat = new THREE.MeshBasicMaterial({ color: col });
  const torre = new THREE.Mesh(torreGeom, torreMat);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(torreGeom),
    new THREE.LineBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.4,
    })
  );
  torre.add(edges);
  torre.position.y = altura;
  turbina.add(torre);

  const eje = new THREE.Group();
  eje.position.set(0, altura * 2 + radio * 0.3, 0);
  const palas = crearPalas(col);
  eje.add(palas);
  turbina.add(eje);

  turbina.userData.rotar = function () {
    eje.rotation.z += 0.05;
  };

  turbina.position.set(x, y, 0);
  turbina.rotation.x = Math.PI / 2;
  turbina.scale.set(0.3, 0.3, 0.3);
  scene.add(turbina);
  centrales.push({ mesh: turbina, año, columnas: {} });

  if (data) {
    generarColumnasCentral(centrales[centrales.length - 1], data);
  }
}

function crearPlacaSolar(color) {
  // Placa rectangular y fina
  const placaGeom = new THREE.BoxGeometry(0.4, 0.02, 0.2); // ancho, altura (delgada), profundidad
  const placaMat = new THREE.MeshBasicMaterial({ color: color });
  const placa = new THREE.Mesh(placaGeom, placaMat);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(placaGeom),
    new THREE.LineBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.4,
    })
  );
  placa.add(edges);
  return placa;
}

function colocarCentralSolar(x, y, color, año, data) {
  const central = new THREE.Group();

  const placa = crearPlacaSolar(color);
  placa.position.y = 0.25;
  central.add(placa);

  const soporte1 = crearCilindro(0.02, 0.25, color);
  const soporte2 = crearCilindro(0.02, 0.25, color);

  soporte1.position.set(-0.18, 0.125, 0);
  soporte2.position.set(0.18, 0.125, 0);

  central.add(soporte1);
  central.add(soporte2);

  central.position.set(x, y, 0);
  central.rotation.x = Math.PI / 2;
  central.scale.set(0.3, 0.3, 0.3);
  scene.add(central);
  centrales.push({ mesh: central, año, columnas: {} });

  if (data) {
    generarColumnasCentral(centrales[centrales.length - 1], data);
  }
}
//Bucle de animación
function animate() {
  if (texturacargada) {
  }
  camcontrols.update();
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}
