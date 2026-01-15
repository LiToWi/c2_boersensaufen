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

// Execute pricing tick every 30 seconds
crons.interval(
  'pricing-tick',
  { seconds: 30 },
  internal.pricingTick.executePricingTick
)

// Clean up expired basket items every 30 seconds
crons.interval(
  'cleanup-expired-items',
  { seconds: 30 },
  internal.drinks.cleanupExpiredItems
)

// Downsample old price snapshots every 15 minutes to save storage
crons.interval(
  'downsample-snapshots',
  { seconds: 15 * 60 }, // Every 15 minutes
  internal.snapshots.downsampleOldSnapshots
)

// Trigger next market event every 15 minutes (when market is active)
crons.interval(
  'trigger-events',
  { seconds: 15 * 60 }, // Every 15 minutes
  internal.events.triggerNextEvent
)

export default crons
