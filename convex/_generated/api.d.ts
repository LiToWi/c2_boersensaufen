/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_removeExcludedReady2Order from "../actions/removeExcludedReady2Order.js";
import type * as actions_syncReady2Order from "../actions/syncReady2Order.js";
import type * as categories from "../categories.js";
import type * as drinks from "../drinks.js";
import type * as internal_syncMutations from "../internal/syncMutations.js";
import type * as parties from "../parties.js";
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
  "actions/removeExcludedReady2Order": typeof actions_removeExcludedReady2Order;
  "actions/syncReady2Order": typeof actions_syncReady2Order;
  categories: typeof categories;
  drinks: typeof drinks;
  "internal/syncMutations": typeof internal_syncMutations;
  parties: typeof parties;
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
