import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

// Stock Nest guards work. Read interaction via getContext().
export class DiscordExecutionContext extends ExecutionContextHost {
  static create(args: unknown[]): DiscordExecutionContext {
    const ctx = new DiscordExecutionContext(args);
    return ctx;
  }

  getInteraction<T = unknown>(): T {
    return this.getArgByIndex<T>(0);
  }

  getContext<T = unknown>(): T {
    return this.getInteraction<T>();
  }
}
