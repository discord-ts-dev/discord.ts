import { SlashCommandBuilder } from 'discord.js';
import type { CommandFlags } from '@discord.ts/common';
import { applyOptions } from './discord-args.js';
import { applyLocalizations, localizedPair } from './discord-localize.js';
import type { CommandDefinition, CommandLeaf } from './command-definition.js';

function applyCommandFlags(
  b: Pick<
    SlashCommandBuilder,
    'setNSFW' | 'setDefaultMemberPermissions' | 'setContexts' | 'setDMPermission'
  >,
  flags: CommandFlags,
): void {
  if (flags.nsfw !== undefined) b.setNSFW(flags.nsfw);
  if (flags.defaultMemberPermissions !== undefined)
    b.setDefaultMemberPermissions(flags.defaultMemberPermissions);
  if (flags.contexts !== undefined) b.setContexts(...flags.contexts);
  if (flags.dmPermission !== undefined) b.setDMPermission(flags.dmPermission);
}

function addSubcommand(parent: SlashCommandBuilder, top: string, leaf: CommandLeaf): void {
  const key = `commands:${top}.subcommands.${leaf.sub}`;
  parent.addSubcommand((sub) => {
    sub.setName(leaf.sub as string).setDescription(leaf.description);
    applyLocalizations(sub, localizedPair(key, leaf.localizations));
    applyOptions(sub as unknown as SlashCommandBuilder, leaf.options, key);
    return sub;
  });
}

/** Slash JSON for one definition. The only place command metadata becomes JSON. */
export function renderCommandDefinition(def: CommandDefinition): unknown {
  const b = new SlashCommandBuilder().setName(def.name).setDescription(def.description);
  applyLocalizations(b, localizedPair(`commands:${def.name}`, def.localizations));
  applyCommandFlags(b, def.flags);
  if (def.plain) applyOptions(b, def.plain.options, `commands:${def.name}`);
  for (const leaf of def.subcommands) addSubcommand(b, def.name, leaf);
  for (const group of def.groups) {
    b.addSubcommandGroup((grp) => {
      grp.setName(group.name).setDescription(group.description);
      applyLocalizations(
        grp,
        localizedPair(`commands:${def.name}.groups.${group.name}`, group.localizations),
      );
      for (const leaf of group.subcommands)
        addSubcommand(grp as unknown as SlashCommandBuilder, def.name, leaf);
      return grp;
    });
  }
  return b.toJSON();
}
