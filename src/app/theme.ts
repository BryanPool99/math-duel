import { Injectable, signal } from '@angular/core';

/**
 * Estado del modo oscuro compartido entre todas las rutas.
 * Se guarda en un signal para que el menú y la partida
 * siempre muestren el mismo tema sin perderlo al navegar.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  toggle(): void {
    this.setDark(!this.isDark());
  }

  setDark(dark: boolean): void {
    this.isDark.set(dark);
    document.body.classList.toggle('dark', dark);
  }
}
