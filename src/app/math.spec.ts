import { TestBed } from '@angular/core/testing';
import { MathService } from './math';

describe('MathService', () => {
  let service: MathService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MathService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('stores the selected difficulty', () => {
    service.setDifficulty('hard');
    expect(service.getCurrentDifficulty()).toBe('hard');
  });

  it('always returns exactly 4 unique options including the answer', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      service.setDifficulty(difficulty);
      for (let i = 0; i < 50; i++) {
        const q = service.getNextQuestion();
        expect(q).toBeTruthy();
        expect(q!.options.length).toBe(4);
        expect(new Set(q!.options).size).toBe(4);
        expect(q!.options).toContain(q!.correctAnswer);
        expect(Math.min(...q!.options)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps operands inside the difficulty range', () => {
    const ranges = { easy: 10, medium: 50, hard: 100 } as const;
    for (const [difficulty, max] of Object.entries(ranges)) {
      service.setDifficulty(difficulty as 'easy' | 'medium' | 'hard');
      for (let i = 0; i < 50; i++) {
        const q = service.getNextQuestion()!;
        expect(q.a).toBeGreaterThanOrEqual(0);
        expect(q.a).toBeLessThanOrEqual(max);
        expect(q.b).toBeGreaterThanOrEqual(0);
        expect(q.b).toBeLessThanOrEqual(max);
      }
    }
  });

  it('produces exact integer divisions and non-negative subtractions', () => {
    service.setDifficulty('hard');
    for (let i = 0; i < 200; i++) {
      const q = service.getNextQuestion()!;
      if (q.operation === 'divide') {
        expect(q.a % q.b).toBe(0);
        expect(Number.isInteger(q.correctAnswer)).toBe(true);
      }
      if (q.operation === 'subtract') {
        expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('verifies answers', () => {
    service.setDifficulty('easy');
    const q = service.getNextQuestion()!;
    expect(service.verifyAnswer(q.correctAnswer, q)).toBe(true);
    const wrong = q.options.find((o) => o !== q.correctAnswer)!;
    expect(service.verifyAnswer(wrong, q)).toBe(false);
  });

  it('refills the pool when it runs out', () => {
    service.setDifficulty('easy');
    for (let i = 0; i < 30; i++) {
      expect(service.getNextQuestion()).toBeTruthy();
    }
  });
});
