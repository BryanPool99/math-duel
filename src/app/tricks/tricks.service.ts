import { Injectable } from '@angular/core';

export type TrickType = 'times5' | 'times9' | 'times11' | 'minus1000';

export const TRICK_TYPES: TrickType[] = ['times5', 'times9', 'times11', 'minus1000'];

export interface TrickQuestion {
  id: number;
  type: TrickType;
  /** Enunciado ya formateado, p. ej. "24 × 5 = ?". */
  prompt: string;
  answer: number;
  options: number[];
  /** Frase corta con el truco. */
  explanation: string;
  /** Pasos para resolverlo, del primero al último. */
  steps: string[];
}

export interface TrickStat {
  correct: number;
  wrong: number;
  bestStreak: number;
  /** Mejor media de ms por acierto (menor es mejor). 0 = sin datos. */
  bestAvgMs: number;
}

export type TrickProgress = Record<TrickType, TrickStat>;

const STORAGE_KEY = 'math-duel:tricks-progress';

function emptyStat(): TrickStat {
  return { correct: 0, wrong: 0, bestStreak: 0, bestAvgMs: 0 };
}

function emptyProgress(): TrickProgress {
  return {
    times5: emptyStat(),
    times9: emptyStat(),
    times11: emptyStat(),
    minus1000: emptyStat(),
  };
}

@Injectable({ providedIn: 'root' })
export class TricksService {
  private nextId = 1;

  /** Metadatos para pintar el menú y las tarjetas. */
  readonly catalog: { type: TrickType; title: string; short: string; tip: string }[] = [
    { type: 'times5', title: 'Multiplicar por 5', short: '×5', tip: '×10 y divide entre 2' },
    { type: 'times9', title: 'Multiplicar por 9', short: '×9', tip: '×10 y resta el número' },
    {
      type: 'times11',
      title: 'Multiplicar por 11',
      short: '×11',
      tip: 'Suma los dígitos en medio',
    },
    { type: 'minus1000', title: 'Restar de 1000', short: '1000 − x', tip: 'Resta de 9, 9 y 10' },
  ];

  getProgress(): TrickProgress {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyProgress();
      const parsed = JSON.parse(raw) as Partial<TrickProgress>;
      const base = emptyProgress();
      for (const type of TRICK_TYPES) {
        const stat = parsed[type];
        if (stat) base[type] = { ...base[type], ...stat };
      }
      return base;
    } catch {
      return emptyProgress();
    }
  }

  /** Guarda el resultado de una ronda y devuelve el progreso actualizado. */
  recordRound(
    type: TrickType,
    result: { correct: number; wrong: number; bestStreak: number; avgMs: number },
  ): TrickProgress {
    const progress = this.getProgress();
    const stat = progress[type];
    stat.correct += result.correct;
    stat.wrong += result.wrong;
    stat.bestStreak = Math.max(stat.bestStreak, result.bestStreak);
    if (result.avgMs > 0 && (stat.bestAvgMs === 0 || result.avgMs < stat.bestAvgMs)) {
      stat.bestAvgMs = Math.round(result.avgMs);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // localStorage puede no estar disponible (modo privado); el juego sigue funcionando.
    }
    return progress;
  }

  resetProgress(): TrickProgress {
    const progress = emptyProgress();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorado.
    }
    return progress;
  }

  generateQuestion(type: TrickType): TrickQuestion {
    switch (type) {
      case 'times5':
        return this.times5();
      case 'times9':
        return this.times9();
      case 'times11':
        return this.times11();
      case 'minus1000':
        return this.minus1000();
    }
  }

  private times5(): TrickQuestion {
    const n = this.randInt(2, 199);
    const answer = n * 5;
    return {
      id: this.nextId++,
      type: 'times5',
      prompt: `${n} × 5 = ?`,
      answer,
      options: this.options(answer),
      explanation: 'Multiplica por 10 y divide entre 2.',
      steps: [`${n} × 10 = ${n * 10}`, `${n * 10} ÷ 2 = ${answer}`],
    };
  }

  private times9(): TrickQuestion {
    const n = this.randInt(2, 99);
    const answer = n * 9;
    return {
      id: this.nextId++,
      type: 'times9',
      prompt: `${n} × 9 = ?`,
      answer,
      options: this.options(answer),
      explanation: 'Multiplica por 10 y resta el número original.',
      steps: [`${n} × 10 = ${n * 10}`, `${n * 10} − ${n} = ${answer}`],
    };
  }

  private times11(): TrickQuestion {
    const tens = this.randInt(1, 9);
    const ones = this.randInt(0, 9);
    const n = tens * 10 + ones;
    const answer = n * 11;
    const sum = tens + ones;

    if (sum < 10) {
      return {
        id: this.nextId++,
        type: 'times11',
        prompt: `${n} × 11 = ?`,
        answer,
        options: this.options(answer),
        explanation: 'Separa los dígitos y coloca la suma en medio.',
        steps: [`${tens} + ${ones} = ${sum}`, `${tens}${sum}${ones} = ${answer}`],
      };
    }

    return {
      id: this.nextId++,
      type: 'times11',
      prompt: `${n} × 11 = ?`,
      answer,
      options: this.options(answer),
      explanation: 'Suma los dígitos y lleva 1 al primer dígito.',
      steps: [`${tens} + ${ones} = ${sum}`, `Lleva 1: ${tens + 1}${sum % 10}${ones} = ${answer}`],
    };
  }

  private minus1000(): TrickQuestion {
    const n = this.randInt(101, 999);
    const answer = 1000 - n;
    const d1 = Math.floor(n / 100);
    const d2 = Math.floor((n % 100) / 10);
    const d3 = n % 10;
    const r1 = 9 - d1;
    const r2 = 9 - d2;
    const r3 = 10 - d3;
    return {
      id: this.nextId++,
      type: 'minus1000',
      prompt: `1000 − ${n} = ?`,
      answer,
      options: this.options(answer),
      explanation: 'Resta cada dígito de 9, salvo el último, que se resta de 10.',
      steps: [
        `9 − ${d1} = ${r1}`,
        `9 − ${d2} = ${r2}`,
        `10 − ${d3} = ${r3}`,
        `${r1}${r2}${r3} = ${answer}`,
      ],
    };
  }

  /** Tres distractores únicos y positivos, sin depender del orden de Math.random. */
  private options(correct: number): number[] {
    const deltas = [1, -1, 10, -10, 2, -2, 5, -5, 9, -9, 11, -11];
    const wrong: number[] = [];
    for (const delta of deltas) {
      const candidate = correct + delta;
      if (candidate > 0 && candidate !== correct && !wrong.includes(candidate)) {
        wrong.push(candidate);
      }
      if (wrong.length === 3) break;
    }
    let extra = 3;
    while (wrong.length < 3) {
      const candidate = correct + extra;
      if (candidate > 0 && candidate !== correct && !wrong.includes(candidate)) {
        wrong.push(candidate);
      }
      extra += 1;
    }
    return this.shuffle([correct, ...wrong]);
  }

  private shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
