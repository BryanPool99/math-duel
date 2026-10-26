import { Component, Input } from '@angular/core';
import { IconComponent } from './icon';

/** Muestra el tiempo restante de la ronda (lo controla el GameComponent). */
@Component({
  selector: 'app-timer',
  imports: [IconComponent],
  template: `
    <div
      class="timer-display"
      [class.low]="timeLeft <= 10"
      role="timer"
      [attr.aria-label]="'Tiempo restante: ' + timeLeft + ' segundos'"
    >
      <app-icon name="clock" />
      <span class="timer-time">{{ timeLeft }}</span>
      <span class="timer-label">segundos</span>
    </div>
  `,
  styles: [
    `
      .timer-display {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 18px;
        border-radius: var(--md-r-pill);
        color: #fff;
        background: var(--md-blue);
        font-variant-numeric: tabular-nums;
        transition: background 0.25s ease;
      }

      .timer-display app-icon {
        font-size: 1.05rem;
      }

      .timer-display.low {
        background: var(--md-rose);
        animation: urgent 1s ease-in-out infinite;
      }

      @keyframes urgent {
        50% {
          transform: scale(1.04);
        }
      }

      .timer-time {
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1;
        min-width: 2ch;
        text-align: right;
      }

      .timer-label {
        font-size: 0.75rem;
        font-weight: 500;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      @media (prefers-reduced-motion: reduce) {
        .timer-display {
          animation: none !important;
        }
      }
    `,
  ],
})
export class TimerComponent {
  @Input() timeLeft = 60;
}
