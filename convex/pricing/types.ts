/**
 * Pricing Engine Types
 * 
 * Core types for the tick-based market maker pricing engine.
 * ~40 participants, 20-40 orders/minute, 15-second ticks.
 */

export type MarketRegime = 'Calm' | 'Normal' | 'Hype'

export interface RegimeParameters {
  alphaR: number // Reactivity parameter
  noiseStdDev: number // Standard deviation for random price movements
  minDuration: number // Minimum duration in seconds before regime can change
  maxDuration: number // Maximum duration in seconds before regime likely changes
}

export const REGIME_PARAMS: Record<MarketRegime, RegimeParameters> = {
  Calm: {
    alphaR: 0.08,
    noiseStdDev: 0.002, // ~0.2% per tick
    minDuration: 300, // 5 minutes
    maxDuration: 600, // 10 minutes
  },
  Normal: {
    alphaR: 0.14,
    noiseStdDev: 0.005, // ~0.5% per tick
    minDuration: 300,
    maxDuration: 600,
  },
  Hype: {
    alphaR: 0.20,
    noiseStdDev: 0.008, // ~0.8% per tick
    minDuration: 180, // 3 minutes
    maxDuration: 420, // 7 minutes
  },
}

// Markov chain transition probabilities (from -> to)
export const REGIME_TRANSITIONS: Record<MarketRegime, Record<MarketRegime, number>> = {
  Calm: { Calm: 0.7, Normal: 0.25, Hype: 0.05 },
  Normal: { Calm: 0.2, Normal: 0.6, Hype: 0.2 },
  Hype: { Calm: 0.1, Normal: 0.4, Hype: 0.5 },
}

export interface PricingConfig {
  // Core parameters
  tickIntervalSeconds: number // 15 seconds
  beta: number // Mean reversion strength (0.04)
  lambda: number // Dirichlet smoothing parameter (0.5)
  k: number // tanh saturation parameter (2)
  N0: number // Activity scaling threshold (10)
  
  // Bounds
  lowerBoundMultiplier: number // 0.6
  upperBoundMultiplier: number // 2.2
  maxJumpPercent: number // 0.08 (8%)
  
  // Anti-manipulation
  maxImpactPerUserPerTick: number // 2 units
  
  // Circuit breaker
  largeJumpThreshold: number // 0.05 (5%)
  consecutiveJumpsForBreaker: number // 3
  volatilityReductionDuration: number // seconds (60)
  volatilityReductionFactor: number // 0.5 (reduce alphaEff by 50%)
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  tickIntervalSeconds: 15,
  beta: 0.04,
  lambda: 0.5,
  k: 2,
  N0: 10,
  lowerBoundMultiplier: 0.6,
  upperBoundMultiplier: 2.2,
  maxJumpPercent: 0.08,
  maxImpactPerUserPerTick: 2,
  largeJumpThreshold: 0.05,
  consecutiveJumpsForBreaker: 3,
  volatilityReductionDuration: 60,
  volatilityReductionFactor: 0.5,
}

export interface DrinkAggregatedDemand {
  drinkId: string
  totalQuantity: number // B_i,t
  impactQuantity: number // B_i,t after user caps applied
  uniqueUsers: number
}

export interface TickAggregation {
  tickId: number
  drinks: Map<string, DrinkAggregatedDemand>
  totalImpactQuantity: number // Σ_j B_j,t
  timestamp: number
}

export interface PriceUpdateResult {
  drinkId: string
  oldPrice: number
  newPrice: number
  logPriceChange: number
  demandSignal: number // Q̃_i,t
  alphaEff: number
  noiseComponent: number
  meanReversionComponent: number
  wasCircuitBreakerActive: boolean
  wasBoundCapped: boolean
}
