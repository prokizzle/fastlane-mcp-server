import { ERROR_PATTERNS, ErrorPattern } from './patterns.js';

export interface DiagnosedError {
  originalError: string;
  matched: boolean;
  pattern?: ErrorPattern;
  message: string;
  diagnosis: string;
  suggestions: string[];
}

export function diagnoseError(errorOutput: string): DiagnosedError {
  // Try to match against known patterns
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(errorOutput)) {
      return {
        originalError: errorOutput,
        matched: true,
        pattern,
        message: pattern.message,
        diagnosis: pattern.diagnosis,
        suggestions: pattern.suggestions,
      };
    }
  }

  // No match - return generic response with original error
  return {
    originalError: errorOutput,
    matched: false,
    message: 'Build or command failed',
    diagnosis: 'An unrecognized error occurred',
    suggestions: [
      'Check the full error output below for details',
      'Search for the error message online',
      'Check fastlane troubleshooting docs',
    ],
  };
}

export function formatDiagnosedError(diagnosed: DiagnosedError): string {
  const lines: string[] = [];

  lines.push(`Error: ${diagnosed.message}`);
  lines.push('');
  lines.push(`Diagnosis: ${diagnosed.diagnosis}`);
  lines.push('');
  lines.push('Suggestions:');
  for (const suggestion of diagnosed.suggestions) {
    lines.push(`  -> ${suggestion}`);
  }

  if (!diagnosed.matched || process.env.DEBUG) {
    lines.push('');
    lines.push('Full error output:');
    lines.push(diagnosed.originalError);
  }

  return lines.join('\n');
}
