import { Routes } from '@angular/router';
import { StartMenuComponent } from './start-menu/start-menu';

export const routes: Routes = [
  { path: '', component: StartMenuComponent, title: 'Math Duel — Menú' },
  {
    path: 'game',
    loadComponent: () => import('./game/game').then((m) => m.GameComponent),
    title: 'Math Duel — Partida',
  },
  {
    path: 'tricks',
    loadComponent: () =>
      import('./tricks/tricks-menu/tricks-menu').then((m) => m.TricksMenuComponent),
    title: 'Math Duel — Trucos',
  },
  {
    path: 'tricks/timer',
    loadComponent: () =>
      import('./tricks/tricks-timer/tricks-timer').then((m) => m.TricksTimerComponent),
    title: 'Math Duel — Trucos',
  },
  { path: '**', redirectTo: '' },
];
