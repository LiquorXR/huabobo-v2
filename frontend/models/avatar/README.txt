数字人 — 3D 模型目录
================================

- shaded.glb        3D 数字人本体（商家给的 base_basic_shaded.glb，两者字节一致）
                   52 关节蒙皮、T-pose 绑定、贴图自带明暗（emissive），无动画轨道、无口型 morph
                   由 js/avatar-human.js 过程化驱动：等待 / 思考 / 说话 / 打招呼挥手 / 点头
                   换模型时请保持骨骼命名（Hips、Spine1-2、Neck、Head、Left/RightArm、ForeArm、Hand）

- xbot-clips.glb    Mixamo 骨架的参考动作（idle、walk、agree 等 7 条）
                   关节命名是 mixamorig:*、单位是厘米，与 shaded.glb 骨骼不通用，未接入运行时

说明：
1. 商家另给的 base_basic_pbr.glb 与 shaded.glb 骨骼完全相同，只是材质换成 PBR（3 张贴图、8.6MB）。
   想要更写实可把它放成 pbr.glb，并给 createHumanAvatar 传 { modelUrl: 'models/avatar/pbr.glb' }；
   当前取 shaded 版：体积小一半、自带明暗、不依赖环境反射，小面板里观感更稳。
2. 两个模型都没有口型 morph，所以「说话」只能靠点头 + 手势表现，做不了逐字对口型。
   要做真口型需要在 Blender 里加下颌骨或嘴部 blend shape，再在 avatar-human.js 里驱动。
