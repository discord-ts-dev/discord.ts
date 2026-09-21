import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { Command, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import {
  buildCommandDefinitions,
  type CommandDefinition,
} from '../src/discovery/command-definition.js';

function apply(decorator: MethodDecorator, proto: object, name: string): void {
  decorator(proto, name, Object.getOwnPropertyDescriptor(proto, name) as PropertyDescriptor);
}

describe('help metadata', () => {
  const PlayGroup = createCommandGroupDecorator({
    name: 'play',
    description: 'Play games',
    category: 'Fun',
    toggleable: true,
  });
  const SubGroup = createCommandGroupDecorator({ name: 'sub', description: 'Sub' });

  class Hunt {
    run(): void {}
  }
  apply(
    Command({ name: 'hunt', description: 'Hunt', category: 'Gameplay', toggleable: true }),
    Hunt.prototype,
    'run',
  );

  class Play {
    dice(): void {}
    coin(): void {}
  }
  (PlayGroup() as ClassDecorator)(Play);
  apply(Subcommand({ name: 'dice', description: 'Dice' }), Play.prototype, 'dice');
  apply(
    SubGroup({ toggleable: true, category: 'Wrong' }) as MethodDecorator,
    Play.prototype,
    'coin',
  );
  apply(Subcommand({ name: 'coin', description: 'Coin' }), Play.prototype, 'coin');

  const defs = buildCommandDefinitions([new Hunt(), new Play()]);
  const hunt = defs.find((d) => d.name === 'hunt') as CommandDefinition;
  const play = defs.find((d) => d.name === 'play') as CommandDefinition;

  test('carries category and toggleable from a plain command', () => {
    assert.equal(hunt.category, 'Gameplay');
    assert.equal(hunt.toggleable, true);
  });

  test('carries category and toggleable from group metadata', () => {
    assert.equal(play.category, 'Fun');
    assert.equal(play.toggleable, true);
  });

  test('ignores sub-group overrides and warns', () => {
    const coin = play.groups[0];
    assert.equal(coin?.name, 'sub');
    assert.ok((play.warnings ?? []).some((w) => w.includes('sub') && w.includes('toggleable')));
  });

  test('plain commands without help fields stay undefined and warning-free', () => {
    class Plain {
      run(): void {}
    }
    apply(Command({ name: 'plain', description: 'Pong' }), Plain.prototype, 'run');
    const def = buildCommandDefinitions([new Plain()])[0] as CommandDefinition;
    assert.equal(def.category, undefined);
    assert.equal(def.toggleable, undefined);
    assert.deepEqual(def.warnings ?? [], []);
  });

  test('a sub-group cannot leak help fields into the top level', () => {
    const Bare = createCommandGroupDecorator({ name: 'bare', description: 'Bare' });
    const Leak = createCommandGroupDecorator({ name: 'mini', description: 'Mini' });
    class BareC {
      a(): void {}
      b(): void {}
    }
    (Bare() as ClassDecorator)(BareC);
    apply(Subcommand({ name: 'a', description: 'A' }), BareC.prototype, 'a');
    apply(Leak({ category: 'Leaked', toggleable: true }) as MethodDecorator, BareC.prototype, 'b');
    apply(
      Subcommand({ name: 'b', description: 'B', toggleable: true } as never),
      BareC.prototype,
      'b',
    );
    const def = buildCommandDefinitions([new BareC()]).find(
      (d) => d.name === 'bare',
    ) as CommandDefinition;
    assert.equal(def.category, undefined);
    assert.equal(def.toggleable, undefined);
    const warnings = def.warnings ?? [];
    assert.ok(warnings.some((w) => w.includes('mini')));
    assert.ok(warnings.some((w) => w.includes('subcommand')));
  });

  test('stray help fields on subcommand metadata are ignored with a warning', () => {
    class Stray {
      go(): void {}
    }
    apply(Command({ name: 'stray', description: 'Top' }), Stray.prototype, 'go');
    apply(
      Subcommand({ name: 'inner', description: 'Inner', category: 'Nope' } as never),
      Stray.prototype,
      'go',
    );
    const def = buildCommandDefinitions([new Stray()]).find(
      (d) => d.name === 'stray',
    ) as CommandDefinition;
    assert.equal(def.category, undefined);
    assert.ok((def.warnings ?? []).some((w) => w.includes('subcommand')));
  });
});
