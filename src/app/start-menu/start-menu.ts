import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MathService, Difficulty } from '../math';
import { ThemeService } from '../theme';
import { IconComponent } from '../icon';

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
}
