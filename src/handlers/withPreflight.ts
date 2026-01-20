import { runPreflight, PreflightContext, formatValidationResult } from '../validators/index.js';

type HandlerResult = { content: Array<{ type: string; text: string }> };
type Handler<T> = (args: T) => Promise<HandlerResult>;

export function withPreflight<T>(
  handler: Handler<T>,
  getContext: (args: T) => PreflightContext
): Handler<T> {
  return async (args: T): Promise<HandlerResult> => {
    const context = getContext(args);
    const preflight = await runPreflight(context);

    if (!preflight.valid) {
      return {
        content: [{
          type: 'text',
          text: `Pre-flight checks failed:\n\n${formatValidationResult(preflight)}`,
        }],
      };
    }

    // Log warnings if any
    if (preflight.issues.length > 0) {
      const warnings = formatValidationResult(preflight);
      // Will be logged to stderr
      process.stderr.write(`Pre-flight warnings:\n${warnings}\n`);
    }

    return handler(args);
  };
}
