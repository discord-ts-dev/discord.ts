export interface DailyAt {
  hour: number;
  minute?: number;
  timeZone?: string;
}

export interface TaskDef {
  name: string;
  everyMs?: number;
  dailyAt?: DailyAt;
  jitterMs?: number;
  run: () => void | Promise<void>;
}

export function defineTask(def: TaskDef): TaskDef {
  return def;
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts['year']),
    Number(parts['month']) - 1,
    Number(parts['day']),
    Number(parts['hour']) === 24 ? 0 : Number(parts['hour']),
    Number(parts['minute']),
    Number(parts['second']),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function msUntilDaily(now: Date, at: DailyAt): number {
  const timeZone = at.timeZone ?? 'UTC';
  const minute = at.minute ?? 0;
  const tzNow = now.getTime() + tzOffsetMs(now, timeZone);
  const dayStart = Math.floor(tzNow / 86_400_000) * 86_400_000;
  let target = dayStart + at.hour * 3_600_000 + minute * 60_000;
  if (target <= tzNow) target += 86_400_000;
  return target - tzNow;
}

/** Whole reset windows since epoch in a time zone. For streak math. */
export function dayIndex(now: Date, timeZone: string): number {
  return Math.floor((now.getTime() + tzOffsetMs(now, timeZone)) / 86_400_000);
}

export class TaskRunner {
  private readonly tasks = new Map<string, TaskDef>();
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  private readonly inFlight = new Set<string>();
  private readonly errors = new Map<string, Error>();
  private running = false;

  constructor(tasks: TaskDef[] = []) {
    for (const t of tasks) this.register(t);
  }

  register(task: TaskDef): void {
    if (this.tasks.has(task.name)) throw new Error(`duplicate task: ${task.name}`);
    if (task.everyMs === undefined && task.dailyAt === undefined) {
      throw new Error(`task ${task.name} needs everyMs or dailyAt`);
    }
    this.tasks.set(task.name, task);
    if (this.running) this.schedule(task);
  }

  get names(): string[] {
    return [...this.tasks.keys()];
  }

  getLastError(name: string): Error | null {
    return this.errors.get(name) ?? null;
  }

  async runNow(name: string): Promise<void> {
    const task = this.tasks.get(name);
    if (!task) throw new Error(`unknown task: ${name}`);
    await this.exec(task);
  }

  start(): void {
    this.running = true;
    for (const task of this.tasks.values()) this.schedule(task);
  }

  stop(): void {
    this.running = false;
    for (const t of this.timers.splice(0)) clearTimeout(t);
  }

  private async exec(task: TaskDef): Promise<void> {
    if (this.inFlight.has(task.name)) return;
    this.inFlight.add(task.name);
    try {
      await task.run();
    } catch (err) {
      this.errors.set(task.name, err instanceof Error ? err : new Error(String(err)));
    } finally {
      this.inFlight.delete(task.name);
    }
  }

  private schedule(task: TaskDef): void {
    // ponytail: setTimeout chains, no cron parser. One tick schedules the next.
    const delay =
      task.everyMs !== undefined ? task.everyMs : msUntilDaily(new Date(), task.dailyAt as DailyAt);
    const jitter = task.jitterMs ? Math.random() * task.jitterMs : 0;
    const timer = setTimeout(() => {
      if (!this.running) return;
      void this.exec(task).then(() => {
        if (this.running) this.schedule(task);
      });
    }, delay + jitter);
    // ponytail: unref without node types. Lets a started runner die with
    // the process; stop() still clears timers explicitly.
    (timer as unknown as { unref?: () => void }).unref?.();
    this.timers.push(timer);
  }
}
