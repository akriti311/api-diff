FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/cli/package.json apps/cli/
COPY apps/web/package.json apps/web/
COPY packages/engine/package.json packages/engine/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @apidiff/web build

ENV NODE_ENV=production

EXPOSE 3001

CMD ["pnpm", "start"]
