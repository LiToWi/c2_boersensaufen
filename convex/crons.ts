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

// Execute pricing tick every 15 seconds
crons.interval(
  'pricing-tick',
  { seconds: 15 },
  internal.pricingTick.executePricingTick
)

export default crons
