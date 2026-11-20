# 数字人样例

`shaded.glb` 是后台上传用的数字人样例（商家给的 `base_basic_shaded.glb`），**不参与前端默认加载**。

- 52 关节蒙皮、T-pose 绑定、贴图自带明暗（emissive），无动画轨道、无口型 morph。
- 由 `frontend/js/avatar-human.js` 过程化驱动：等待 / 思考 / 说话 / 打招呼挥手 / 点头。
- 骨骼命名需保持 Mixamo 兼容：`Hips`、`Spine1-2`、`Neck`、`Head`、`Left/RightArm`、`ForeArm`、`Hand`；允许 `mixamorig:` 前缀。

## 如何启用

管理后台 → 数字人管理 → 新增：

1. 上传 `shaded.glb`
2. 填写名称（如「饽饽小匠」）
3. 选择性别与背景
4. 勾选「在前端展示使用」并保存

同一时间只能启用一个数字人；未启用时 Studio 显示“数字人暂未配置”，不会加载任何默认形象。

## 其他模型

商家另给的 `base_basic_pbr.glb` 与 `shaded.glb` 骨骼完全相同，只是材质换成 PBR（3 张贴图、8.6MB）。如需更写实，可在后台直接上传 PBR 版本，不需要改前端代码。

两个模型都没有口型 morph，所以「说话」只能靠点头 + 手势表现；要做真口型需要在 Blender 里加下颌骨或嘴部 blend shape。
