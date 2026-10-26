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
