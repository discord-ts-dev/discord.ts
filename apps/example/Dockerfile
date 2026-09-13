# ponytail: single-stage Bun. The bot runs from TS source direct, no tsc build.
# `bun run start:bun` resolves the `discord` bin from the workspace root.
# Only the framework CLI needs dist, built once below (bot code stays TS).
FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS runtime
WORKDIR /app

# Manifests first: the install layer stays cached unless deps change.
COPY package.json bun.lock ./
COPY apps/example/package.json ./apps/example/
COPY packages/cli/package.json ./packages/cli/
COPY packages/common/package.json ./packages/common/
COPY packages/core/package.json ./packages/core/
COPY packages/ux/package.json ./packages/ux/
COPY scripts/postinstall.sh ./scripts/
RUN bun install --frozen-lockfile

# Full source for the one-time CLI build, then run the bot from source.
COPY . .
RUN bun run build

WORKDIR /app/apps/example
ENV NODE_ENV=production
# Runtime secrets come from the environment, never baked in:
#   docker run -e DISCORD_TOKEN=... -e DISCORD_CLIENT_ID=... discord-ts-example
CMD ["bun", "run", "start:bun"]
