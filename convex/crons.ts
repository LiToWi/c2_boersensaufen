/**
 * Convex Cron Configuration
 * 
 * Schedules the pricing tick to run every 15 seconds.
 * 
 * To enable: Add this file as convex/crons.ts
 */

import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Execute pricing tick every 10 seconds
crons.interval(
  'pricing-tick',
  { seconds: 10 },
  internal.pricingTick.executePricingTick
)

// Clean up expired basket items every 30 seconds
crons.interval(
  'cleanup-expired-items',
  { seconds: 30 },
  internal.drinks.cleanupExpiredItems
)

export default crons
