# Marcas de métodos de pago

Assets usados únicamente como indicadores del método de pago en el checkout.
BetPulse no está afiliado a estas marcas.

| Archivo | Marca | Fuente |
|---|---|---|
| `yape.svg` | Yape | Wikimedia Commons, `File:Yape peru logotype.svg` |
| `plin.png` | Plin | Sitio oficial `plin.pe` (`wp-content/themes/plin/imgs/logo.png`) |

Los logos de Visa, Mastercard y American Express se dibujan como SVG dentro de
`src/components/brand-logo.tsx` a partir de sus marcas de método; no se
descargan en tiempo de ejecución ni se modifican.

No se usan sellos de “Verified by Visa”, 3-D Secure ni certificaciones PCI: el
checkout es una simulación local y no procesa pagos reales.
