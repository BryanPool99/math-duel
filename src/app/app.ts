import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Armazon de la aplicacion: fondo global + punto de montaje de las rutas.
 * El tema (claro/oscuro) se aplica via tokens en body, no aqui.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="app-shell">
      <router-outlet />
    </div>
  `,
  styles: [
    `
      .app-shell {
        min-height: 100vh;
        background:
          radial-gradient(
            1000px 520px at 12% -14%,
            color-mix(in srgb, var(--md-accent) 11%, transparent),
            transparent 62%
          ),
          radial-gradient(
            880px 520px at 108% 114%,
            color-mix(in srgb, var(--md-blue) 13%, transparent),
            transparent 62%
          ),
          var(--md-bg);
        transition: background 0.35s ease;
      }
    `,
  ],
})
export class App {}
