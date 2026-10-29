# M3a — Mercado ganador y motor base (2026-10-27)

Cerrado funcionalmente.

## Realizado

- Mercado `MATCH_WINNER` con `RADIANT`/`DIRE`, margen del 6%, límites `[0.08, 0.92]` y cuotas a 3 decimales.
- Migración V3: `markets`, `selections`, `odds_history` append-only.
- Sincronización transaccional desde el catálogo, historial por versión, suspensión por feed y cierre al salir de vivo.
- SSE de mercados publicado después del commit.
- Adaptador para desconexiones SSE sin generar errores de respuesta.
