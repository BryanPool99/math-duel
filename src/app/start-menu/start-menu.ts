import { Component, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MathService, Difficulty } from '../math';
import { ThemeService } from '../theme';
import { IconComponent } from '../icon';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

@Component({
  selector: 'app-start-menu',
  imports: [IconComponent],
  templateUrl: './start-menu.html',
  styleUrls: ['./start-menu.scss'],
})
export class StartMenuComponent {
  readonly theme = inject(ThemeService);

  selectedDifficulty: Difficulty = 'easy';

  private readonly router = inject(Router);
  private readonly mathService = inject(MathService);

  constructor() {
    // Arranca con la dificultad elegida la ultima vez.
    this.selectedDifficulty = this.mathService.getCurrentDifficulty();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return;
    }

    const onControl = tag === 'BUTTON' || tag === 'A';

    if (event.key === 'Enter' && !onControl && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.startGame();
      return;
    }

    if (event.key >= '1' && event.key <= '3' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const idx = Number(event.key) - 1;
      const difficulty = DIFFICULTIES[idx];
      if (difficulty) {
        this.selectDifficulty(difficulty);
      }
    }
  }

  selectDifficulty(difficulty: Difficulty): void {
    this.selectedDifficulty = difficulty;
    this.mathService.setDifficulty(difficulty);
  }

  toggleMode(): void {
    this.theme.toggle();
  }

  startGame(): void {
    this.mathService.setDifficulty(this.selectedDifficulty);
    this.router.navigate(['/game']);
  }

  openTricks(): void {
    this.router.navigate(['/tricks']);
  }
}
