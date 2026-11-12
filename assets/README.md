# assets

`model-library/` 是大模型文件的本地中转目录（git 不入库，见根 `.gitignore`），
放的是从旧 `模型库/uploads/` 搬过来的种子文件（`v1/`、`v2/`、散装 `.glb/.obj`，
中文原名保留）。

## 把模型库导入工作台（导入后前端即可见）

前端模型库是数据库驱动的（`/api/studio-models`），光把文件放在这里不会显示。
用自带脚本一次性导入：

```bash
cd backend
npm run import:models                        # 导入 ../assets/model-library，全进「模型库」分类
npm run import:models -- --category=天空元素  # 导入到指定分类（不存在会自动创建）
```

脚本会：复制 `.glb` 到上传目录、同名自动跳过（可重复执行）、
非 GLB（如 `.obj`，播放器不支持）列出并跳过、缺失分类自动创建。
缩略图在工作台首次打开该模型时自动生成补齐。

生产环境同样适用：把 `assets/model-library/` 传到服务器后执行
`docker compose exec backend npm run import:models -- /path/to/model-library`，
或在管理后台逐个上传。

Never `git add` this directory back in.
