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
