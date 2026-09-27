import { mock } from 'bun:test';

// ponytail: tests must run against workspace sources, not dist. tsconfig `paths`
// cannot do this (it breaks `rootDir` builds), so a test preload redirects the
// bare specifiers. See docs/adr/0007-tests-run-against-sources.md.
const sources: Record<string, () => Promise<unknown>> = {
  '@discord-ts-dev/common': () => import('../packages/common/src/index.ts'),
  '@discord-ts-dev/core': () => import('../packages/core/src/index.ts'),
  '@discord-ts-dev/i18n': () => import('../packages/i18n/src/index.ts'),
  '@discord-ts-dev/redis': () => import('../packages/redis/src/index.ts'),
  '@discord-ts-dev/systems': () => import('../packages/systems/src/index.ts'),
  '@discord-ts-dev/utils': () => import('../packages/utils/src/index.ts'),
  '@discord-ts-dev/ux': () => import('../packages/ux/src/index.ts'),
};

for (const [specifier, load] of Object.entries(sources)) {
  mock.module(specifier, load);
}
