import type { ModuleId } from "./types";

export type Route =
  | { name: "page"; page: string }
  | { name: "week" }
  | { name: "customize" }
  | { name: "detail"; module: ModuleId }
  /** Mobile only: the full-screen per-tracker wizard (design 10), opened on a given day at a given tracker. */
  | { name: "wizard"; dayKey: string; step: ModuleId };
