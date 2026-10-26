import { Difficulty } from '../math';

/**
 * Perfil de la IA por dificultad: cuanto mas dificil, mas rapido responde
 * y menos se equivoca. Los valores se calibran para que la IA marque
 * ~12 / ~18 / ~27 puntos en 60 segundos, por debajo de un buen jugador
 * y por encima de uno distraido.
 */
export interface AiProfile {
  /** Milisegundos que tarda en responder su propia pregunta. */
  reactionMs: number;
  /** Probabilidad de acertar. */
  accuracy: number;
}

export const AI_PROFILE: Record<Difficulty, AiProfile> = {
  easy: { reactionMs: 3000, accuracy: 0.6 },
  medium: { reactionMs: 2400, accuracy: 0.7 },
  hard: { reactionMs: 1800, accuracy: 0.8 },
};

/** Desviacion del tiempo de reaccion (±15%) para que no suene un metronomo. */
const JITTER = 0.3;

/**
 * @param roll numero aleatorio en [0, 1)
 * @returns true si la IA acierta su pregunta
 */
export function aiAnswersCorrectly(difficulty: Difficulty, roll: number): boolean {
  return roll < AI_PROFILE[difficulty].accuracy;
}

/**
 * @param roll numero aleatorio en [0, 1)
 * @returns tiempo de reaccion de este turno, con jitter aplicado
 */
export function aiReactionFor(difficulty: Difficulty, roll: number): number {
  const base = AI_PROFILE[difficulty].reactionMs;
  return Math.round(base * (1 - JITTER / 2 + roll * JITTER));
}

/** Puntos esperados de la IA en una ronda dada, para calibrar el balance. */
export function expectedAiPoints(difficulty: Difficulty, seconds: number): number {
  const { reactionMs, accuracy } = AI_PROFILE[difficulty];
  return Math.round((seconds * 1000 * accuracy) / reactionMs);
}
