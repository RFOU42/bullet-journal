import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// @testing-library/react's auto-cleanup only self-registers for Jest/Mocha;
// under Vitest it has to be wired explicitly, or DOM from one test leaks
// into the next (several tests rendering the same probe component would
// otherwise collide on ambiguous queries like getByTestId).
afterEach(() => cleanup());
