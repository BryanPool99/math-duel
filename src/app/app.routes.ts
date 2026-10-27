import { Routes } from '@angular/router';
import { StartMenuComponent } from './start-menu/start-menu';

export const routes: Routes = [
  { path: '', component: StartMenuComponent, title: 'Math Duel — Menú' },
  {
    path: 'game',
    loadComponent: () => import('./game/game').then((m) => m.GameComponent),
    title: 'Math Duel — Partida',
  },
  { path: '**', redirectTo: '' },
];
