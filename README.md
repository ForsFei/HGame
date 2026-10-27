# HGame · 本地网页游戏库

十个小游戏共用一个 Node.js 服务。代码留在 `10HGame`；`00HNovaPortal` 负责总导航、状态检查和启动入口，不承载游戏代码。

## 一键启动

需要 **Node.js 22+**，不需要安装依赖或构建。双击根目录 **`启动游戏库.bat`**，打开 **http://127.0.0.1:43170/**。已有游戏库运行时直接复用；关闭承载服务的命令窗口会停止全部游戏。也可在本目录运行 `npm start`。

网页提供分类、搜索、收藏、最近打开和工作台模式（Alt+M）。进入游戏后，点「返回游戏库」即可切换。收藏与最近打开仅保存在本浏览器。游戏规则、各自的简洁模式和自动存档维持独立。本次没有迁移旧端口存档。

各游戏目录内的 `启动游戏.bat` 也调用统一启动器，已运行时复用同一服务并直达该游戏。各目录 `npm start` 启动的也是整个游戏库，不再启动独立游戏端口。

## 游戏目录

| 编号 | 游戏 | 代码目录 | 网页路径 |
| --- | --- | --- | --- |
| 001 | 快艇骰子 Yacht Dice | [001-YachtDice](games/001-YachtDice/README.md) | `/games/yacht-dice/` |
| 002 | 纸牌工坊 CardLab | [002-CardLab](games/002-CardLab/README.md) | `/games/card-lab/` |
| 003 | 行囊工坊 PackLab | [003-PackLab](games/003-PackLab/README.md) | `/games/pack-lab/` |
| 004 | 词条校验 WordCheck | [004-WordCheck](games/004-WordCheck/README.md) | `/games/word-check/` |
| 005 | 像素织图 PixelWeave | [005-PixelWeave](games/005-PixelWeave/README.md) | `/games/pixel-weave/` |
| 006 | 算力调度站 ComputeFlow | [006-ComputeFlow](games/006-ComputeFlow/README.md) | `/games/compute-flow/` |
| 007 | 异常点排查 NodeSweep | [007-NodeSweep](games/007-NodeSweep/README.md) | `/games/node-sweep/` |
| 008 | 信号路由 SignalRoute | [008-SignalRoute](games/008-SignalRoute/README.md) | `/games/signal-route/` |
| 009 | 告警复位 OutageReset | [009-OutageReset](games/009-OutageReset/README.md) | `/games/outage-reset/` |
| 010 | 托盘上架 CrateShift | [010-CrateShift](games/010-CrateShift/README.md) | `/games/crate-shift/` |

编号是目录顺序，和端口无关。新增游戏继续用 011、012，避免每添一款就增加端口。

## 端口约定

- **43100：HNova Portal**，系列项目总入口，可启动并打开 HGame。
- **43170：HGame**，游戏库、十个游戏、快艇骰子的模型代理共用一个服务。
- 原游戏端口 **43171–43180 已停用**，43173 不再作为专属备用端口。
- 临时测试整个游戏库可运行 `node server.mjs --port 44170`，或设置 `$env:PORT=44170` 后运行 `npm start`。Portal 的入口保持指向正式端口 43170。

服务只绑定 `127.0.0.1`。`localhost` 页面会重定向到 `127.0.0.1`，避免同一个服务出现两套浏览器存储。

## 目录结构

```text
10HGame/
├── 启动游戏库.bat       一键启动或复用统一服务
├── server.mjs           唯一 HTTP 监听器
├── package.json
├── library/             页面、目录清单、返回入口
├── games/               001–010 各游戏，规则与测试仍独立
├── scripts/             统一启动与就绪后打开浏览器
├── shared/              三款游戏共用的简洁模式实现
└── test/                游戏库与服务整合测试
```

历史开发截图、编辑器缓存和旧启动日志已清理，并加入忽略规则。游戏规则说明、测试、关卡生成与数值检查脚本继续保留。快艇骰子的模型调用日志保存在 `games/001-YachtDice/logs/`，继续忽略提交。

NodeSweep、SignalRoute、OutageReset 直接引用 `/shared/quiet.js` 和 `/shared/quiet.css`，只维护一份公共实现。CrateShift 的简洁模式存在专属适配，仍保留独立文件。

## 模型与开发

快艇骰子模型请求改为同游戏路径下的 `api/decision`，由统一服务在同一进程调用原模型处理器，未启动第二个服务。兼容原 `/api/decision` 路径。超时、重试、结构校验和脱敏日志不变，Key 仍只在页面内存中。普通游玩和其他九个游戏不需要模型或网络。

根目录 `npm test` 检查全部游戏，`npm run test:library` 只检查整合服务；在任意游戏目录 `npm test` 仍可单独检查规则。整合测试覆盖十个页面与全部模块、HEAD、重定向、路径隔离、来源校验、私有文件不可读取，以及不调用外部服务的模型代理模拟。

新增游戏在 `library/catalog.js` 注册目录、元数据和额外公开文件。静态服务只允许清单中的文件，后端源码、日志与环境文件不会公开。
