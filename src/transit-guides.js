// Editorial directions supplement the workbook; importing it never overwrites these guides.
// Describe normal service, not a live routing result or a confirmed train departure.
const MTA = { label: 'MTA · estado del servicio', url: 'https://www.mta.info/' };
const E = { label: 'MTA · línea E y estaciones', url: 'https://www.mta.info/maps/subway-line-maps/e-line' };
const A = { label: 'MTA · línea A y estaciones', url: 'https://www.mta.info/maps/subway-line-maps/a-line' };
const C = { label: 'MTA · línea C y estaciones', url: 'https://www.mta.info/maps/subway-line-maps/c-line' };
const ONE = { label: 'MTA · línea 1 y conexiones', url: 'https://www.mta.info/maps/subway-line-maps/1-line' };
const LIFTS = { label: 'MTA · consultar ascensores', url: 'https://www.mta.info/elevator-escalator-status' };
const JFK = { label: 'MTA · conexiones con JFK', url: 'https://www.mta.info/guides/airports/jfk/jfk-airport-to-manhattan' };
const TO_JFK = { label: 'MTA · cómo llegar a JFK', url: 'https://www.mta.info/guides/airports/jfk' };
const TRAIN = { label: 'TrainTime · horarios y billetes LIRR', url: 'https://www.mta.info/traintime' };
const FERRY = { label: 'Staten Island Ferry · horarios oficiales', url: 'https://www.nyc.gov/html/dot/html/ferrybus/siferryschedule.shtml' };
const TRAM = { label: 'Roosevelt Island Tram · información oficial', url: 'https://www.rioc.ny.gov/community/transportation/tram' };
const step = (text, ...segmentIds) => ({ text, segmentIds });
const CHELSEA = 'Al salir, caminá por 8th Avenue hacia W18–W19 hasta el departamento.';
const FROM_SEVENTH = 'Salí a 7th Avenue, caminá hacia W18–W19 y después hacia 8th Avenue hasta el departamento.';

export const TRANSIT_GUIDES = {
  'block-3': {
    steps: [
      step('En JFK, seguí los carteles **AirTrain** y tomá el servicio hacia **Jamaica Station**.', 'segment-2'),
      step('En Jamaica, seguí **Long Island Rail Road (LIRR)**. Elegí un tren con destino **Penn Station**; comprobá la vía en las pantallas.', 'segment-3'),
      step(`En Penn, seguí **Subway / A C E**. Tomá el **E hacia Downtown / World Trade Center** y bajá en **14 St–8 Av**. ${CHELSEA}`, 'segment-4', 'segment-5'),
    ],
    details: [
      'AirTrain, LIRR y metro se pagan por separado. Para LIRR, comprá el billete Jamaica → Penn Station en una máquina o en TrainTime; si usás la app, activalo justo antes de subir.',
      'El LIRR también tiene trenes a Grand Central: para este itinerario elegí Penn Station. Con valijas y cochecito, seguí los carteles de ascensores en las conexiones.',
      'El horario es flexible: migraciones, esperas y conexiones pueden cambiar la llegada. El pin JFK representa el aeropuerto; seguí las indicaciones desde tu terminal.',
    ],
    sources: [JFK, TRAIN, E, LIFTS],
  },
  'block-9': {
    steps: [step('Caminá hasta **14 St–8 Av**. Tomá el **E hacia Downtown / World Trade Center** y bajá en **World Trade Center**, la última estación. Seguí los carteles hacia el **Oculus**.', 'segment-10', 'segment-11')],
    details: ['Buscá la letra E en el andén: otros trenes comparten la estación. Revisá el servicio esa mañana.'],
    sources: [E, MTA],
  },
  'block-14': {
    steps: [
      step('En **Whitehall Terminal**, embarcá en el **Staten Island Ferry hacia St. George**. Es gratuito y el cruce tarda unos 25 minutos.', 'segment-20'),
      step('En **St. George**, todos deben bajar. Seguí las indicaciones de embarque para volver a **Whitehall, Manhattan**; contá con la espera del próximo ferry.', 'segment-21'),
    ],
    details: [
      'Para ver la Estatua de la Libertad, buscá el lado derecho en la ida y el izquierdo al volver. Este ferry pasa cerca; no desembarca en Liberty Island.',
      'La ida y vuelta está incluida en este bloque. No compres billetes a vendedores: el Staten Island Ferry es gratuito.',
    ],
    sources: [FERRY],
  },
  'block-17': {
    label: 'Si vuelven desde el ferry',
    steps: [step(`Desde Whitehall, entrá en **South Ferry** y tomá el **1 hacia Uptown / Van Cortlandt Park–242 St**. Bajá en **14 St, sobre 7th Avenue**. ${FROM_SEVENTH}`, 'segment-81')],
    variants: [{
      label: 'Si hicieron Seaport',
      steps: [step(`Desde Pier 17, caminá hacia **Fulton Center, en Broadway y Fulton St**. Seguí los carteles **A / C Uptown**, tomá uno de esos trenes y bajá en **14 St–8 Av**. ${CHELSEA}`, 'segment-23')],
    }],
    details: [
      'Desde el ferry, 14 St / 7 Av permite buscar ascensores; la estación 18 St está más cerca del departamento pero tiene escaleras. Confirmá el estado de los ascensores antes de salir.',
      'Si hicieron Seaport, regresen desde Fulton Center: no hace falta volver a Whitehall. Los dos enlaces representan alternativas, no traslados consecutivos.',
    ],
    sources: [ONE, A, LIFTS],
  },
  'block-20': {
    steps: [step('Caminá hasta **14 St–8 Av**. Tomá el **C hacia Uptown / 168 St** y bajá en **59 St–Columbus Circle**. Al salir, buscá la entrada de Central Park junto al círculo.', 'segment-24', 'segment-25')],
    details: ['El E comparte la estación de origen, pero no va a Columbus Circle. Elegí el C indicado en esta guía y comprobá el servicio antes de viajar.'],
    sources: [C, MTA],
  },
  'block-24': {
    title: 'The Met → 59th St en bus',
    steps: [step('Desde el Met, caminá hasta **5 Av / E 80 St**. Tomá el **M1 local hacia Downtown** y bajá en **5 Av / W 59 St**, junto a la esquina de Central Park y cerca de The Plaza.', 'segment-32')],
    details: [
      'Para ir hacia el sur, la parada está sobre Fifth Avenue. Madison Avenue lleva en el sentido contrario.',
      'Buscá el M1 hacia Downtown por Fifth Avenue y comprobá que sea servicio local. El destino figura como SOHO CENTRE ST via 5 AV / BROADWAY. Consultá llegadas y desvíos en MTA Bus Time.',
    ],
    sources: [
      { label: 'MTA Bus Time · M1 y paradas', url: 'https://bustime-classic.mta.info/m/index?q=M1' },
      { label: 'The Met · cómo llegar en bus', url: 'https://www.metmuseum.org/es/plan-your-visit' },
    ],
  },
  'block-25': {
    title: 'Teleférico Roosevelt Island · ida y vuelta',
    steps: [
      step('Desde The Plaza, caminá hacia el este hasta la plaza del **Roosevelt Island Tram**, sobre **Second Avenue entre 59th y 60th Street**. Tomá el teleférico hacia Roosevelt Island.', 'segment-33', 'segment-34'),
      step('Bajá en la isla y hacé un paseo breve junto al río. Para volver, regresá a la misma terminal, ingresá nuevamente con **OMNY** y tomá el teleférico hacia **Manhattan**.', 'segment-35', 'segment-36'),
    ],
    details: [
      'Es el teleférico, no la estación de metro Roosevelt Island. La vuelta requiere pasar nuevamente por el acceso; no supongas que el primer pago incluye ida y vuelta.',
      'Mantené corto el paseo en la isla: el bloque incluye la caminata desde The Plaza, las colas y ambos cruces. Al volver, el siguiente bloque lleva de regreso a The Plaza.',
    ],
    sources: [TRAM, { label: 'OMNY · medios de transporte incluidos', url: 'https://omny.info/faq/general' }],
  },
  'block-32': {
    steps: [step(`Desde Times Square, caminá hacia **8th Avenue y W42 St**, al acceso de **42 St–Port Authority Bus Terminal**. Tomá el **E hacia Downtown / World Trade Center** y bajá en **14 St–8 Av**. ${CHELSEA}`, 'segment-44')],
    details: ['Para tomar el E, buscá el acceso A/C/E de 8th Avenue. Llegar por la calle evita buscar el largo pasillo desde los otros andenes de Times Square. No programar otra salida esta noche.'],
    sources: [E, MTA],
  },
  'block-33': {
    steps: [step('Caminá hasta **14 St–8 Av**. Tomá el **A hacia Downtown / Brooklyn** y bajá en **High St**. Salí hacia **Cadman Plaza West** y caminá hasta **Washington St con Water St**, el punto de fotos de DUMBO.', 'segment-45', 'segment-46')],
    note: 'High St tiene escaleras: con cochecito, no cuenten con un acceso continuo por ascensor.',
    details: [
      'Elegí un A cuyo destino esté en Queens (Far Rockaway u Ozone Park); en este tramo primero cruza a Brooklyn. No tomes el E, que termina en Manhattan.',
      'York St pertenece a la línea F y exige otro recorrido: no reemplaces High St por York St sin consultar una ruta completa. Si necesitan evitar escaleras, revisen una alternativa accesible antes de salir.',
    ],
    sources: [A, LIFTS, MTA],
  },
  'block-41': {
    description: 'Tres horas con ritmo flexible para Chinatown, Little Italy, SoHo, Washington Square y Greenwich Village. Washington Square funciona como pausa de 20–30 minutos.',
    label: 'Si están cansados al llegar a SoHo',
    steps: [step(`Pueden terminar el paseo ahí. Buscá **Canal St de las líneas A/C/E, en Canal St y Sixth Avenue**. Tomá el **E hacia Uptown / Queens** y bajá en **14 St–8 Av**. ${CHELSEA}`)],
    mapsUrl: 'https://www.google.com/maps/dir/?api=1&origin=Canal+Street+and+Sixth+Avenue+New+York&destination=8th+Avenue+and+West+18th+Street+New+York&travelmode=transit',
    details: ['Hay varias estaciones llamadas Canal St: buscá expresamente las letras A/C/E sobre Sixth Avenue. Este regreso reemplaza Washington Square y Greenwich Village; no se suma al paseo completo. El acceso tiene escaleras.'],
    sources: [E, MTA],
  },
  'block-42': {
    steps: [step(`Desde Greenwich Village, caminá hasta **W 4 St–Washington Sq**, sobre **Sixth Avenue a la altura de W3 St**. Tomá el **E hacia Uptown / Queens** y bajá en **14 St–8 Av**. ${CHELSEA}`, 'segment-59')],
    details: ['Seguí las letras A/C/E dentro de W 4 St; la estación también tiene otros andenes. Este regreso es para quienes completaron el paseo hasta Greenwich Village. Conservá el descanso antes de la salida de pareja.'],
    sources: [E, LIFTS],
  },
  'block-63': {
    description: 'Pueden cenar por Midtown o volver a Chelsea para comer. Después, valijas y descanso.',
    steps: [
      step('En **Grand Central–42 St**, seguí los carteles **S / 42 St Shuttle** y viajá hasta **Times Sq–42 St**.', 'segment-76'),
      step(`Sin salir de la estación, seguí **1 Downtown / South Ferry**. Bajá en **14 St, sobre 7th Avenue**. ${FROM_SEVENTH}`),
    ],
    details: ['Con cochecito, buscá los ascensores en Grand Central, Times Square y 14 St / 7 Av y comprobá su estado. Esta combinación evita el pasillo hasta los trenes A/C/E de Port Authority.', 'La caminata final sale de 7th Avenue, no de la estación 14 St–8 Av utilizada otros días. El bloque incluye cena y preparación de valijas, además del traslado.'],
    sources: [{ label: 'MTA · S / 42 St Shuttle', url: 'https://www.mta.info/schedules/subway/42-st-shuttle' }, ONE, LIFTS, MTA],
  },
  'block-65': {
    steps: [step('En **14 St–8 Av**, tomá el **E hacia Uptown / Queens – Jamaica Center**. Bajá en **34 St–Penn Station** y seguí los carteles **Long Island Rail Road / LIRR**.', 'segment-78')],
    details: ['La palabra Jamaica en el E no significa que deban quedarse hasta el final: este plan cambia al LIRR en Penn Station.'],
    sources: [E, TO_JFK],
  },
  'block-66': {
    steps: [step('En Penn, ubicá las pantallas del **LIRR** y buscá un tren que **pare en Jamaica**. Comprobá la vía y seguí los carteles de ascensores si llevan cochecito.')],
    details: ['Conservá este margen para encontrar el andén y organizar al grupo. No todos los trenes que salen de Penn paran en Jamaica.'],
    sources: [TRAIN, LIFTS],
  },
  'block-67': {
    steps: [step('Tomá el **LIRR desde Penn Station con parada en Jamaica** y bajá allí. Consultá la salida real y la vía en **TrainTime** o en las pantallas de la estación.', 'segment-79')],
    note: 'Las 09:00 son una referencia del plan, no una salida de tren confirmada.',
    details: ['Comprá el billete Penn Station → Jamaica antes de subir. Si lo llevás en TrainTime, activalo justo antes de embarcar. El LIRR se paga por separado del metro.'],
    sources: [TRAIN, TO_JFK],
  },
  'block-68': {
    steps: [step('En **Jamaica**, seguí los carteles **AirTrain / JFK Airport**. Tomá el AirTrain hacia el aeropuerto y bajá en la **terminal confirmada de tu vuelo**.', 'segment-80')],
    note: 'Confirmá terminal y vuelo la noche anterior; el pin JFK no señala una terminal específica.',
    details: ['El AirTrain se paga por separado. Dentro del aeropuerto, seguí la señalización de tu aerolínea para equipaje y seguridad; no uses el pin genérico JFK como acceso exacto.'],
    sources: [TO_JFK, TRAIN],
  },
};

export const TRANSPORT_NOTE_OVERRIDES = {
  'Punto de corte': 'Si están cansados al llegar a SoHo, pueden volver desde Canal St (A/C/E, en Sixth Avenue) con el E hacia Uptown / Queens hasta 14 St–8 Av. El paso a paso está en el bloque del paseo por los barrios. Este regreso reemplaza Washington Square y Greenwich Village.',
};

export const transitGuide = id => TRANSIT_GUIDES[id];
export function segmentInstruction(id) {
  for (const guide of Object.values(TRANSIT_GUIDES)) {
    const steps = [...guide.steps, ...(guide.variants ?? []).flatMap(variant => variant.steps)];
    const match = steps.find(item => item.segmentIds.includes(id));
    if (match) {
      const ids = new Set(guide.steps.flatMap(item => item.segmentIds));
      const text = ids.size === 1 && ids.has(id) ? guide.steps.map(item => item.text).join(' ') : match.text;
      return text.replaceAll('**', '');
    }
  }
  return null;
}
