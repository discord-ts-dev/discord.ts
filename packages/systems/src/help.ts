export interface HelpCommand {
  name: string;
  description: string;
  category?: string;
}

export interface HelpSection {
  category: string;
  commands: HelpCommand[];
}

export function buildHelp(commands: HelpCommand[]): HelpSection[] {
  const groups = new Map<string, HelpCommand[]>();
  for (const cmd of [...commands].sort((a, b) => a.name.localeCompare(b.name))) {
    const category = cmd.category ?? 'General';
    groups.set(category, [...(groups.get(category) ?? []), cmd]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === 'General' ? 1 : b === 'General' ? -1 : a.localeCompare(b)))
    .map(([category, cmds]) => ({ category, commands: cmds }));
}

/** Registry-shaped entry, structurally compatible with core's `HelpEntry`; no core dep. */
export interface RegistryHelpEntry {
  name: string;
  description: string;
  category?: string;
  descriptionLocalizations?: Record<string, string | null | undefined>;
  toggleable: boolean;
}

/** Group registry entries into help sections, resolving one locale's descriptions. */
export function buildHelpFromRegistry(
  entries: readonly RegistryHelpEntry[],
  opts: { locale?: string } = {},
): HelpSection[] {
  return buildHelp(
    entries.map((entry) => ({
      name: entry.name,
      description: entry.descriptionLocalizations?.[opts.locale ?? ''] ?? entry.description,
      category: entry.category,
    })),
  );
}

/** Names of toggleable entries, sorted — the feed for enable/disable choice sources. */
export function toggleableNames(entries: readonly RegistryHelpEntry[]): string[] {
  return entries
    .filter((entry) => entry.toggleable)
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
