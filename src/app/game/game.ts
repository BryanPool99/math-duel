import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MathService, MathQuestion } from '../math';
import { TimerComponent } from '../timer';
import { IconComponent } from '../icon';
import { aiAnswersCorrectly, aiReactionFor } from './ai';
import { SoundService } from './sound.service';

const ROUND_SECONDS = 60;
const ROUND_MS = ROUND_SECONDS * 1000;
/** Un unico reloj de 100ms gobierna la ronda: cuenta atras, IA y barras. */
const TICK_MS = 100;
const ANSWER_FEEDBACK_MS = 650;
const AI_FLASH_MS = 700;
/** Puntos que da de bonus cada N aciertos seguidos. */
const COMBO_EVERY = 5;
const BONUS_FLASH_MS = 1000;
const COUNTDOWN_STEP_MS = 1000;

type AnswerState = 'correct' | 'wrong';
type Winner = 'user' | 'ai' | 'draw';
type Phase = 'countdown' | 'playing' | 'result';

export interface AnswerLogEntry {
  readonly question: MathQuestion;
  readonly selected: number;
  readonly correct: boolean;
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

  readonly phase = signal<Phase>('countdown');
  readonly countdown = signal(3);
  readonly timeLeft = signal(ROUND_SECONDS);
  readonly score = signal({ user: 0, ai: 0 });
  readonly currentQuestion = signal<MathQuestion | null>(null);
  readonly questionsAnswered = signal(0);
  readonly selectedAnswer = signal<number | null>(null);
  readonly answerState = signal<AnswerState | null>(null);
  readonly gameOver = signal(false);
  readonly winner = signal<Winner | null>(null);

  readonly streak = signal(0);
  readonly bestStreak = signal(0);
  readonly bonus = signal(0);
  readonly bonusFlash = signal(false);
  readonly answerLog = signal<AnswerLogEntry[]>([]);

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
      avgSeconds: answered === 0 ? 0 : Math.round((totalMs / answered / 100)) / 10,
      bestStreak: this.bestStreak(),
      bonus: this.bonus(),
      aiAttempts: ai.attempts,
      aiCorrect: ai.correct,
      aiAccuracy: ai.attempts === 0 ? 0 : Math.round((ai.correct / ai.attempts) * 100),
      missed: log.filter((entry) => !entry.correct),
    };
  });

  readonly userShare = computed(() => {
    const { user, ai } = this.score();
    const total = user + ai;
    return total === 0 ? 0.5 : user / total;
  });

  readonly aiProgress = signal(0);
  readonly aiQuestion = signal<MathQuestion | null>(null);
  readonly aiFlash = signal<{ kind: 'score' | 'miss' } | null>(null);
  readonly aiStats = signal({ attempts: 0, correct: 0 });

  private readonly mathService = inject(MathService);
  private readonly router = inject(Router);
  readonly sound = inject(SoundService);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
  private roundStartAt = 0;
  private questionStartAt = 0;
  private aiNextAt = 0;
  private aiDelayMs = 1;

  get timerScale(): number {
    return this.timeLeft() / this.totalSeconds;
  }

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
    this.sound.unlock();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  startRound(): void {
    this.clearTimers();
    this.phase.set('playing');
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
    this.sound.unlock();
    this.startCountdown();
  }

  goToMenu(): void {
    this.clearTimers();
    this.router.navigate(['/']);
  }

  private startCountdown(): void {
    this.clearTimers();
    this.gameOver.set(false);
    this.winner.set(null);
    this.phase.set('countdown');
    this.countdown.set(3);
    this.sound.countdown(3);
    let count = 3;
    const step = () => {
      count -= 1;
      if (count > 0) {
        this.countdown.set(count);
        this.sound.countdown(count);
        this.schedule(step, COUNTDOWN_STEP_MS);
        return;
      }
      this.countdown.set(0);
      this.sound.countdown(0);
      this.schedule(() => {
        this.phase.set('playing');
        this.startRound();
      }, COUNTDOWN_STEP_MS);
    };
    this.schedule(step, COUNTDOWN_STEP_MS);
  }

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
        this.sound.unlock();
        this.playAgain();
      }
      return;
    }
    if (this.phase() !== 'playing') {
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
      this.sound.click();
      this.onAnswer(option);
    }
  }

  onAnswer(option: number): void {
    if (this.selectedAnswer() !== null || this.gameOver() || !this.currentQuestion() || this.phase() !== 'playing') {
      return;
    }
    const correct = this.mathService.verifyAnswer(option, this.currentQuestion()!);
    this.selectedAnswer.set(option);
    this.answerState.set(correct ? 'correct' : 'wrong');
    correct ? this.sound.correct() : this.sound.wrong();

    if (correct) {
      const streak = this.streak() + 1;
      this.streak.set(streak);
      this.bestStreak.update((best) => Math.max(best, streak));
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
      if (!this.gameOver() && this.phase() === 'playing') {
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

  private startRoundLoop(): void {
    this.roundStartAt = performance.now();
    this.aiDelayMs = this.nextAiDelay();
    this.aiNextAt = this.aiDelayMs;
    this.intervalId = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  private tick(): void {
    if (this.phase() !== 'playing') {
      return;
    }
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

    const prevSecond = Math.floor((remaining + TICK_MS) / 1000);
    if (Math.floor(remaining / 1000) !== prevSecond && seconds >= 1 && seconds <= 5) {
      this.sound.tickUrgent();
      if (navigator.vibrate) navigator.vibrate(10);
    }

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
    this.aiStats.set({ attempts: stats.attempts + 1, correct: stats.correct + (correct ? 1 : 0) });
    if (correct) {
      const current = this.score();
      this.score.set({ ...current, ai: current.ai + 1 });
      this.sound.aiScore();
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
    this.phase.set('result');
    if (navigator.vibrate) {
      navigator.vibrate(user > ai ? [30, 40, 30] : [60]);
    }
    if (user > ai) this.sound.win();
    else if (ai > user) this.sound.lose();
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
