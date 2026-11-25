# M9 — Rediseño de la UX/UI pública (2026-11-25)

**Estado:** implementado y verificado. Pendiente de visto bueno visual final y
de regenerar el kit de demo. Decisión: ADR-046.

## Realizado

- Header azul tinta de 64 px con `Inicio / En vivo / Mis apuestas`, `ES / EN`,
  `Iniciar sesión` con borde y `Registrarse` naranja. Debajo, una única
  navegación deportiva blanca de 56 px con `Destacados / Fútbol / NBA / Esports`
  y buscador.
- Portada con tres destacados fotográficos de 232 px (NBA, fútbol y esports en
  vivo), cuotas dentro de la card y datos reales. Los destacados se excluyen de
  las filas.
- Contenido con 28 px de margen, columna flexible y boleto de 300 px separado
  24 px. Filas de 78 px con equipos a 15 px y cuotas a 16 px.
- Cabecera de competición con etiquetas alineadas al mercado: `1/X/2` y total de
  goles en fútbol; ganador y total de puntos en NBA; ganador, kills y duración en
  esports.
- Buscador en cliente sobre el calendario cargado; filtro `En vivo` y rangos
  `Hoy / Mañana / Esta semana`. El rango inicial es `Hoy` solo si hay partidos
  hoy.
- Boleto `Tu boleto · 0` compacto, sin panel vacío debajo; `Ver mis apuestas`
  como enlace. En móvil, barra persistente y hoja con el mismo componente.

## Verificación

- QA visual a 390, 1024 y 1440 con datos reales; corregido el desborde
  horizontal, el solape del estado del hero y el recorte excesivo del banner.
- `tsc --noEmit`, lint y build verdes; 18/18 tests de Vitest.
- Backend `verify`: 140/140 tests verdes. E2E `money-flow`: 1/1 en verde.
- El kit de demo no se ha regenerado con esta dirección.

## Límites y pendientes

- Las fotos son las tres imágenes entregadas por el autor, recortadas a 2:1.
  Son fondos atmosféricos: no representan necesariamente el partido de la
  tarjeta. Se sustituyen manteniendo nombre y proporción.
- El esqueleto de carga (`app/loading.tsx`) ya usa la paleta clara; antes
  mostraba el tema oscuro anterior al navegar entre deportes.
- La columna derecha de la billetera queda fija y su contenido se desplaza
  dentro cuando excede el alto de la ventana.
- `/sports` y `/nba` comparten rail de competiciones, buscador y filas con la
  portada; `/bets` incorpora pestañas, filtros por deporte y panel de detalle.
- El banner de deporte (`SportHero`) muestra el próximo partido con migaja,
  foto 2:1 a la izquierda y panel azul con escudos y hora. Se prioriza el que
  coincide con la foto de portada.
- El detalle de apuesta no muestra los dos equipos: el contrato de apuestas solo
  devuelve mercado y selección.
- Sin cobertura en vivo de fútbol/NBA; el mercado cierra en el kickoff.
