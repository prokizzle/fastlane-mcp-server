import chalk from 'chalk';

export class Logger {
  private prefix: string;

  constructor(prefix: string = 'Fastlane MCP') {
    this.prefix = prefix;
  }

  info(message: string): void {
    console.log(chalk.blue(`[${this.prefix}] ${message}`));
  }

  success(message: string): void {
    console.log(chalk.green(`[${this.prefix}] ✓ ${message}`));
  }

  warning(message: string): void {
    console.log(chalk.yellow(`[${this.prefix}] ⚠ ${message}`));
  }

  error(message: string): void {
    console.error(chalk.red(`[${this.prefix}] ✗ ${message}`));
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray(`[${this.prefix}] ${message}`));
    }
  }
}

export const logger = new Logger();
