#!/usr/bin/env bash
# 生产直发脚本（SSH 现场构建）：在服务器仓库根目录执行。
# 用法（服务器上）：
#   bash scripts/deploy-server.sh            # 拉取 origin/main 并发布
#   bash scripts/deploy-server.sh <sha>      # 发布指定提交（CI 自动发布用）
#   BUILD_ID=custom-id bash scripts/deploy-server.sh
#
# 前置：服务器已有仓库 checkout、.env（含 DOMAIN/POSTGRES_PASSWORD/JWT_SECRET，
# 建议再加 SKIP_SEED_OVERWRITE=1），已装 git/docker（含 compose 插件）。
# 注意：脚本会 `git reset --hard`（丢弃服务器上的本地修改，含上次自动 bump 的 ?v），
# 但不会动 pgdata/uploads-data/caddy 数据卷，也不会 `down -v`。
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET_SHA="${1:-origin/main}"
BUILD="${BUILD_ID:-}" # 允许外部指定，否则更新代码后按 新HEAD 生成

if [ ! -f .env ]; then
  echo "缺少 .env（需含 DOMAIN/POSTGRES_PASSWORD/JWT_SECRET），停止发布" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a
if [ -z "${DOMAIN:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${JWT_SECRET:-}" ]; then
  echo "DOMAIN/POSTGRES_PASSWORD/JWT_SECRET 必须在 .env 中设置，停止发布" >&2
  exit 1
fi
if [ "${SKIP_SEED_OVERWRITE:-}" != "1" ]; then
  echo "提醒：生产建议在 .env 加 SKIP_SEED_OVERWRITE=1，避免发布覆盖管理员改过的新闻/艺人"
fi

PREV_SHA="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "== deploy ${PREV_SHA} -> ${TARGET_SHA} =="

rollback() {
  echo "!! 发布失败，回滚到 ${PREV_SHA}" >&2
  git reset --hard "$PREV_SHA" >/dev/null 2>&1 || true
  docker compose up -d --build >/dev/null 2>&1 || true
  docker compose logs --tail=200 backend web 2>/dev/null || true
}
trap 'rollback' ERR

# 备份（尽力而为：失败只告警，不阻断发布）
mkdir -p backups
BACKUP_FILE="backups/pg-$(date +%Y%m%d-%H%M%S).sql.gz"
if docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-mydb}" "${POSTGRES_DB:-mydb}" 2>/dev/null | gzip > "$BACKUP_FILE"; then
  echo "db backup ok: $BACKUP_FILE"
else
  echo "warn: 数据库备份失败（服务可能正在重启），继续发布" >&2
  rm -f "$BACKUP_FILE"
fi
ls -t backups/pg-*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f

# 更新代码（reset 会清掉上次自动 bump 的 ?v，保证下次 pull 不冲突）
git fetch origin main
git reset --hard "$TARGET_SHA"

if [ -z "$BUILD" ]; then
  BUILD="$(date +%Y%m%d-%H%M)-$(git rev-parse --short HEAD)"
fi
echo "BUILD=${BUILD}"

# 刷新前端缓存键（只改已有 ?v，保证用户拿到新前端）
node frontend/scripts/bump-cache.js "$BUILD"

docker compose up -d --build
docker compose ps

# 健康门禁：后端 db:connected + 前端 200
echo "waiting for https://${DOMAIN}/api/health ..."
ok=0
for _ in $(seq 1 36); do
  if curl -fsS "https://${DOMAIN}/api/health" 2>/dev/null | grep -q '"db":"connected"'; then ok=1; break; fi
  sleep 5
done
if [ "$ok" != "1" ]; then
  echo "健康检查失败" >&2
  curl -sk "https://${DOMAIN}/api/health" || true
  exit 1
fi
curl -fsS -o /dev/null "https://${DOMAIN}/"
echo "FRONTEND 200 ok"
curl -fsS "https://${DOMAIN}/api/health"

trap - ERR
docker image prune -f >/dev/null 2>&1 || true
echo "DEPLOY PASS (${BUILD})"
