/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as history from "../history.js";
import type * as recurringTasks from "../recurringTasks.js";
import type * as tasks from "../tasks.js";
import type * as userSettings from "../userSettings.js";
import type * as weekManager from "../weekManager.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  history: typeof history;
  recurringTasks: typeof recurringTasks;
  tasks: typeof tasks;
  userSettings: typeof userSettings;
  weekManager: typeof weekManager;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
