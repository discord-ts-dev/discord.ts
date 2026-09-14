import { SetMetadata } from '../di.js';
import type { Events } from 'discord.js';
import { ON_EVENT_METADATA } from '../constants.js';

export const OnEvent = (event: Events | string): MethodDecorator =>
  SetMetadata(ON_EVENT_METADATA, { event, once: false });

export const OnceEvent = (event: Events | string): MethodDecorator =>
  SetMetadata(ON_EVENT_METADATA, { event, once: true });
