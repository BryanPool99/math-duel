import { Routes } from '@angular/router';
import { StartMenuComponent } from './start-menu/start-menu';
import { GameComponent } from './game/game';

export const routes: Routes = [
  { path: '', component: StartMenuComponent, title: 'Math Duel — Menú' },
  { path: 'game', component: GameComponent, title: 'Math Duel — Partida' },
  { path: '**', redirectTo: '' },
];
