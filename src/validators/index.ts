export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface PreflightContext {
  projectPath?: string;
  platform?: 'ios' | 'android';
  lane?: string;
  requiredEnvVars?: string[];
  requiredTools?: string[];
}

export async function runPreflight(context: PreflightContext): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // Run all validators
  const { validateEnvironment } = await import('./environment.js');
  const { validateProject } = await import('./project.js');
  const { validateTools } = await import('./tools.js');

  if (context.requiredEnvVars?.length) {
    const envResult = validateEnvironment(context.requiredEnvVars);
    issues.push(...envResult.issues);
  }

  if (context.projectPath) {
    const projectResult = await validateProject(context.projectPath, context.platform, context.lane);
    issues.push(...projectResult.issues);
  }

  if (context.requiredTools?.length) {
    const toolsResult = await validateTools(context.requiredTools);
    issues.push(...toolsResult.issues);
  }

  const hasErrors = issues.some(i => i.level === 'error');

  return {
    valid: !hasErrors,
    issues,
  };
}

export function formatValidationResult(result: ValidationResult): string {
  if (result.valid && result.issues.length === 0) {
    return 'Pre-flight checks passed';
  }

  const lines: string[] = [];

  const errors = result.issues.filter(i => i.level === 'error');
  const warnings = result.issues.filter(i => i.level === 'warning');

  if (errors.length > 0) {
    lines.push('Errors:');
    for (const issue of errors) {
      lines.push(`  [x] ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`    -> ${issue.suggestion}`);
      }
    }
  }

  if (warnings.length > 0) {
    lines.push('Warnings:');
    for (const issue of warnings) {
      lines.push(`  [!] ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`    -> ${issue.suggestion}`);
      }
    }
  }

  return lines.join('\n');
}
