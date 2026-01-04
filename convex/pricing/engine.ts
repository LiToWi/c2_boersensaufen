/**
 * Core Pricing Engine Logic
 * 
 * Implements the tick-based market maker pricing algorithm.
 */

import type {
  MarketRegime,
  PricingConfig,
  DrinkAggregatedDemand,
  PriceUpdateResult,
  REGIME_PARAMS,
  REGIME_TRANSITIONS,
} from './types'
import { DEFAULT_PRICING_CONFIG } from './types'

/**
 * Random number generator (seeded Box-Muller for normal distribution)
 */
export function boxMuller(mean = 0, stdDev = 1): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return z0 * stdDev + mean
}

/**
 * Calculate next regime based on Markov chain
 */
export function transitionRegime(
  currentRegime: MarketRegime,
  transitions: typeof REGIME_TRANSITIONS
): MarketRegime {
  const probs = transitions[currentRegime]
  const rand = Math.random()
  let cumulative = 0
  
  for (const [regime, prob] of Object.entries(probs)) {
    cumulative += prob
    if (rand <= cumulative) {
      return regime as MarketRegime
    }
  }
  
  return currentRegime // fallback
}

/**
 * Calculate smoothed demand signal using Dirichlet smoothing
 * 
 * Q̂_i,t = (B_i,t + λ) / Σ_j(B_j,t + λ)
 */
export function calculateSmoothedDemand(
  drinkDemand: number,
  totalDemand: number,
  numDrinks: number,
  lambda: number
): number {
  const numerator = drinkDemand + lambda
  const denominator = totalDemand + numDrinks * lambda
  return numerator / Math.max(denominator, 1)
}

/**
 * Apply tanh saturation to prevent pump-and-dump
 * 
 * Q̃_i,t = tanh(k · Q̂_i,t)
 */
export function applySaturation(smoothedDemand: number, k: number): number {
  return Math.tanh(k * smoothedDemand)
}

/**
 * Calculate activity-scaled alpha
 * 
 * α_eff = α_R · min(1, Σ_j B_j,t / N_0)
 */
export function calculateAlphaEff(
  alphaR: number,
  totalDemand: number,
  N0: number,
  circuitBreakerActive: boolean,
  reductionFactor: number
): number {
  const activityScale = Math.min(1, totalDemand / N0)
  let alphaEff = alphaR * activityScale
  
  // Apply circuit breaker reduction if active
  if (circuitBreakerActive) {
    alphaEff *= reductionFactor
  }
  
  return alphaEff
}

/**
 * Calculate new log price using the core pricing formula
 * 
 * ln P_i,t+1 = ln P_i,t + α_eff · Q̃_i,t - β · (ln P_i,t - ln F_i) + ε_i,t
 */
export function calculateNewLogPrice(
  currentLogPrice: number,
  fundamentalLogPrice: number,
  saturatedDemand: number,
  alphaEff: number,
  beta: number,
  noise: number
): number {
  const demandImpact = alphaEff * saturatedDemand
  const meanReversion = -beta * (currentLogPrice - fundamentalLogPrice)
  
  return currentLogPrice + demandImpact + meanReversion + noise
}

/**
 * Apply hard bounds and circuit breaker constraints
 */
export function applyBounds(
  newPrice: number,
  oldPrice: number,
  fundamentalPrice: number,
  config: PricingConfig
): { boundedPrice: number; wasCapped: boolean } {
  let boundedPrice = newPrice
  let wasCapped = false
  
  // Hard bounds relative to fundamental price
  const lowerBound = fundamentalPrice * config.lowerBoundMultiplier
  const upperBound = fundamentalPrice * config.upperBoundMultiplier
  
  if (boundedPrice < lowerBound) {
    boundedPrice = lowerBound
    wasCapped = true
  } else if (boundedPrice > upperBound) {
    boundedPrice = upperBound
    wasCapped = true
  }
  
  // Maximum jump constraint
  const maxChange = oldPrice * config.maxJumpPercent
  const actualChange = boundedPrice - oldPrice
  
  if (Math.abs(actualChange) > maxChange) {
    boundedPrice = oldPrice + Math.sign(actualChange) * maxChange
    wasCapped = true
  }
  
  return { boundedPrice, wasCapped }
}

/**
 * Check if a price change constitutes a "large jump" for circuit breaker
 */
export function isLargeJump(
  oldPrice: number,
  newPrice: number,
  threshold: number
): boolean {
  const relativeChange = Math.abs((newPrice - oldPrice) / oldPrice)
  return relativeChange >= threshold
}

/**
 * Main pricing update function for a single drink
 */
export function updateDrinkPrice(params: {
  drinkId: string
  currentLogPrice: number
  fundamentalPrice: number
  demandQuantity: number
  totalDemand: number
  numDrinks: number
  regime: MarketRegime
  regimeParams: typeof REGIME_PARAMS
  config: PricingConfig
  circuitBreakerActive: boolean
  oldPrice: number
}): PriceUpdateResult {
  const {
    drinkId,
    currentLogPrice,
    fundamentalPrice,
    demandQuantity,
    totalDemand,
    numDrinks,
    regime,
    regimeParams,
    config,
    circuitBreakerActive,
    oldPrice,
  } = params

  const fundamentalLogPrice = Math.log(fundamentalPrice)
  
  // Step 1: Smooth demand with Dirichlet
  const smoothedDemand = calculateSmoothedDemand(
    demandQuantity,
    totalDemand,
    numDrinks,
    config.lambda
  )
  
  // Step 2: Apply tanh saturation
  const saturatedDemand = applySaturation(smoothedDemand, config.k)
  
  // Step 3: Calculate activity-scaled alpha
  const alphaR = regimeParams[regime].alphaR
  const alphaEff = calculateAlphaEff(
    alphaR,
    totalDemand,
    config.N0,
    circuitBreakerActive,
    config.volatilityReductionFactor
  )
  
  // Step 4: Generate noise
  const noiseStdDev = regimeParams[regime].noiseStdDev
  const noise = boxMuller(0, noiseStdDev)
  
  // Step 5: Calculate new log price
  const newLogPrice = calculateNewLogPrice(
    currentLogPrice,
    fundamentalLogPrice,
    saturatedDemand,
    alphaEff,
    config.beta,
    noise
  )
  
  // Step 6: Convert back to regular price
  let newPrice = Math.exp(newLogPrice)
  
  // Step 7: Apply bounds
  const { boundedPrice, wasCapped } = applyBounds(
    newPrice,
    oldPrice,
    fundamentalPrice,
    config
  )
  
  newPrice = boundedPrice
  const finalLogPrice = Math.log(newPrice)
  
  return {
    drinkId,
    oldPrice,
    newPrice,
    logPriceChange: finalLogPrice - currentLogPrice,
    demandSignal: saturatedDemand,
    alphaEff,
    noiseComponent: noise,
    meanReversionComponent: -config.beta * (currentLogPrice - fundamentalLogPrice),
    wasCircuitBreakerActive: circuitBreakerActive,
    wasBoundCapped: wasCapped,
  }
}

/**
 * Aggregate orders by drink, applying per-user impact caps
 */
export function aggregateTickOrders(
  orders: Array<{
    drinkId: string
    userId: string
    quantity: number
  }>,
  maxImpactPerUser: number
): Map<string, DrinkAggregatedDemand> {
  const drinkMap = new Map<string, DrinkAggregatedDemand>()
  const userDrinkImpact = new Map<string, Map<string, number>>() // userId -> drinkId -> impact
  
  // First pass: track per-user, per-drink quantities
  for (const order of orders) {
    const { drinkId, userId, quantity } = order
    
    if (!drinkMap.has(drinkId)) {
      drinkMap.set(drinkId, {
        drinkId,
        totalQuantity: 0,
        impactQuantity: 0,
        uniqueUsers: 0,
      })
    }
    
    if (!userDrinkImpact.has(userId)) {
      userDrinkImpact.set(userId, new Map())
    }
    
    const userMap = userDrinkImpact.get(userId)!
    const currentImpact = userMap.get(drinkId) || 0
    userMap.set(drinkId, currentImpact + quantity)
    
    const demand = drinkMap.get(drinkId)!
    demand.totalQuantity += quantity
  }
  
  // Second pass: calculate capped impact
  for (const [userId, userMap] of userDrinkImpact.entries()) {
    for (const [drinkId, quantity] of userMap.entries()) {
      const cappedQuantity = Math.min(quantity, maxImpactPerUser)
      const demand = drinkMap.get(drinkId)!
      demand.impactQuantity += cappedQuantity
      demand.uniqueUsers += 1
    }
  }
  
  return drinkMap
}
