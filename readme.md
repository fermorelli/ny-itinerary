# NYC · septiembre 2026

Web estática en español para consultar el itinerario familiar y su mapa. Vite + vanilla JS + Leaflet/OpenStreetMap. Sin backend ni claves de API.

## Desarrollo

Requiere Node.js 22.12+.

```sh
npm install
npm run dev
```

## Actualizar el itinerario

1. Reemplazar `source/itinerario_nyc_2026_master_mapa_routing_auditado.xlsx` conservando los nombres de hojas y columnas.
2. Guardar el Excel con las fórmulas recalculadas: SheetJS lee resultados guardados, no calcula fórmulas.
3. Ejecutar:

```sh
npm run import-data
npm test
npm run build
```

También se puede importar otra ubicación: `npm run import-data -- "ruta/al/master.xlsx"`. Para que el próximo deploy use esa versión, copiarla además al archivo de `source/`.

El importador genera `public/data/{days,points,segments,logistics,metadata}.json` y `DATA_AUDIT.md`. Los JSON conservan las filas de origen. Los errores de estructura, IDs, coordenadas, horarios o totales detienen la importación. El navegador descarga solo JSON; el XLSX y SheetJS quedan fuera de `dist/`.

## Publicar en GitHub Pages

Ejecutar desde la carpeta del proyecto, con Git autenticado para este repositorio:

```sh
npm run deploy
```

El comando importa el Excel, ejecuta las pruebas, compila y sube únicamente `dist/` a la rama `gh-pages`. Conserva el código fuente en `main` y el historial de publicaciones en `gh-pages`.

Una sola vez, abrir **Settings → Pages** y elegir **Source: Deploy from a branch**, **Branch: gh-pages**, carpeta **/(root)**, y **Save**.

No hay un workflow propio ni build remoto de Vite. `.nojekyll` evita que GitHub procese la web con Jekyll. GitHub puede mostrar su tarea interna de publicación en Actions; no hay que ejecutarla manualmente. Cada actualización se publica volviendo a ejecutar `npm run deploy`. Un push a `main` por sí solo no publica.

Para este repositorio, la URL será `https://fermorelli.github.io/ny-itinerary/`. Vite usa `base: './'`: JS, CSS y JSON funcionan tanto en la raíz como bajo el nombre del repositorio. No se necesitan secrets ni tokens adicionales.

Para revisar el build local: `npm run preview`. También podés publicar únicamente el contenido de `dist/` con otro servidor estático.

## Código y decisiones

- `scripts/import-xlsx.mjs`: lee las 11 hojas; exporta los valores guardados y valida referencias/totales, sin cambiar el plan.
- `src/data.js`: carga JSON y relaciona conexiones existentes con los bloques; no crea horarios ni rutas.
- `src/itinerary.js`: agenda cronológica completa, descansos, buffers, opcionales y detalles plegables.
- `src/transit-guides.js`: indicaciones editoriales de transporte, líneas, sentidos y conexiones con referencias oficiales. Complementan el Excel y sobreviven a `import-data`; describen servicio habitual, no salidas confirmadas ni incidencias en vivo. Revisar sus IDs y contenido cuando cambie el master.
- `src/transit.js`: instrucciones visibles y un solo desplegable con conexiones y enlaces. Los dos regresos del lunes aparecen como alternativas dentro del mismo bloque. Se conservan los horarios y totales importados; las caminatas se distinguen del tiempo reservado para el traslado.
- `src/map.js`: pins por día, número compartido con la agenda, caminar con línea continua y transporte/mixto con línea discontinua. Opcionales punteados. Cada línea une únicamente su From_ID y To_ID.
- `src/main.js`, `src/styles.css`: selector de días, resumen y layout móvil/escritorio.

Los km/minutos base vienen de `00_Resumen` y `03_Map_Segments` P/Q. El total con caminata incidental se distingue del recorrido base. Descansos y buffers ya están incluidos en los bloques. Las alternativas no se suman al total base. Se muestra la agenda completa del miércoles, incluida la salida que termina el jueves a la 01:00.

El mapa es esquemático. Los waypoints son texto; los paseos que vuelven al mismo pin no tienen geometría inventada. Para navegar, se abren las URLs originales de Google Maps. Los puntos sin conexión pueden aparecer como referencia, sin recorrido inventado. En pantallas táctiles, el mapa permite zoom con dos dedos y deja libre el scroll de un dedo.

Limitaciones y diferencias internas del master: ver [DATA_AUDIT.md](DATA_AUDIT.md). Las teselas OSM, las fuentes y Google Maps requieren conexión; no se implementó modo offline. No hay geolocalización, tracking ni llamadas a APIs de routing.

## Comprobaciones

`npm test` comprueba referencias y conciliación con el master, los tramos base y alternativos, ferry/Tram, buffers sin pin, el bonus sin hora y la medianoche. `npm run build` vuelve a verificar los datos antes de compilar.

## Clima y baños

El clima se consulta al abrir su apartado mediante Open-Meteo (uso personal no comercial, sin API key), con hasta 16 días y horarios de America/New_York. La respuesta se comparte en memoria durante 30 minutos; actualizar permite una nueva consulta. Las fechas ausentes y los errores se muestran explícitamente. Las alertas se consultan mediante enlace oficial al NWS, no se predicen para la fecha seleccionada. Datos meteorológicos: https://open-meteo.com/ (CC BY 4.0); condiciones: https://open-meteo.com/en/terms.

Los baños complementarios se mantienen en src/restrooms.js, separados del Excel. Incluyen referencias personales aportadas por Fer y fuentes oficiales enlazadas en cada ficha. Se muestran a hasta 1000 m en línea recta de puntos del día; no se calcula distancia peatonal ni se garantiza apertura. Los pines indican edificios/lugares, no puertas exactas, y pueden ocultarse con la capa WC. Trump Tower y Harry Potter Store usan coordenadas aproximadas de sus edificios; los demás reutilizan referencias del master. No se modifican los horarios ni los totales del itinerario.

