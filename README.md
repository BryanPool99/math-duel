# Math Duel

Duelo matemático al estilo arcade: compites contra la IA en operaciones básicas (`+`, `−`, `×`, `÷`) durante 60 segundos. La IA juega en paralelo con su propio reloj, hay barra de enfrentamiento, racha/combo, resultados con desglose y repaso de fallos.

## Características

- **Duelo real**: la IA genera y resuelve sus propias preguntas con tiempo de reacción por dificultad.
- **Ronda de 60 segundos**: un único cronómetro gobierna la partida y la IA.
- **Barra tug-of-war**: cuando sumas puntos le quitas espacio a la IA y viceversa.
- **Racha / combo**: cada 5 aciertos seguidos sumas un punto extra y se ve en pantalla.
- **3-2-1 previo**: cuenta atrás animada antes de arrancar la ronda.
- **Sonido y vibración**: acierto/fallo/tick final + vibración en móvil (toggle disponible).
- **Desglose de resultados**: precisión, mejor racha, tiempo medio por pregunta, bonus, rendimiento de la IA y **repaso de fallos**.
- **Atajos de teclado**: `1-4` responden, `Enter` empieza/repite, `Esc` vuelve al menú.
- **Modo claro/oscuro**, responsive y pensado con `prefers-reduced-motion`.
- **Frontend only**, zoneless con Angular signals, rutas con lazy loading.

## Controles

| Tecla / Acción | Efecto |
| --- | --- |
| `1` / `2` / `3` / `4` | Responder en la partida |
| `Enter` | Empezar o jugar de nuevo |
| `Esc` | Volver al menú |
| Clic en el interruptor | Cambiar entre modo claro/oscuro |

## Stack

- [Angular 21](https://angular.dev/) (zoneless, signals, standalone)
- TypeScript
- SCSS con tokens CSS
- [Vitest](https://vitest.dev/) + `jsdom`
- Fuente [Bricolage Grotesque Variable](https://www.fontsource.org/fonts/bricolage-grotesque)

## Desarrollo

```bash
npm install
npm start        # http://127.0.0.1:4200
npm run build    # build de producción
npm test         # tests con Vitest
```

## Estructura

```text
src/app/
├── game/        # Partida, IA, audio, lógica de ronda
├── start-menu/  # Menú con selección de dificultad y tema
├── math.ts      # Generador de preguntas y distractores
├── icon.ts      # Set SVG propio
├── theme.ts     # Modo claro/oscuro
└── app.routes.ts
```

## Créditos

Diseñado y pulido con atención al detalle: sin emojis, iconos SVG trazados a mano, elevación declarada una sola vez y sin `backdrop-filter` decorativo.
