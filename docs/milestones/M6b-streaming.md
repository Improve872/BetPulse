# M6b — Streaming oficial y cierre de producto (2026-11-03)

Cerrado. Alcance: streaming oficial Twitch/YouTube, player en el detalle,
admin de streams, CSP `frame-src` y cierre de M6. Decisión: ADR-036.

## Realizado

- Migración `V10__match_streams.sql`: stream por partida **o** liga, con
  `provider`, `channel_or_video`, `label`, `fallback_url`, `enabled` y checks de
  alcance/proveedor.
- `StreamService`: resolución partida > liga y CRUD de solo lectura para el
  catálogo.
- `AdminStreamController` + `AdminStreamService`: alta/edición, activación y
  borrado con `ROLE_ADMIN`; auditoría `STREAM_SAVED`, `STREAM_TOGGLED` y
  `STREAM_DELETED`.
- `LobbyMatch.stream`: provider, canal/video, etiqueta y fallback; el catálogo
  resuelve el stream al mapear cada partida.
- `/admin/streams`: formulario de asignación, listado, editar, activar/desactivar
  y eliminar.
- `StreamPlayer`: click-to-load, sin autoplay; Twitch con `parent` del hostname,
  YouTube con `videoId`; fallback a `fallback_url`.
- `/match/[id]`: player debajo del scoreboard, panel de mercados, timeline,
  Roshan y jugadores.
- Lobby: CTA “Ver stream” en el partido destacado, badge en cards y enlace en el
  modal. Sin iframe en el lobby.
- CSP `frame-src` limitado a Twitch/YouTube en `next.config.ts`.

## Verificación

- Backend: 98/98 tests verdes; Flyway V1–V10.
- Frontend: lint y build verdes; `/admin/streams` generada.
- QA visual: lobby con CTA, detalle con player click-to-load y mercados, admin
  de streams e iframe de Twitch cargado (canal offline en la prueba).
- Asignación real vía API admin y reflejo en `GET /api/catalog/lobby`.

## Deuda trasladada

- M7: CSP completa (script/style/connect/img), rate limiting, MFA, E2E y ensayo
  de demo.
- M8: “Próximos” y deportes pre-partida; el tab no se muestra hasta que exista
  data.
- Elegir canales oficiales y probar el embed en la laptop de presentación.
