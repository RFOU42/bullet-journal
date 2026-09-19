/**
 * The minimal slice of the Artifact runtime this app touches. Everything is
 * optional: when the page runs outside claude.ai, `window.claude` is absent and
 * the app falls back to plain browser behaviour.
 */
interface ClaudeRuntime {
  use?<T = unknown>(name: string): Promise<T | null>;
}

interface Window {
  claude?: ClaudeRuntime;
}
