import { Injectable } from '@angular/core';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

export interface MathQuestion {
  id: number;
  operation: Operation;
  a: number;
  b: number;
  correctAnswer: number;
  difficulty: Difficulty;
  /** Las 4 opciones (una es la correcta), siempre únicas. */
  options: number[];
}

const RANGE: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 0, max: 10 },
  medium: { min: 0, max: 50 },
  hard: { min: 0, max: 100 },
};

const OPERATIONS: Operation[] = ['add', 'subtract', 'multiply', 'divide'];

@Injectable({ providedIn: 'root' })
export class MathService {
  private questionPool: MathQuestion[] = [];
  private selectedDifficulty: Difficulty = 'easy';
  private nextId = 1;

  setDifficulty(difficulty: Difficulty): void {
    this.selectedDifficulty = difficulty;
    this.generateQuestionPool();
  }

  getCurrentDifficulty(): Difficulty {
    return this.selectedDifficulty;
  }

  getNumberRange(difficulty: Difficulty): { min: number; max: number } {
    return RANGE[difficulty];
  }

  calculateResult(op: Operation, a: number, b: number): number {
    switch (op) {
      case 'add':
        return a + b;
      case 'subtract':
        return a - b;
      case 'multiply':
        return a * b;
      case 'divide':
        return b === 0 ? 0 : Math.round(a / b);
    }
  }

  /**
   * Genera 4 opciones distintas: la correcta + 3 distractores
   * con errores tipicos (off-by-one, decena cercana, digitos invertidos).
   */
  generateOptions(correctAnswer: number, difficulty: Difficulty): number[] {
    const { min, max } = RANGE[difficulty];
    const wrong = new Set<number>();

    const candidates = [
      correctAnswer + 1,
      correctAnswer - 1,
      correctAnswer + 10,
      correctAnswer - 10,
      correctAnswer + (max - min > 20 ? 20 : 2),
      Number(String(correctAnswer).split('').reverse().join('')),
      min + Math.floor(Math.random() * (max - min + 1)),
      max - Math.floor(Math.random() * (max - min + 1)),
    ];

    for (const c of candidates) {
      if (wrong.size >= 3) break;
      if (c !== correctAnswer && c >= 0) {
        wrong.add(c);
      }
    }

    // Relleno de seguridad: nunca puede quedarse sin 3 distractores.
    let delta = 1;
    while (wrong.size < 3) {
      const c = correctAnswer + delta;
      if (c !== correctAnswer && c >= 0) {
        wrong.add(c);
      }
      delta = delta > 0 ? -delta : -delta + 1;
      if (delta > 1000) break;
    }

    return this.shuffleArray([correctAnswer, ...wrong]);
  }

  shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  getNextQuestion(): MathQuestion | null {
    if (this.questionPool.length === 0) {
      this.generateQuestionPool();
    }
    const question = this.questionPool.shift();
    return question ?? null;
  }

  verifyAnswer(userAnswer: number, question: MathQuestion): boolean {
    return question.correctAnswer === userAnswer;
  }

  resetGame(): void {
    this.questionPool = [];
    this.generateQuestionPool();
  }

  private generateQuestionPool(): void {
    const pool: MathQuestion[] = [];
    for (let i = 0; i < 5; i++) {
      pool.push(this.createQuestion());
    }
    this.questionPool = this.shuffleArray(pool);
  }

  private createQuestion(): MathQuestion {
    const { min, max } = RANGE[this.selectedDifficulty];
    const operation = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];

    let a = Math.floor(Math.random() * (max - min + 1)) + min;
    let b = Math.floor(Math.random() * (max - min + 1)) + min;

    if (operation === 'divide') {
      // Multiplicacion exacta para que la division sea entera.
      b = Math.max(1, Math.min(b, 12));
      a = b * Math.floor(a / b);
    } else if (operation === 'subtract') {
      // Evita resultados negativos.
      if (b > a) {
        [a, b] = [b, a];
      }
    }

    const correctAnswer = this.calculateResult(operation, a, b);

    return {
      id: this.nextId++,
      operation,
      a,
      b,
      correctAnswer,
      difficulty: this.selectedDifficulty,
      options: this.generateOptions(correctAnswer, this.selectedDifficulty),
    };
  }
}
