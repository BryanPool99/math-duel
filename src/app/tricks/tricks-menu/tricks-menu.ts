import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../icon';
import { TricksService, TrickType, TrickProgress, TRICK_TYPES } from '../tricks.service';

interface TrickCard {
  type: TrickType;
  title: string;
  short: string;
  tip: string;
  best: number;
  played: number;
}

@Component({
  selector: 'app-tricks-menu',
  imports: [IconComponent],
  templateUrl: './tricks-menu.html',
  styleUrls: ['./tricks-menu.scss'],
})
export class TricksMenuComponent {
  private readonly router = inject(Router);
  private readonly tricks = inject(TricksService);

  readonly progress = signal<TrickProgress>(this.tricks.getProgress());
  readonly confirmReset = signal(false);

  readonly cards = computed<TrickCard[]>(() => {
    const progress = this.progress();
    return this.tricks.catalog.map((entry) => ({
      ...entry,
      best: progress[entry.type].bestStreak,
      played: progress[entry.type].correct + progress[entry.type].wrong,
    }));
  });

  readonly totalCorrect = computed(() =>
    TRICK_TYPES.reduce((sum, type) => sum + this.progress()[type].correct, 0),
  );

  play(type: TrickType): void {
    this.router.navigate(['/tricks/timer'], { state: { type } });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  askReset(): void {
    this.confirmReset.set(true);
  }

  cancelReset(): void {
    this.confirmReset.set(false);
  }

  doReset(): void {
    this.progress.set(this.tricks.resetProgress());
    this.confirmReset.set(false);
  }
}
