import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import {
  Command,
  Options,
  StringOption,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';
import {
  buildCommandDefinitions,
  commandLeaves,
  matchCommandLeaf,
  renderCommandDefinition,
  type CommandDefinition,
} from '../src/discovery/command-definition.js';

function apply(decorator: MethodDecorator, proto: object, name: string): void {
  decorator(proto, name, Object.getOwnPropertyDescriptor(proto, name) as PropertyDescriptor);
}

class SearchDto {
  @StringOption({ name: 'q', description: 'Query', required: false })
  q?: string;
}

const QuestGroup = createCommandGroupDecorator({ name: 'quest', description: 'Quests' });
const DailyGroup = createCommandGroupDecorator({ name: 'daily', description: 'Daily' });

class Ping {
  run(): void {}
}

class Quest {
  reroll(): void {}
  lock(): void {}
}

apply(Command({ name: 'ping', description: 'Pong' }), Ping.prototype, 'run');
(QuestGroup() as ClassDecorator)(Quest);
apply(Subcommand({ name: 'reroll', description: 'Reroll' }), Quest.prototype, 'reroll');
apply(DailyGroup() as MethodDecorator, Quest.prototype, 'lock');
apply(Subcommand({ name: 'lock', description: 'Lock' }), Quest.prototype, 'lock');

function build(): CommandDefinition[] {
  return buildCommandDefinitions([new Ping(), new Quest()]);
}

describe('buildCommandDefinitions', () => {
  test('groups a plain command, a direct subcommand and a grouped subcommand', () => {
    const definitions = build();
    assert.deepEqual(
      definitions.map((d) => d.name),
      ['ping', 'quest'],
    );
    assert.equal(definitions[0]?.plain?.method, 'run');
    assert.equal(definitions[1]?.plain, undefined);
    assert.deepEqual(
      definitions[1]?.subcommands.map((l) => l.sub),
      ['reroll'],
    );
    assert.deepEqual(
      definitions[1]?.groups.map((g) => g.name),
      ['daily'],
    );
  });

  test('records duplicates, flag drift, and plain/sub mixing as issues', () => {
    class Messy {
      plain(): void {}
      alsoPlain(): void {}
      mixedPlain(): void {}
      mixedSub(): void {}
    }
    apply(Command({ name: 'dup', description: 'Dup' }), Messy.prototype, 'plain');
    apply(Command({ name: 'dup', description: 'Dup' }), Messy.prototype, 'alsoPlain');
    apply(Command({ name: 'mixed', description: 'Mixed' }), Messy.prototype, 'mixedPlain');
    apply(Command({ name: 'mixed', description: 'Mixed' }), Messy.prototype, 'mixedSub');
    apply(Subcommand({ name: 'sub', description: 'Sub' }), Messy.prototype, 'mixedSub');

    class Drift {
      one(): void {}
      two(): void {}
    }
    apply(
      Command({ name: 'drift', description: 'Drift', defaultMemberPermissions: 8n }),
      Drift.prototype,
      'one',
    );
    apply(
      Command({ name: 'drift', description: 'Drift', defaultMemberPermissions: '8' }),
      Drift.prototype,
      'two',
    );

    const issues = buildCommandDefinitions([new Messy(), new Drift()]).flatMap((d) => d.issues);
    assert.ok(issues.some((i) => i.includes('duplicate /dup')));
    assert.ok(issues.some((i) => i === '/mixed mixes a plain command with subcommands'));
    assert.ok(issues.some((i) => i.includes('/drift mixes command flags')));
  });

  test('records a grouped duplicate with its full label', () => {
    class Twice {
      one(): void {}
      two(): void {}
    }
    (QuestGroup() as ClassDecorator)(Twice);
    apply(Subcommand({ name: 'same', description: 'Same' }), Twice.prototype, 'one');
    apply(Subcommand({ name: 'same', description: 'Same' }), Twice.prototype, 'two');
    const [def] = buildCommandDefinitions([new Twice()]);
    assert.ok(def?.issues[0]?.includes('duplicate /quest same (also in Twice.one)'));
  });

  test('ignores a subcommand with no parent and non-object instances', () => {
    class Orphan {
      lonely(): void {}
    }
    apply(Subcommand({ name: 'lost', description: 'Lost' }), Orphan.prototype, 'lonely');
    assert.deepEqual(buildCommandDefinitions([new Orphan()]), []);
    assert.deepEqual(
      buildCommandDefinitions([null as never, 42 as never, Object.create(null) as object]),
      [],
    );
  });

  test('captures the options DTO behind @Options()', () => {
    class Search {
      find(): void {}
    }
    Options()(Search.prototype, 'find', 0);
    apply(Command({ name: 'search', description: 'Search' }), Search.prototype, 'find');
    Reflect.defineMetadata('design:paramtypes', [SearchDto], Search.prototype, 'find');
    const [def] = buildCommandDefinitions([new Search()]);
    assert.equal(def?.plain?.options, SearchDto);
  });
});

describe('renderCommandDefinition', () => {
  test('renders the direct subcommand and the group', () => {
    const definitions = build();
    const ping = renderCommandDefinition(definitions[0] as CommandDefinition) as Record<
      string,
      unknown
    >;
    assert.equal(ping['name'], 'ping');
    assert.deepEqual(ping['options'], []);
    const quest = renderCommandDefinition(definitions[1] as CommandDefinition) as {
      options: Array<{ name: string; options?: Array<{ name: string }> }>;
    };
    assert.deepEqual(
      quest.options.map((o) => o.name),
      ['reroll', 'daily'],
    );
    assert.deepEqual(
      quest.options[1]?.options?.map((o) => o.name),
      ['lock'],
    );
  });

  test('applies every command flag and plain options', () => {
    const def: CommandDefinition = {
      name: 'ping',
      description: 'Pong',
      flags: { nsfw: true, defaultMemberPermissions: 8n, contexts: [0], dmPermission: false },
      subcommands: [],
      groups: [],
      issues: [],
      plain: {
        instance: new Ping() as never,
        method: 'run',
        description: 'Pong',
        options: SearchDto,
      },
    };
    const json = renderCommandDefinition(def) as Record<string, unknown>;
    assert.equal(json['nsfw'], true);
    assert.equal(json['default_member_permissions'], '8');
    assert.deepEqual(json['contexts'], [0]);
    assert.equal(json['dm_permission'], false);
    assert.deepEqual(
      (json['options'] as Array<{ name: string }>).map((o) => o.name),
      ['q'],
    );
  });
});

describe('matchCommandLeaf and commandLeaves', () => {
  const definitions = build();
  const ping = definitions[0] as CommandDefinition;
  const quest = definitions[1] as CommandDefinition;

  test('resolves grouped, direct, plain and missing leaves', () => {
    assert.equal(matchCommandLeaf(ping, null, null), ping.plain);
    assert.equal(matchCommandLeaf(quest, null, 'reroll')?.method, 'reroll');
    assert.equal(matchCommandLeaf(quest, 'daily', 'lock')?.method, 'lock');
    assert.equal(matchCommandLeaf(quest, 'daily', 'reroll')?.method, 'reroll');
    assert.equal(matchCommandLeaf(quest, null, 'nope'), null);
  });

  test('flattens the plain, direct and grouped leaves', () => {
    const grouped: CommandDefinition = {
      name: 'quest',
      description: 'Quests',
      flags: {},
      issues: [],
      plain: { instance: new Ping() as never, method: 'run', description: 'Plain' },
      subcommands: [
        { instance: new Ping() as never, method: 'reroll', sub: 'reroll', description: 'Direct' },
      ],
      groups: [
        {
          name: 'daily',
          description: 'Daily',
          subcommands: [
            {
              instance: new Ping() as never,
              method: 'lock',
              sub: 'lock',
              group: 'daily',
              description: 'Grouped',
            },
          ],
        },
      ],
    };
    assert.deepEqual(
      commandLeaves(grouped).map((l) => l.method),
      ['run', 'reroll', 'lock'],
    );
  });
});
