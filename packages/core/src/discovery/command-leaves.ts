import type { CommandDefinition, CommandLeaf } from './command-definition.js';

export function commandLeaves(def: CommandDefinition): CommandLeaf[] {
  return [
    ...(def.plain ? [def.plain] : []),
    ...def.subcommands,
    ...def.groups.flatMap((g) => g.subcommands),
  ];
}

/**
 * Resolve the leaf a Discord call addresses. Grouped subs win; then a direct
 * subcommand with the same name answers when no group was sent; then the plain
 * handler.
 */
export function matchCommandLeaf(
  def: CommandDefinition,
  group: string | null,
  sub: string | null,
): CommandLeaf | null {
  if (!sub) return def.plain ?? null;
  if (group) {
    const grouped = def.groups
      .find((g) => g.name === group)
      ?.subcommands.find((l) => l.sub === sub);
    if (grouped) return grouped;
  }
  return def.subcommands.find((l) => l.sub === sub) ?? null;
}
