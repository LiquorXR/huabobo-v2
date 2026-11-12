# 生产镜像：Node 22（better-sqlite3 v13 要求 Node >= 22）
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY drizzle ./drizzle

RUN mkdir -p /data/uploads && chown -R node:node /app /data/uploads
USER node

EXPOSE 3000

# 启动时自动执行 drizzle 迁移 + 种子兜底（见 src/index.js）
CMD ["node", "src/index.js"]
