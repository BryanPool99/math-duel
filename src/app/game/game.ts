import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MathService, MathQuestion } from '../math';
import { TimerComponent } from '../timer';
import { IconComponent } from '../icon';

const ROUND_SECONDS = 60;
const ANSWER_FEEDBACK_MS = 650;

type AnswerState = 'correct' | 'wrong';
type Winner = 'user' | 'ai' | 'draw';

@Component({
  selector: 'app-game',
  imports: [TimerComponent, IconComponent],
  template: `
    <div class="game">
      <header class="game-header">
        <button class="icon-btn" type="button" (click)="goToMenu()" aria-label="Volver al menú">
          <app-icon name="arrow-left" />
        </button>

        <div class="brand">Math Duel</div>

        <div class="round-pill">
          <span>Preg. {{ questionsAnswered() }}</span>
          <span class="sep" aria-hidden="true">·</span>
          <span>{{ difficultyLabel }}</span>
        </div>
      </header>

      <section class="hud">
        <div class="timer-wrap">
          <app-timer [timeLeft]="timeLeft()" />
          <div
            class="timer-track"
            role="progressbar"
            [attr.aria-valuenow]="timeLeft()"
            [attr.aria-valuemin]="0"
            [attr.aria-valuemax]="totalSeconds"
            aria-label="Tiempo restante"
          >
            <div
              class="timer-fill"
              [style.transform]="'scaleX(' + timerScale + ')'"
              [class.low]="timeLeft() <= 10"
            ></div>
          </div>
        </div>

        <div class="scoreboard">
          <div class="score-card user">
            <span class="score-label">Tú</span>
            <span class="score-value">{{ score().user }}</span>
          </div>
          <div class="vs" aria-hidden="true">VS</div>
          <div class="score-card ai">
            <span class="score-label">IA</span>
            <span class="score-value">{{ score().ai }}</span>
          </div>
        </div>
      </section>

      <main class="question-area">
        @if (currentQuestion(); as q) {
          @for (item of [q]; track item.id) {
            <div class="question-card">
              <p class="question-text">
                {{ item.a }}
                <span class="op">{{ operationSymbol(item.operation) }}</span>
                {{ item.b }}
                <span class="op">=</span> ?
              </p>

              <div class="options-grid">
                @for (option of item.options; track option) {
                  <button
                    type="button"
                    class="option-btn"
                    [class.correct]="answerState() !== null && option === item.correctAnswer"
                    [class.wrong]="answerState() === 'wrong' && selectedAnswer() === option"
                    [disabled]="selectedAnswer() !== null || gameOver()"
                    (click)="onAnswer(option)"
                  >
                    {{ option }}
                  </button>
                }
              </div>

              @if (answerState(); as state) {
                <p class="feedback" [class.ok]="state === 'correct'" [class.bad]="state === 'wrong'">
                  <app-icon [name]="state === 'correct' ? 'check' : 'x'" />
                  {{ state === 'correct' ? 'Correcto — +1 para ti' : 'Fallaste — +1 para la IA' }}
                </p>
              }
            </div>
          }
        } @else {
          <div class="question-card loading">
            <p class="loading-text">Preparando la pregunta…</p>
          </div>
        }
      </main>

      @if (gameOver()) {
        <div class="result-overlay">
          <div class="result-card">
            <span class="result-icon" [class.win]="winner() === 'user'">
              <app-icon [name]="resultIcon()" [filled]="winner() === 'user'" />
            </span>

            <h2 class="result-title">{{ resultTitle() }}</h2>

            <div class="result-scores">
              <div class="result-score user">
                <span class="result-label">Tú</span>
                <span class="result-value">{{ score().user }}</span>
              </div>
              <div class="result-score ai">
                <span class="result-label">IA</span>
                <span class="result-value">{{ score().ai }}</span>
              </div>
            </div>

            <p class="result-message">{{ resultMessage() }}</p>

            <div class="result-actions">
              <button class="primary-btn" type="button" (click)="playAgain()">
                <app-icon name="refresh" />
                Jugar de nuevo
              </button>
              <button class="ghost-btn" type="button" (click)="goToMenu()">Volver al menú</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .game {
        min-height: 100vh;
        box-sizing: border-box;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        color: var(--md-text);
      }

      /* Los tres bloques comparten la columna de 720px centrada. */
      .game-header,
      .hud,
      .question-area {
        width: 100%;
        max-width: 720px;
      }

      /* auto arriba en la cabecera y auto abajo en la tarjeta centran la
         columna cuando sobra altura, y colapsan a 0 si no cabe. */
      .game-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: auto 0 24px;
      }

      .icon-btn {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        flex: none;
        border-radius: var(--md-r-control);
        border: 1px solid var(--md-border);
        background: var(--md-surface);
        color: var(--md-text);
        font-size: 1.15rem;
        cursor: pointer;
        transition: transform 0.15s ease, background 0.2s ease;
      }
      .icon-btn:hover {
        transform: translateX(-2px);
        background: var(--md-surface-2);
      }

      .brand {
        flex: 1;
        font-size: 1.3rem;
        font-weight: 700;
        letter-spacing: -0.03em;
        text-align: center;
      }

      .round-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex: none;
        padding: 8px 14px;
        border-radius: var(--md-r-pill);
        background: var(--md-surface-2);
        border: 1px solid var(--md-border);
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--md-muted);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .sep {
        color: color-mix(in srgb, var(--md-muted) 60%, transparent);
      }

      /* ---------- HUD ---------- */
      .hud {
        margin: 0 0 24px;
        display: grid;
        gap: 16px;
      }

      .timer-wrap {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      app-timer {
        flex: none;
      }

      .timer-track {
        flex: 1;
        min-width: 0;
        height: 8px;
        border-radius: var(--md-r-pill);
        background: color-mix(in srgb, var(--md-muted) 24%, transparent);
        overflow: hidden;
      }

      .timer-fill {
        height: 100%;
        width: 100%;
        transform-origin: left center;
        background: var(--md-blue);
        transition: transform 0.9s linear, background 0.3s ease;
      }
      .timer-fill.low {
        background: var(--md-rose);
        animation: pulse 1s ease-in-out infinite;
      }

      @keyframes pulse {
        50% {
          opacity: 0.5;
        }
      }

      .scoreboard {
        display: flex;
        align-items: stretch;
        justify-content: center;
        gap: 14px;
      }

      .score-card {
        flex: 1;
        max-width: 200px;
        text-align: center;
        padding: 14px 16px;
        border-radius: var(--md-r-control);
        color: #fff;
      }
      .score-card.user {
        background: var(--md-blue);
        box-shadow: 0 8px 20px color-mix(in srgb, var(--md-blue) 30%, transparent);
      }
      .score-card.ai {
        background: var(--md-rose);
        box-shadow: 0 8px 20px color-mix(in srgb, var(--md-rose) 30%, transparent);
      }

      .score-label {
        display: block;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .score-value {
        display: block;
        font-size: 2.2rem;
        font-weight: 700;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
      }

      .vs {
        align-self: center;
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--md-muted);
      }

      /* ---------- Pregunta ---------- */
      .question-area {
        margin: 0 0 auto;
      }

      .question-card {
        background: var(--md-surface);
        border-radius: var(--md-r-card);
        padding: 30px 26px;
        box-shadow: var(--md-elevation);
        animation: rise 0.34s cubic-bezier(0.22, 1, 0.36, 1);
        transition: background 0.3s ease;
      }

      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(14px);
        }
      }

      .question-text {
        margin: 0;
        text-align: center;
        font-size: clamp(2.2rem, 8vw, 3.4rem);
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
        font-variant-numeric: tabular-nums;
      }

      .op {
        color: var(--md-accent);
        font-weight: 600;
        padding: 0 0.12em;
      }

      .options-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 26px;
      }

      .option-btn {
        min-height: 62px;
        padding: 14px;
        font-size: 1.5rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--md-text);
        background: var(--md-surface-2);
        border: 1px solid var(--md-border);
        border-radius: var(--md-r-control);
        cursor: pointer;
        transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
      }

      .option-btn:hover:not(:disabled) {
        transform: translateY(-3px);
        border-color: var(--md-accent);
        background: color-mix(in srgb, var(--md-accent) 8%, var(--md-surface-2));
      }

      .option-btn:active:not(:disabled) {
        transform: translateY(0);
      }

      .option-btn:disabled {
        cursor: default;
      }
      .option-btn:disabled:not(.correct):not(.wrong) {
        opacity: 0.55;
      }

      .option-btn.correct {
        color: var(--md-good-ink);
        background: color-mix(in srgb, var(--md-good) 18%, var(--md-surface));
        border-color: var(--md-good);
        animation: bump 0.3s ease;
      }

      .option-btn.wrong {
        color: var(--md-bad-ink);
        background: color-mix(in srgb, var(--md-bad) 16%, var(--md-surface));
        border-color: var(--md-bad);
        animation: shake 0.35s ease;
      }

      @keyframes bump {
        50% {
          transform: scale(1.04);
        }
      }
      @keyframes shake {
        25% {
          transform: translateX(-6px);
        }
        75% {
          transform: translateX(6px);
        }
      }

      .feedback {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 20px 0 0;
        font-size: 1rem;
        font-weight: 600;
      }
      .feedback.ok {
        color: var(--md-good-ink);
      }
      .feedback.bad {
        color: var(--md-bad-ink);
      }

      .loading {
        text-align: center;
        padding: 48px 26px;
      }
      .loading-text {
        margin: 0;
        color: var(--md-muted);
      }

      /* ---------- Resultado ---------- */
      .result-overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: var(--md-scrim);
        backdrop-filter: blur(8px);
        animation: fade 0.28s ease;
      }

      @keyframes fade {
        from {
          opacity: 0;
        }
      }

      .result-card {
        width: min(420px, 100%);
        text-align: center;
        padding: 34px 28px;
        border-radius: var(--md-r-card);
        background: var(--md-surface);
        box-shadow: var(--md-elevation-lg);
        animation: rise 0.34s cubic-bezier(0.22, 1, 0.36, 1);
      }

      .result-icon {
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        margin: 0 auto 16px;
        border-radius: 50%;
        font-size: 2rem;
        color: var(--md-muted);
        background: var(--md-surface-2);
      }
      .result-icon.win {
        color: var(--md-accent-ink);
        background: var(--md-accent-grad);
      }

      .result-title {
        margin: 0;
        font-size: 1.9rem;
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      .result-scores {
        display: flex;
        justify-content: center;
        gap: 44px;
        margin: 24px 0 8px;
      }

      .result-label {
        display: block;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--md-muted);
        margin-bottom: 4px;
      }

      .result-value {
        display: block;
        font-size: 3rem;
        font-weight: 700;
        line-height: 1.1;
        font-variant-numeric: tabular-nums;
      }

      .result-score.user .result-value {
        color: var(--md-blue);
      }
      .result-score.ai .result-value {
        color: var(--md-rose);
      }

      .result-message {
        margin: 14px 0 24px;
        font-size: 1rem;
        line-height: 1.5;
        color: var(--md-muted);
      }

      .result-actions {
        display: grid;
        gap: 10px;
      }

      .primary-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 52px;
        padding: 13px 22px;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--md-accent-ink);
        background: var(--md-accent-grad);
        border: none;
        border-radius: var(--md-r-control);
        cursor: pointer;
        box-shadow: 0 10px 24px color-mix(in srgb, var(--md-accent) 30%, transparent);
        transition: transform 0.15s ease, filter 0.15s ease;
      }
      .primary-btn:hover {
        transform: translateY(-2px);
        filter: brightness(1.06);
      }

      .ghost-btn {
        min-height: 48px;
        padding: 12px 22px;
        font-size: 0.98rem;
        font-weight: 600;
        color: var(--md-muted);
        background: transparent;
        border: 1px solid var(--md-border);
        border-radius: var(--md-r-control);
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .ghost-btn:hover {
        background: var(--md-surface-2);
        color: var(--md-text);
      }

      /* ---------- Responsive ---------- */
      @media (max-width: 560px) {
        .game {
          padding: 14px;
        }
        .brand {
          font-size: 1.15rem;
        }
        .round-pill {
          padding: 7px 11px;
          font-size: 0.75rem;
        }
        .score-card {
          padding: 12px;
        }
        .score-value {
          font-size: 1.85rem;
        }
        .options-grid {
          gap: 10px;
        }
        .option-btn {
          min-height: 56px;
          font-size: 1.3rem;
        }
        .question-card {
          padding: 24px 16px;
        }
        .result-scores {
          gap: 30px;
        }
        .result-value {
          font-size: 2.4rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }
    `,
  ],
})
export class GameComponent implements OnInit, OnDestroy {
  readonly totalSeconds = ROUND_SECONDS;

  // Signals: en Angular 21 (zoneless) solo los signals disparan change detection
  // desde callbacks como setInterval / setTimeout.
  readonly timeLeft = signal(ROUND_SECONDS);
  readonly score = signal({ user: 0, ai: 0 });
  readonly currentQuestion = signal<MathQuestion | null>(null);
  readonly questionsAnswered = signal(0);
  readonly selectedAnswer = signal<number | null>(null);
  readonly answerState = signal<AnswerState | null>(null);
  readonly gameOver = signal(false);
  readonly winner = signal<Winner | null>(null);

  private readonly mathService = inject(MathService);
  private readonly router = inject(Router);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private feedbackId: ReturnType<typeof setTimeout> | null = null;

  /** Avance de la barra del cronómetro, 1 → 0. Se anima con transform. */
  get timerScale(): number {
    return this.timeLeft() / this.totalSeconds;
  }

  get difficultyLabel(): string {
    switch (this.mathService.getCurrentDifficulty()) {
      case 'easy':
        return 'Fácil';
      case 'medium':
        return 'Medio';
      default:
        return 'Difícil';
    }
  }

  resultTitle(): string {
    switch (this.winner()) {
      case 'user':
        return '¡Ganaste!';
      case 'ai':
        return 'Ganó la IA';
      default:
        return 'Empate';
    }
  }

  resultMessage(): string {
    switch (this.winner()) {
      case 'user':
        return 'Le ganaste a la IA en un minuto de operaciones.';
      case 'ai':
        return 'La IA superó tu marcador esta ronda. Toca el botón y revancha.';
      default:
        return 'Quedaron iguales. La desempata la próxima ronda.';
    }
  }

  resultIcon(): 'trophy' | 'cpu' | 'equal' {
    switch (this.winner()) {
      case 'user':
        return 'trophy';
      case 'ai':
        return 'cpu';
      default:
        return 'equal';
    }
  }

  ngOnInit(): void {
    this.startRound();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  startRound(): void {
    this.clearTimers();
    this.timeLeft.set(ROUND_SECONDS);
    this.score.set({ user: 0, ai: 0 });
    this.questionsAnswered.set(0);
    this.gameOver.set(false);
    this.winner.set(null);
    this.selectedAnswer.set(null);
    this.answerState.set(null);

    this.mathService.resetGame();
    this.spawnQuestion();
    this.startTicking();
  }

  playAgain(): void {
    this.startRound();
  }

  goToMenu(): void {
    this.clearTimers();
    this.router.navigate(['/']);
  }

  onAnswer(option: number): void {
    if (this.selectedAnswer() !== null || this.gameOver() || !this.currentQuestion()) {
      return;
    }

    const correct = this.mathService.verifyAnswer(option, this.currentQuestion()!);
    this.selectedAnswer.set(option);
    this.answerState.set(correct ? 'correct' : 'wrong');

    const current = this.score();
    this.score.set(
      correct ? { ...current, user: current.user + 1 } : { ...current, ai: current.ai + 1 },
    );

    this.feedbackId = setTimeout(() => {
      this.feedbackId = null;
      this.selectedAnswer.set(null);
      this.answerState.set(null);
      if (!this.gameOver()) {
        this.spawnQuestion();
      }
    }, ANSWER_FEEDBACK_MS);
  }

  operationSymbol(op: MathQuestion['operation']): string {
    switch (op) {
      case 'add':
        return '+';
      case 'subtract':
        return '−';
      case 'multiply':
        return '×';
      case 'divide':
        return '÷';
    }
  }

  private spawnQuestion(): void {
    this.currentQuestion.set(this.mathService.getNextQuestion());
    this.questionsAnswered.update((n) => n + 1);
  }

  private startTicking(): void {
    this.intervalId = setInterval(() => {
      const next = this.timeLeft() - 1;
      if (next <= 0) {
        this.timeLeft.set(0);
        this.endRound();
      } else {
        this.timeLeft.set(next);
      }
    }, 1000);
  }

  private endRound(): void {
    this.clearTimers();
    const { user, ai } = this.score();
    this.winner.set(user > ai ? 'user' : ai > user ? 'ai' : 'draw');
    this.gameOver.set(true);
  }

  private clearTimers(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.feedbackId !== null) {
      clearTimeout(this.feedbackId);
      this.feedbackId = null;
    }
  }
}
