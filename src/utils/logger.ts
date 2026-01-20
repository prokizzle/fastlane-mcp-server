import chalk from 'chalk';

export class Logger {
  private prefix: string;

  constructor(prefix: string = 'Fastlane MCP') {
    this.prefix = prefix;
  }

  private writeToStderr(message: string): void {
    process.stderr.write(message + '\n');
  }

  info(message: string): void {
    this.writeToStderr(chalk.blue(`[${this.prefix}] ${message}`));
  }

  success(message: string): void {
    this.writeToStderr(chalk.green(`[${this.prefix}] ✓ ${message}`));
  }

  warning(message: string): void {
    this.writeToStderr(chalk.yellow(`[${this.prefix}] ⚠ ${message}`));
  }

  error(message: string): void {
    this.writeToStderr(chalk.red(`[${this.prefix}] ✗ ${message}`));
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      this.writeToStderr(chalk.gray(`[${this.prefix}] ${message}`));
    }
  }
}

export const logger = new Logger();
