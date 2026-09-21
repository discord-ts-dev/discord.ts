import {
  COMMAND_GROUP_METADATA,
  COMMAND_METADATA,
  PARAM_OPTIONS_METADATA,
  SUBCOMMAND_METADATA,
  type CommandFlags,
  type CommandGroupMeta,
  type CommandMeta,
  type SubcommandMeta,
} from '@discord.ts/common';
import type { LocalizationMap } from 'discord.js';
import { explicitPair } from './discord-localize.js';
import type { Handler, LocalizationPair } from './handler.types.js';

/** One callable handler inside a top-level command. */
export interface CommandLeaf extends Handler {
  /** Subcommand name. Absent on the plain handler of a top-level command. */
  sub?: string;
  /** Subcommand group name. Absent unless the leaf sits in a group. */
  group?: string;
  description: string;
  localizations?: LocalizationPair;
  /** Group facts, carried by every leaf in a group; the first leaf wins. */
  groupDescription?: string;
  groupLocalizations?: LocalizationPair;
  /** Options DTO from `@Options()`, resolved once at build time. */
  options?: new () => object;
}

export interface CommandGroupDefinition {
  name: string;
  description: string;
  localizations?: LocalizationPair;
  subcommands: CommandLeaf[];
}

/** Registry digest of one top-level command for help rendering and enable/disable feeds. */
export interface HelpEntry {
  name: string;
  description: string;
  category?: string;
  /** Explicit metadata merged with the i18n catalog. */
  descriptionLocalizations?: LocalizationMap;
  toggleable: boolean;
}

/**
 * One top-level slash command. `plain`, `subcommands`, and `groups` are
 * mutually exclusive once valid; the builder records structural conflicts in
 * `issues` so boot Validation can still report everything at once.
 */
export interface CommandDefinition {
  name: string;
  description: string;
  localizations?: LocalizationPair;
  flags: CommandFlags;
  /** Help grouping label from top-level metadata. */
  category?: string;
  /** Guilds may switch this command off, whole. From top-level metadata. */
  toggleable?: boolean;
  plain?: CommandLeaf;
  subcommands: CommandLeaf[];
  groups: CommandGroupDefinition[];
  issues: string[];
  /** Non-fatal findings from the builder, logged at boot. */
  warnings?: string[];
}

function who(h: Handler): string {
  return `${h.instance.constructor.name}.${h.method}`;
}

function label(name: string, leaf: { group?: string; sub?: string }): string {
  return `/${name}${leaf.group ? ` ${leaf.group}` : ''}${leaf.sub ? ` ${leaf.sub}` : ''}`;
}

function commandFlags(meta: CommandFlags): CommandFlags {
  const flags: CommandFlags = {};
  if (meta.nsfw !== undefined) flags.nsfw = meta.nsfw;
  if (meta.defaultMemberPermissions !== undefined)
    flags.defaultMemberPermissions = meta.defaultMemberPermissions;
  if (meta.contexts !== undefined) flags.contexts = meta.contexts;
  if (meta.dmPermission !== undefined) flags.dmPermission = meta.dmPermission;
  return flags;
}

function flagsKey(flags: CommandFlags): string {
  const perms =
    typeof flags.defaultMemberPermissions === 'bigint'
      ? flags.defaultMemberPermissions.toString()
      : JSON.stringify(flags.defaultMemberPermissions ?? null);
  return `${flags.nsfw ?? null}|${perms}|${JSON.stringify(flags.contexts ?? null)}|${flags.dmPermission ?? null}`;
}

function optionsDto(h: Handler): (new () => object) | undefined {
  const fn = h.instance[h.method] as (...a: never[]) => unknown;
  const idxs: number[] = Reflect.getMetadata(PARAM_OPTIONS_METADATA, fn) ?? [];
  if (!idxs.length) return undefined;
  const types: unknown[] = Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
  return types[idxs[0]] as new () => object;
}

function strayHelpFields(meta: object): boolean {
  const m = meta as { category?: unknown; toggleable?: unknown };
  return m.category !== undefined || m.toggleable !== undefined;
}

interface Draft {
  top: string;
  topDescription: string;
  topLocalizations?: LocalizationPair;
  topCategory?: string;
  topToggleable?: boolean;
  flags: CommandFlags;
  leaf: CommandLeaf;
  warnings?: string[];
}

function draftsOf(instances: object[]): Draft[] {
  const drafts: Draft[] = [];
  for (const instance of instances) {
    if (!instance || typeof instance !== 'object') continue;
    const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
    if (!proto) continue;
    const names = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor');
    const group = Reflect.getMetadata(COMMAND_GROUP_METADATA, instance.constructor) as
      | CommandGroupMeta
      | undefined;
    for (const name of names) {
      const fn = (instance as Record<string, (...a: never[]) => unknown>)[name];
      if (typeof fn !== 'function') continue;
      const base = { instance, method: name } as Handler;
      const options = optionsDto(base);
      const cmd = Reflect.getMetadata(COMMAND_METADATA, fn) as CommandMeta | undefined;
      const sub = Reflect.getMetadata(SUBCOMMAND_METADATA, fn) as SubcommandMeta | undefined;
      const methodGroup = Reflect.getMetadata(COMMAND_GROUP_METADATA, fn) as
        | Partial<CommandGroupMeta>
        | undefined;
      if (cmd && !sub) {
        drafts.push({
          top: cmd.name,
          topDescription: cmd.description,
          topLocalizations: explicitPair(cmd),
          topCategory: cmd.category,
          topToggleable: cmd.toggleable,
          flags: commandFlags(cmd),
          leaf: { ...base, description: cmd.description, options },
        });
      } else if (sub && (group ?? methodGroup)) {
        const warns: string[] = [];
        if (group && (methodGroup?.category !== undefined || methodGroup?.toggleable !== undefined))
          warns.push(
            `${who(base)}: /${group.name} ${methodGroup?.name} sets category/toggleable on a sub-group; only the top level applies`,
          );
        if (strayHelpFields(sub))
          warns.push(
            `${who(base)}: /${group?.name ?? cmd?.name ?? methodGroup?.name ?? sub.name} ${sub.name} sets category/toggleable on a subcommand; only the top level applies`,
          );
        drafts.push({
          top: group?.name ?? cmd?.name ?? methodGroup?.name ?? sub.name,
          topDescription: group?.description ?? cmd?.description ?? sub.description,
          topCategory: (group ?? cmd ?? methodGroup)?.category,
          topToggleable: (group ?? cmd ?? methodGroup)?.toggleable,
          warnings: warns.length ? warns : undefined,
          topLocalizations: group
            ? explicitPair(group)
            : cmd
              ? explicitPair(cmd)
              : methodGroup
                ? {
                    name: methodGroup.nameLocalizations,
                    description: sub.descriptionLocalizations,
                  }
                : explicitPair(sub),
          flags: cmd ? commandFlags(cmd) : {},
          leaf: {
            ...base,
            sub: sub.name,
            group: group && methodGroup ? methodGroup.name : undefined,
            description: sub.description,
            localizations: explicitPair(sub),
            groupDescription: group?.description,
            groupLocalizations:
              group && methodGroup
                ? {
                    name: methodGroup.nameLocalizations,
                    description: group.descriptionLocalizations,
                  }
                : undefined,
            options,
          },
        });
      } else if (sub && cmd) {
        drafts.push({
          top: cmd.name,
          topDescription: cmd.description,
          topLocalizations: explicitPair(cmd),
          topCategory: cmd.category,
          topToggleable: cmd.toggleable,
          warnings: strayHelpFields(sub)
            ? [
                `${who(base)}: /${cmd.name} ${sub.name} sets category/toggleable on a subcommand; only the top level applies`,
              ]
            : undefined,
          flags: commandFlags(cmd),
          leaf: {
            ...base,
            sub: sub.name,
            description: sub.description,
            localizations: explicitPair(sub),
            options,
          },
        });
      }
    }
  }
  return drafts;
}

/** Translate provider instances into one definition per top-level command. */
export function buildCommandDefinitions(instances: object[]): CommandDefinition[] {
  const byTop = new Map<string, Draft[]>();
  for (const draft of draftsOf(instances))
    byTop.set(draft.top, [...(byTop.get(draft.top) ?? []), draft]);

  const definitions: CommandDefinition[] = [];
  for (const [name, drafts] of byTop) {
    const first = drafts[0] as Draft;
    const warnings = drafts.flatMap((d) => d.warnings ?? []);
    const def: CommandDefinition = {
      name,
      description: first.topDescription,
      localizations: first.topLocalizations,
      flags: first.flags,
      category: first.topCategory,
      toggleable: first.topToggleable,
      subcommands: [],
      groups: [],
      issues: [],
      ...(warnings.length ? { warnings } : {}),
    };
    const plains: CommandLeaf[] = [];
    const seen = new Map<string, string>();
    const groupNames = new Map<string, CommandGroupDefinition>();
    for (const draft of drafts) {
      const leaf = draft.leaf;
      const key = `${leaf.group ?? ''}\u0000${leaf.sub ?? ''}`;
      const owner = seen.get(key);
      if (owner) def.issues.push(`${who(leaf)}: duplicate ${label(name, leaf)} (also in ${owner})`);
      else seen.set(key, who(leaf));
      if (flagsKey(draft.flags) !== flagsKey(def.flags))
        def.issues.push(`${who(leaf)}: /${name} mixes command flags with another entry`);
      if (!leaf.sub) {
        plains.push(leaf);
        continue;
      }
      if (leaf.group) {
        let groupDef = groupNames.get(leaf.group);
        if (!groupDef) {
          groupDef = {
            name: leaf.group,
            description: leaf.groupDescription ?? leaf.group,
            localizations: leaf.groupLocalizations,
            subcommands: [],
          };
          groupNames.set(leaf.group, groupDef);
        }
        groupDef.subcommands.push(leaf);
        continue;
      }
      def.subcommands.push(leaf);
    }
    def.groups = [...groupNames.values()];
    def.plain = plains[0];
    if (def.plain && (def.subcommands.length || def.groups.length))
      def.issues.push(`/${name} mixes a plain command with subcommands`);
    definitions.push(def);
  }
  return definitions;
}

export { commandLeaves, matchCommandLeaf } from './command-leaves.js';

/** Slash JSON for one definition. Re-exported; rendering lives in command-render.ts. */
export { renderCommandDefinition } from './command-render.js';
