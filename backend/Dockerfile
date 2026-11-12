# ---- deps: 带编译工具链，保证 better-sqlite3 在无预编译包时也能从源码构建 ----
FROM node:22-slim AS deps

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
# prebuild 优先（快），缺失时自动 node-gyp 从源码构建（上有工具链则必成）
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime: 干净 slim 镜像，只带编译产物 ----
FROM node:22-slim

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY drizzle ./drizzle

RUN mkdir -p /data/uploads && chown -R node:node /app /data/uploads
USER node

EXPOSE 3000

# 启动时自动执行 drizzle 迁移 + 种子兜底（见 src/index.js）
CMD ["node", "src/index.js"]
