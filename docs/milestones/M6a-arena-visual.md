# M6a — Arena visual y sistema de diseño (2026-11-03)

Cerrado. Alcance: capa visual del lobby y `/match/[id]`, sin cambios en cuotas,
settlement, wallet ni reglas de apuesta. Decisión: ADR-035.

## Realizado

- Tema “arena nocturna” para lobby y detalle: fondo navy profundo, superficies
  elevadas, texto claro, naranja reservado para lo vivo y la acción principal.
- Wallet, apuestas y admin conservan tema claro; el header navy es común.
- Header con chip **DEMO**, navegación “Arena” y “Mis apuestas”; se retiran
  “Todos” y “Próximos” de la UI del lobby.
- Partido destacado con torneo, equipos, escudos, marcador, tiempo, formato y
  mercado principal. Solo aparece con una partida real en vivo.
- Tabs **En vivo / Resultados** con conteos; rail solo de torneos.
- Cards rediseñadas: escudo, nombre, marcador grande, cuotas tipo price tile,
  metadata legible y estado suspendido.
- `OddsButton` con etiqueta + cuota, hover, estado “en tu boleto” y flash breve
  cuando la cuota cambia. Respeta `prefers-reduced-motion`.
- Boleto vacío discreto y boleto activo con equipos, selección, stake, pago
  potencial y CTA naranja.
- Barra móvil de apuesta y cierre del modal al explorar partidas.
- Estados de conexión (`connecting`, `connected`, `disconnected`), banner de
  última actualización, reintento y estados vacíos diferenciados.
- `/match/[id]` oscuro con scoreboard, jugadores, eventos y Roshan.
- Escudos reales: `teamId` en `LobbyTeam`, proxy cacheado
  `GET /api/catalog/teams/{id}/logo` y fallback a monograma.

## Backend

- `OpenDotaDtos.LiveMatch` y `ProMatch` mapean `team_id_radiant/dire`.
- `LobbyTeam` expone `teamId` (sin migración de base de datos).
- `TeamLogoCache` resuelve `/teams/{id}` con TTL de 12 h y TTL negativo de
  15 min; `CatalogController` redirige al `logo_url`.
- Tests nuevos: `TeamLogoCacheTest` (3) y endpoints de escudo en
  `CatalogControllerTest`.

## Verificación

- Backend: 95/95 tests verdes con Testcontainers; Flyway V1–V9.
- Frontend: `npm run lint` y `npm run build` verdes.
- QA visual local con feed OpenDota real: 6 partidas en vivo y 8 resultados;
  revisión a 1440 px y 390 px; partido destacado, escudos, tabs, selección de
  cuota, boleto activo, modal de partido y `/match/[id]`.
- Sin tests visuales automatizados ni E2E nuevos; Playwright queda para M7.

## Deuda trasladada

- M6b: streaming oficial Twitch/YouTube, copy ES/EN nuevo, “Próximos” y cierre
  de producto.
- QA visual con una partida GSI real (jugadores, timeline y Roshan con datos)
  durante el ensayo de demo.
- Validación de contraste y responsive en la laptop de presentación.
