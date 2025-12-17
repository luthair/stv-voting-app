/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ballots from "../ballots.js";
import type * as candidates from "../candidates.js";
import type * as crons from "../crons.js";
import type * as cycles from "../cycles.js";
import type * as discord from "../discord.js";
import type * as eligibility from "../eligibility.js";
import type * as nominations from "../nominations.js";
import type * as questions from "../questions.js";
import type * as results from "../results.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ballots: typeof ballots;
  candidates: typeof candidates;
  crons: typeof crons;
  cycles: typeof cycles;
  discord: typeof discord;
  eligibility: typeof eligibility;
  nominations: typeof nominations;
  questions: typeof questions;
  results: typeof results;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
