# 指间塑 — MPA 动态数据架构说明

## 原则

- **多页面（MPA）**：每个功能对应少量固定 HTML 模板页，页面间用普通链接跳转。
- **禁止**为每个注册用户、合作手艺人单独生成 `author-xxx.html`、`artisan-xxx.html` 等静态文件。
- **注册**仅向数据库（当前为 `localStorage` 模拟）写入用户记录，不生成新网页。
- **海量用户**：用户量增长只增加数据行，不增加 HTML 文件数。

## 固定模板页

| 页面 | 作用 | URL 示例 |
|------|------|----------|
| `profile.html` | 统一用户主页（社区用户 + 合作手艺人） | `profile.html?id=u1`、`profile.html?id=a1`、`profile.html?id=me` |
| `work.html` | 统一作品详情 | `work.html?id=w1` |
| `gallery.html` | 数字化展厅列表（JS 渲染） | `gallery.html` |
| `artisans.html` | 手艺人列表（JS 渲染） | `artisans.html` |
| `my.html` | 重定向到当前用户主页 | → `profile.html?id=me` |
| `camera-consent.html` | 摄像头授权（登录后） | 同意后 → `studio.html` |
| `studio.html` | 3D 面塑 DIY 工作台 | 保存草稿 / 分享到 `gallery.html`；AR 模式仅显示面团模型（隐藏案板） |
| `models/hand_landmarker.task` | MediaPipe 手部模型（本地） | 支持直接双击 `studio.html` 打开，无需终端启动服务 |

## 数据层与 API 地址

- **服务器：** `8.160.184.132`
- **后台 API：** `http://8.160.184.132:3000`（见 `frontend/frontend/js/api-config.js` 中 `ZJS.API_BASE`）
- **前端静态页：** `http://8.160.184.132`（与 API 同机部署时）
- `frontend/frontend/js/api-config.js` — 开启 `ZJS.USE_BACKEND`，默认请求 `http://8.160.184.132:3000`
- `js/api-remote.js` — 覆盖 `Api.*` 对接真实接口
- `js/api.js` — 本地演示兜底（未连后台时）
- 完整接口列表见：`backend/README.md`

## 上线对接示例

```javascript
// api-config.js
ZJS.API_BASE = 'http://8.160.184.132:3000';
ZJS.USE_BACKEND = true;

// 请求示例
fetch('http://8.160.184.132:3000/api/users/' + id).then(function (r) { return r.json(); });
```

## 链接规范

- 用户主页：`profile.html?id={userId}`
- 作品详情：`work.html?id={workId}`
- 我的：`profile.html?id=me`（登录后 session 解析为真实 ID）
