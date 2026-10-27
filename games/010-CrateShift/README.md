# CrateShift · 托盘上架

> 游戏入口：http://127.0.0.1:43170/games/crate-shift/ · [统一启动说明](../../README.md)

仓库调度题材的推箱子小游戏：把每个橙色托盘推进虚线库位，全部归位即完成。托盘只能推、不能拉。

- 010 号作品，离线单人，原生 ES Module，无第三方依赖与网络请求。
- 8 个内置关卡，关卡数据与规则在 `public/engine.js`，界面在 `public/app.js`。
- 标准模式为游戏化文案「托盘上架」，按 **Alt+M** 可切换为浅色工具界面的「库位归位」，术语改为批次 / 搬运 / 库位，规则与进度不变。

## 运行

需要 Node.js 22 或更高版本。

```bash
# 方式一：双击目录内的 启动游戏.bat
# 方式二：
npm start
```

统一地址为 <http://127.0.0.1:43170/games/crate-shift/>。端口调整针对整个游戏库，见根目录说明。

## 操作

- 方向键或 `WASD` 移动，也可点棋盘下方的方向按钮。
- 走到托盘旁边再朝同方向移动即可推动；托盘顶到墙或另一个托盘就推不动。
- `Z` 撤销上一步，`R` 重开本关；撤销与重开都不限次数。
- 全部托盘进入库位即通关，顶部记录步数、推动次数与用时。
- 切换到已通关的关卡会重新开局，已有进度时会先确认。

## 存档

进度、成绩与视图偏好分别写入 `localStorage` 的 `crateshift-save`、`crateshift-records`、`crateshift-view`。刷新页面可继续当前对局；存档会经过 `validSave` 校验，损坏时回退到第 1 关。

## 测试

```bash
npm test
```

`test/engine.test.mjs` 覆盖棋子解析、全部关卡可解性与 par 一致性、移动 / 推箱 / 撤销 / 重开、存档校验、成绩汇总与计时。

## 结构

```
010-CrateShift/
├─ public/
│  ├─ index.html   页面骨架
│  ├─ style.css    标准视图样式
│  ├─ quiet.css    简洁视图配色
│  ├─ engine.js    关卡数据与游戏规则
│  ├─ quiet.js     视图切换（Alt+M）
│  └─ app.js       界面渲染、输入与存档
├─ test/engine.test.mjs
├─ server.mjs      统一游戏库启动入口
└─ 启动游戏.bat
```
