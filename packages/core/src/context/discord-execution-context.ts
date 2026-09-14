type HandlerFn = (...args: never[]) => unknown;
type ClassRef = new (...args: never[]) => unknown;

export interface ExecutionContext {
  getHandler(): HandlerFn;
  getClass(): ClassRef;
  getArgByIndex<T = unknown>(index: number): T;
  getArgs(): unknown[];
}

// Standalone context. No Nest dep. Reads interaction via getContext().
export class DiscordExecutionContext implements ExecutionContext {
  private constructor(
    private readonly args: unknown[],
    private readonly handlerFn: HandlerFn,
    private readonly classRef: ClassRef,
  ) {}

  static create(
    args: unknown[],
    handlerFn?: HandlerFn,
    classRef?: ClassRef,
  ): DiscordExecutionContext {
    const noop = (() => {}) as unknown as HandlerFn;
    const empty = Object as unknown as ClassRef;
    return new DiscordExecutionContext(args, handlerFn ?? noop, classRef ?? empty);
  }

  getHandler(): HandlerFn {
    return this.handlerFn;
  }

  getClass(): ClassRef {
    return this.classRef;
  }

  getArgByIndex<T = unknown>(index: number): T {
    return this.args[index] as T;
  }

  getArgs(): unknown[] {
    return this.args;
  }

  getInteraction<T = unknown>(): T {
    return this.getArgByIndex<T>(0);
  }

  getContext<T = unknown>(): T {
    return this.getInteraction<T>();
  }
}
