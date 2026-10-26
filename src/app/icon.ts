import { Component, Input } from '@angular/core';

export type IconName =
  | 'zap'
  | 'gauge'
  | 'play'
  | 'clock'
  | 'refresh'
  | 'arrow-left'
  | 'check'
  | 'x'
  | 'trophy'
  | 'cpu'
  | 'equal'
  | 'moon';

/**
 * Set de iconos trazado a mano en SVG: misma caja 24x24, mismo grosor de
 * trazo (2) y los mismos remates redondos en todos. Nada de emoji.
 */
@Component({
  selector: 'app-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      [attr.fill]="filled ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (name) {
        @case ('zap') {
          <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" />
        }
        @case ('gauge') {
          <path d="M5 20v-4" [attr.opacity]="level >= 1 ? 1 : 0.25" />
          <path d="M12 20v-8" [attr.opacity]="level >= 2 ? 1 : 0.25" />
          <path d="M19 20v-12" [attr.opacity]="level >= 3 ? 1 : 0.25" />
        }
        @case ('play') {
          <path d="M7 4.5v15l12-7.5Z" />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5.2l3.4 2" />
        }
        @case ('refresh') {
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
          <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        }
        @case ('arrow-left') {
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        }
        @case ('check') {
          <path d="M20 6 9 17l-5-5" />
        }
        @case ('x') {
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        }
        @case ('trophy') {
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        }
        @case ('cpu') {
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
        }
        @case ('equal') {
          <path d="M5 9h14" />
          <path d="M5 15h14" />
        }
        @case ('moon') {
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        }
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        line-height: 0;
        flex: none;
      }
      svg {
        width: 1em;
        height: 1em;
        display: block;
      }
    `,
  ],
})
export class IconComponent {
  @Input({ required: true }) name: IconName = 'zap';
  /** Nivel 1-3 para el icono de dificultad (barras encendidas). */
  @Input() level = 3;
  /** Rellena la forma en lugar de solo trazarla (marca, play). */
  @Input() filled = false;
}
