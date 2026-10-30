import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../icon';
import { TimerComponent } from '../../timer';
import { SoundService } from '../../game/sound.service';
import { TricksService, TrickQuestion, TrickType, TRICK_TYPES } from '../tricks.service';

const ROUND_SECONDS = 60;
const ROUND_MS = ROUND_SECONDS * 1000;
const TICK_MS = 100;
const CORRECT_FEEDBACK_MS = 500;
const COUNTDOWN_STEP_MS = 700;

type Phase = 'countdown' | 'playing' | 'result';
type AnswerState = 'correct' | 'wrong';

@Component({
  selector: 'app-tricks-timer',
  imports: [IconComponent, TimerComponent],
  templateUrl: './tricks-timer.html',
  styleUrls: ['./tricks-timer.scss'],
})
export class TricksTimerComponent implements OnInit, OnDestroy {
  readonly totalSeconds = ROUND_SECONDS;
  readonly trickType: TrickType;

  readonly phase = signal<Phase>('countdown');
  readonly countdown = signal(3);
  readonly timeLeft = signal(ROUND_SECONDS);
  readonly score = signal(0);
  readonly streak = signal(0);
  readonly bestStreak = signal(0);
  readonly currentQuestion = signal<TrickQuestion | null>(null);
  readonly selectedAnswer = signal<number | null>(null);
  readonly answerState = signal<AnswerState | null>(null);
  readonly showExplanation = signal(false);
  readonly newRecord = signal(false);

  readonly answered = signal(0);
  readonly correctCount = signal(0);

  readonly accuracy = computed(() => {
    const total = this.answered();
    return total === 0 ? 0 : Math.round((this.correctCount() / total) * 100);
  });

  private readonly totalAnswerMs = signal(0);

  readonly avgSeconds = computed(() => {
    const total = this.answered();
    return total === 0 ? 0 : Math.round(this.totalAnswerMs() / total / 100 / 10);
  });

  readonly trickTitle = computed(() => {
    const entry = this.tricks.catalog.find((item) => item.type === this.trickType);
    return entry ? entry.title : 'Trucos';
  });

  readonly trickTip = computed(() => {
    const entry = this.tricks.catalog.find((item) => item.type === this.trickType);
    return entry ? entry.tip : '';
  });

  private readonly tricks = inject(TricksService);
  private readonly router = inject(Router);
  readonly sound = inject(SoundService);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
  private roundStartAt = 0;
  private questionStartAt = 0;
  private pausedAt: number | null = null;
  private pausedMs = 0;
  private previousBest = 0;

  constructor() {
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state ?? history.state) as { type?: TrickType } | null;
    const type = state?.type;
    this.trickType = type && TRICK_TYPES.includes(type) ? type : 'times5';
    this.previousBest = this.tricks.getProgress()[this.trickType].bestStreak;
  }

  get timerScale(): number {
    return this.timeLeft() / this.totalSeconds;
  }

  ngOnInit(): void {
    this.sound.unlock();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  playAgain(): void {
    this.sound.unlock();
    this.startCountdown();
  }

  goToTricks(): void {
    this.clearTimers();
    this.router.navigate(['/tricks']);
  }

  goHome(): void {
    this.clearTimers();
    this.router.navigate(['/']);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const inControl = !!target && /^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(target.tagName);

    if (event.key === 'Escape') {
      event.preventDefault();
      this.goToTricks();
      return;
    }

    if (this.phase() === 'result') {
      if (event.key === 'Enter' && !inControl) {
        event.preventDefault();
        this.playAgain();
      }
      return;
    }

    if (this.showExplanation()) {
      if ((event.key === 'Enter' || event.key === ' ') && !inControl) {
        event.preventDefault();
        this.dismissExplanation();
      }
      return;
    }

    if (this.phase() !== 'playing') {
      return;
    }

    if (event.key < '1' || event.key > '4' || event.ctrlKey || event.metaKey || event.altKey) {
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
    if (this.phase() !== 'playing' || this.selectedAnswer() !== null || this.showExplanation()) {
      return;
    }
    const question = this.currentQuestion();
    if (!question) {
      return;
    }

    const correct = option === question.answer;
    this.selectedAnswer.set(option);
    this.answerState.set(correct ? 'correct' : 'wrong');
    this.answered.update((n) => n + 1);
    this.totalAnswerMs.update(
      (total) => total + Math.max(0, performance.now() - this.questionStartAt),
    );

    if (correct) {
      this.sound.correct();
      this.correctCount.update((n) => n + 1);
      const streak = this.streak() + 1;
      this.streak.set(streak);
      this.bestStreak.update((best) => Math.max(best, streak));
      this.score.update((value) => value + 1);
      this.schedule(() => {
        if (this.phase() !== 'playing') return;
        this.advance();
      }, CORRECT_FEEDBACK_MS);
      return;
    }

    this.sound.wrong();
    this.streak.set(0);
    this.pausedAt = performance.now();
    this.showExplanation.set(true);
  }

  dismissExplanation(): void {
    if (!this.showExplanation()) {
      return;
    }
    if (this.pausedAt !== null) {
      this.pausedMs += performance.now() - this.pausedAt;
      this.pausedAt = null;
    }
    this.showExplanation.set(false);
    if (this.phase() === 'playing') {
      this.advance();
    }
  }

  private advance(): void {
    this.selectedAnswer.set(null);
    this.answerState.set(null);
    this.spawnQuestion();
  }

  private startCountdown(): void {
    this.clearTimers();
    this.phase.set('countdown');
    this.countdown.set(3);
    this.sound.countdown(3);

    let count = 3;
    const step = (): void => {
      count -= 1;
      if (count > 0) {
        this.countdown.set(count);
        this.sound.countdown(count);
        this.schedule(step, COUNTDOWN_STEP_MS);
        return;
      }
      this.countdown.set(0);
      this.sound.countdown(0);
      this.schedule(() => this.startRound(), COUNTDOWN_STEP_MS);
    };
    this.schedule(step, COUNTDOWN_STEP_MS);
  }

  private startRound(): void {
    this.clearTimers();
    this.phase.set('playing');
    this.timeLeft.set(ROUND_SECONDS);
    this.score.set(0);
    this.streak.set(0);
    this.bestStreak.set(0);
    this.answered.set(0);
    this.correctCount.set(0);
    this.selectedAnswer.set(null);
    this.answerState.set(null);
    this.showExplanation.set(false);
    this.newRecord.set(false);
    this.totalAnswerMs.set(0);
    this.pausedAt = null;
    this.pausedMs = 0;
    this.roundStartAt = performance.now();
    this.spawnQuestion();
    this.intervalId = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  private spawnQuestion(): void {
    this.currentQuestion.set(this.tricks.generateQuestion(this.trickType));
    this.questionStartAt = performance.now();
  }

  private tick(): void {
    if (this.phase() !== 'playing') {
      return;
    }

    const now = performance.now();
    const paused = this.pausedMs + (this.pausedAt === null ? 0 : now - this.pausedAt);
    const elapsed = now - this.roundStartAt - paused;
    const remaining = Math.max(0, ROUND_MS - elapsed);
    const seconds = Math.ceil(remaining / 1000);

    if (seconds !== this.timeLeft()) {
      this.timeLeft.set(seconds);
    }

    if (remaining <= 0) {
      this.endRound();
    }
  }

  private endRound(): void {
    this.clearTimers();
    this.timeLeft.set(0);
    this.pausedAt = null;
    this.showExplanation.set(false);
    this.selectedAnswer.set(null);
    this.answerState.set(null);
    this.phase.set('result');

    const bestStreak = this.bestStreak();
    this.newRecord.set(bestStreak > this.previousBest && bestStreak > 0);

    const avgMs = this.answered() === 0 ? 0 : Math.round(this.totalAnswerMs() / this.answered());
    this.tricks.recordRound(this.trickType, {
      correct: this.correctCount(),
      wrong: this.answered() - this.correctCount(),
      bestStreak,
      avgMs,
    });
    this.previousBest = Math.max(this.previousBest, bestStreak);

    if (navigator.vibrate) {
      navigator.vibrate([30, 40, 30]);
    }
    this.sound.win();
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
