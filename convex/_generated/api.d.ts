/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_backfillCapacity from "../actions/backfillCapacity.js";
import type * as actions_removeExcludedReady2Order from "../actions/removeExcludedReady2Order.js";
import type * as actions_syncReady2Order from "../actions/syncReady2Order.js";
import type * as adminActions from "../adminActions.js";
import type * as adminMutations from "../adminMutations.js";
import type * as adminQueries from "../adminQueries.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as drinks from "../drinks.js";
import type * as internal_syncMutations from "../internal/syncMutations.js";
import type * as parties from "../parties.js";
import type * as partyMembers from "../partyMembers.js";
import type * as pricing_engine from "../pricing/engine.js";
import type * as pricing_types from "../pricing/types.js";
import type * as pricingTick from "../pricingTick.js";
import type * as r2oCreateTable from "../r2oCreateTable.js";
import type * as r2oMutations from "../r2oMutations.js";
import type * as r2oQueries from "../r2oQueries.js";
import type * as r2oSubmitOrder from "../r2oSubmitOrder.js";
import type * as snapshots from "../snapshots.js";
import type * as tables from "../tables.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/backfillCapacity": typeof actions_backfillCapacity;
  "actions/removeExcludedReady2Order": typeof actions_removeExcludedReady2Order;
  "actions/syncReady2Order": typeof actions_syncReady2Order;
  adminActions: typeof adminActions;
  adminMutations: typeof adminMutations;
  adminQueries: typeof adminQueries;
  categories: typeof categories;
  crons: typeof crons;
  drinks: typeof drinks;
  "internal/syncMutations": typeof internal_syncMutations;
  parties: typeof parties;
  partyMembers: typeof partyMembers;
  "pricing/engine": typeof pricing_engine;
  "pricing/types": typeof pricing_types;
  pricingTick: typeof pricingTick;
  r2oCreateTable: typeof r2oCreateTable;
  r2oMutations: typeof r2oMutations;
  r2oQueries: typeof r2oQueries;
  r2oSubmitOrder: typeof r2oSubmitOrder;
  snapshots: typeof snapshots;
  tables: typeof tables;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
