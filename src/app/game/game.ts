import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MathService, MathQuestion } from '../math';
import { TimerComponent } from '../timer';
import { IconComponent } from '../icon';
import { aiAnswersCorrectly, aiReactionFor } from './ai';

const ROUND_SECONDS = 60;
const ROUND_MS = ROUND_SECONDS * 1000;
/** Un unico reloj de 100ms gobierna la ronda: cuenta atras, IA y barras. */
const TICK_MS = 100;
const ANSWER_FEEDBACK_MS = 650;
const AI_FLASH_MS = 700;
/** Puntos que da de bonus cada N aciertos seguidos. */
const COMBO_EVERY = 5;
const BONUS_FLASH_MS = 1000;

type AnswerState = 'correct' | 'wrong';
type Winner = 'user' | 'ai' | 'draw';

/** Rastro de cada respuesta del jugador, para el desglose final. */
export interface AnswerLogEntry {
  readonly question: MathQuestion;
  readonly selected: number;
  readonly correct: boolean;
  /** Tiempo que tardó la pregunta hasta la respuesta, en ms. */
  readonly ms: number;
}

@Component({
  selector: 'app-game',
  imports: [TimerComponent, IconComponent],
  templateUrl: './game.html',
  styleUrls: ['./game.scss'],
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

  /** Racha de aciertos consecutivos y bonus acumulado. */
  readonly streak = signal(0);
  readonly bestStreak = signal(0);
  readonly bonus = signal(0);
  readonly bonusFlash = signal(false);

  /** Cada respuesta del jugador con su tiempo, para la pantalla de resultados. */
  readonly answerLog = signal<AnswerLogEntry[]>([]);

  /** Desglose de la ronda: precisión, ritmo, racha, bonus y fallos. */
  readonly summary = computed(() => {
    const log = this.answerLog();
    const answered = log.length;
    const correct = log.filter((entry) => entry.correct).length;
    const totalMs = log.reduce((sum, entry) => sum + entry.ms, 0);
    const ai = this.aiStats();

    return {
      answered,
      correct,
      wrong: answered - correct,
      accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100),
      avgSeconds: answered === 0 ? 0 : Math.round(totalMs / answered / 100) / 10,
      bestStreak: this.bestStreak(),
      bonus: this.bonus(),
      aiAttempts: ai.attempts,
      aiCorrect: ai.correct,
      aiAccuracy: ai.attempts === 0 ? 0 : Math.round((ai.correct / ai.attempts) * 100),
      missed: log.filter((entry) => !entry.correct),
    };
  });

  /**
   * Barra de enfrentamiento: cuota que llevas sobre el total de puntos.
   * 0-0 arranca en mitad y cada punto se le quita al rival.
   */
  readonly userShare = computed(() => {
    const { user, ai } = this.score();
    const total = user + ai;
    return total === 0 ? 0.5 : user / total;
  });

  /** La IA en su propio reloj: avance hacia su proxima respuesta. */
  readonly aiProgress = signal(0);
  readonly aiQuestion = signal<MathQuestion | null>(null);
  readonly aiFlash = signal<{ kind: 'score' | 'miss' } | null>(null);
  readonly aiStats = signal({ attempts: 0, correct: 0 });

  private readonly mathService = inject(MathService);
  private readonly router = inject(Router);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
  private roundStartAt = 0;
  /** performance.now() en el que apareció la pregunta actual. */
  private questionStartAt = 0;
  /** ms transcurridos de la ronda en los que la IA responde. */
  private aiNextAt = 0;
  private aiDelayMs = 1;

  /** Avance de la barra del cronómetro, 1 → 0. Se anima con transform. */
  get timerScale(): number {
    return this.timeLeft() / this.totalSeconds;
  }

  /** Avance de la IA en tanto por uno, para aria-valuenow. */
  get aiPercent(): number {
    return Math.round(this.aiProgress() * 100);
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
    this.aiProgress.set(0);
    this.aiQuestion.set(null);
    this.aiFlash.set(null);
    this.aiStats.set({ attempts: 0, correct: 0 });
    this.streak.set(0);
    this.bestStreak.set(0);
    this.bonus.set(0);
    this.bonusFlash.set(false);
    this.answerLog.set([]);

    this.mathService.resetGame();
    this.spawnQuestion();
    this.startRoundLoop();
  }

  playAgain(): void {
    this.startRound();
  }

  goToMenu(): void {
    this.clearTimers();
    this.router.navigate(['/']);
  }

  /**
   * Atajos: 1-4 responden, Esc vuelve al menú y Enter repite la partida.
   * Enter se salta cuando el foco ya está en un control, para no duplicar
   * el clic nativo del botón que tiene el foco.
   */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const inControl = !!target && /^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(target.tagName);

    if (event.key === 'Escape') {
      event.preventDefault();
      this.goToMenu();
      return;
    }

    if (this.gameOver()) {
      if (event.key === 'Enter' && !inControl) {
        event.preventDefault();
        this.playAgain();
      }
      return;
    }

    const isDigit = event.key >= '1' && event.key <= '4';
    if (!isDigit || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const question = this.currentQuestion();
    if (!question || this.selectedAnswer() !== null) {
      return;
    }
    const option = question.options[Number(event.key) - 1];
    if (option !== undefined) {
      event.preventDefault();
      this.onAnswer(option);
    }
  }

  onAnswer(option: number): void {
    if (this.selectedAnswer() !== null || this.gameOver() || !this.currentQuestion()) {
      return;
    }

    const correct = this.mathService.verifyAnswer(option, this.currentQuestion()!);
    this.selectedAnswer.set(option);
    this.answerState.set(correct ? 'correct' : 'wrong');

    // Errar ya no le regala puntos a la IA: la IA se puntua en su reloj.
    if (correct) {
      const streak = this.streak() + 1;
      this.streak.set(streak);
      this.bestStreak.update((best) => Math.max(best, streak));

      // Cada N seguidas cae un punto de bonus.
      let extra = 0;
      if (streak % COMBO_EVERY === 0) {
        extra = 1;
        this.bonus.update((b) => b + 1);
        this.bonusFlash.set(true);
        this.schedule(() => this.bonusFlash.set(false), BONUS_FLASH_MS);
      }

      const current = this.score();
      this.score.set({ ...current, user: current.user + 1 + extra });
    } else {
      this.streak.set(0);
    }

    this.answerLog.update((log) => [
      ...log,
      {
        question: this.currentQuestion()!,
        selected: option,
        correct,
        ms: Math.round(performance.now() - this.questionStartAt),
      },
    ]);

    this.schedule(() => {
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
    this.questionStartAt = performance.now();
  }

  /* --------------------------- Motor de la ronda --------------------------- */

  private startRoundLoop(): void {
    this.roundStartAt = performance.now();
    this.aiDelayMs = this.nextAiDelay();
    this.aiNextAt = this.aiDelayMs;
    this.intervalId = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  private tick(): void {
    const elapsed = performance.now() - this.roundStartAt;
    const remaining = Math.max(0, ROUND_MS - elapsed);

    const seconds = Math.ceil(remaining / 1000);
    if (seconds !== this.timeLeft()) {
      this.timeLeft.set(seconds);
    }

    if (remaining <= 0) {
      this.timeLeft.set(0);
      this.endRound();
      return;
    }

    // La IA responde tantas veces como le haya dado tiempo en este frame.
    while (elapsed >= this.aiNextAt && !this.gameOver()) {
      this.resolveAiTurn(elapsed);
    }

    const ahead = this.aiNextAt - elapsed;
    this.aiProgress.set(Math.min(1, Math.max(0, 1 - ahead / this.aiDelayMs)));
  }

  private resolveAiTurn(elapsed: number): void {
    const difficulty = this.mathService.getCurrentDifficulty();
    const correct = aiAnswersCorrectly(difficulty, Math.random());
    const stats = this.aiStats();

    this.aiQuestion.set(this.mathService.getNextQuestion());
    this.aiStats.set({
      attempts: stats.attempts + 1,
      correct: stats.correct + (correct ? 1 : 0),
    });

    if (correct) {
      const current = this.score();
      this.score.set({ ...current, ai: current.ai + 1 });
    }

    this.aiFlash.set({ kind: correct ? 'score' : 'miss' });
    this.schedule(() => this.aiFlash.set(null), AI_FLASH_MS);

    this.aiDelayMs = this.nextAiDelay();
    this.aiNextAt = elapsed + this.aiDelayMs;
  }

  private nextAiDelay(): number {
    return aiReactionFor(this.mathService.getCurrentDifficulty(), Math.random());
  }

  private endRound(): void {
    this.clearTimers();
    this.aiFlash.set(null);
    const { user, ai } = this.score();
    this.winner.set(user > ai ? 'user' : ai > user ? 'ai' : 'draw');
    this.gameOver.set(true);
  }

  private schedule(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      fn();
    }, ms);
    this.timeouts.add(id);
  }

  private clearTimers(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    for (const id of this.timeouts) {
      clearTimeout(id);
    }
    this.timeouts.clear();
  }
}
