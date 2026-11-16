# ponytail: single-stage Bun. The bot runs from TS source direct, no tsc build.
# `bun run start:bun` resolves the `discord` bin from the workspace root.
# Only the framework CLI needs dist, built once below (bot code stays TS).
FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS runtime
WORKDIR /app

# Manifests first: the install layer stays cached unless deps change.
COPY package.json bun.lock ./
COPY apps/example/package.json ./apps/example/
COPY packages/cli/package.json ./packages/cli/
COPY packages/common/package.json ./packages/common/
COPY packages/core/package.json ./packages/core/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/redis/package.json ./packages/redis/
COPY packages/systems/package.json ./packages/systems/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ux/package.json ./packages/ux/
COPY scripts/postinstall.sh ./scripts/
RUN bun install --frozen-lockfile

# Full source for the one-time CLI build, then run the bot from source.
COPY . .
# ponytail: bot image builds only the example closure (docs ships separately).
RUN bunx turbo run build --filter=...example && bun run postinstall

WORKDIR /app/apps/example
ENV NODE_ENV=production
# Runtime secrets come from the environment, never baked in:
#   docker run -e DISCORD_TOKEN=... -e DISCORD_CLIENT_ID=... discord-ts-example
CMD ["bun", "run", "start:bun"]
