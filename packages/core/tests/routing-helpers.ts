import { Events } from 'discord.js';
import { DiscordRoutingService } from '../src/discovery/discord-routing.service.js';
import type { DiscordDiscoveryService } from '../src/discovery/discord-discovery.service.js';
import type { Handler } from '../src/discovery/handler.types.js';

export interface Harness {
  routing: DiscordRoutingService;
  calls: string[];
  handlers: Map<string, Array<(...a: unknown[]) => unknown>>;
  discovery: Record<string, unknown[]>;
  seen: unknown[][];
}

export function setup(
  opts: {
    guards?: Map<unknown, { canActivate(ctx: unknown): unknown }>;
    pipes?: Map<unknown, { transform(v: unknown, m: unknown): unknown }>;
  } = {},
): Harness {
  const calls: string[] = [];
  const seen: unknown[][] = [];
  const handlers = new Map<string, Array<(...a: unknown[]) => unknown>>();
  const discovery: Record<string, unknown[]> = {
    slash: [],
    menus: [],
    buttons: [],
    selects: [],
    modals: [],
    autocompletes: [],
    events: [],
    prefix: [],
  };
  const client = {
    on(event: string, fn: (...a: unknown[]) => unknown) {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
    },
    once(event: string, fn: (...a: unknown[]) => unknown) {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
    },
  };
  const routing = new DiscordRoutingService(
    client as never,
    { prefix: '!', intl: undefined, i18n: undefined } as never,
    discovery as never as DiscordDiscoveryService,
    opts.guards ?? new Map(),
    opts.pipes ?? new Map(),
  );
  return { routing, calls, handlers, discovery, seen };
}

export const loose = (dec: unknown): ((target: object) => void) => dec as (target: object) => void;

export function onMethod(handler: Handler, dec: unknown): void {
  loose(dec)((handler.instance as Record<string, object>)[handler.method] as object);
}

export function handlerFor(h: Harness, name: string, fn?: (...a: unknown[]) => unknown): Handler {
  const instance = {
    [name]: (...args: unknown[]) => {
      h.calls.push(name);
      h.seen.push(args);
      return fn ? fn(...args) : undefined;
    },
  };
  return { instance: instance as never, method: name };
}

export async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export const MESSAGE_CREATE = Events.MessageCreate;
export const INTERACTION_CREATE = Events.InteractionCreate;
