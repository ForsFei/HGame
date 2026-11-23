# dsh-hgame

在 DeepSeek Harness 的会话里与当前模型玩快艇骰子。支持 DSH Desktop 和 Web `0.2.1-rc.5`，通过 DSH 自己的会话和模型配置调用 Agent。

## 使用

在本目录生成本机安装包。

```powershell
npm run pack:local
```

桌面版在左侧「插件 → 添加插件」输入 `F:/HNova/10HGame/plugins/dsh-hgame/dsh-hgame-0.2.2.tgz`，然后按界面提示完成安装和重启。

Web 版用下面的命令安装或升级，然后重启 Web profile。

```powershell
dsh plugin --profile web add 'file:F:/HNova/10HGame/plugins/dsh-hgame/dsh-hgame-0.2.2.tgz'
```

打开一条配置了模型的会话，切到「终端」页签，点击「初始化任务」。也可以在会话里说「用 HGame 开一局快艇骰子」，然后打开页签。

默认使用摸鱼简洁模式，页面标题为 `Runtime / sample-worker`，采用浅色等宽字体和数字字段。`local` 对应你，`remote` 对应当前会话模型。点击「运行采样」、固定字段、重新采样，再选择指标「写入」以结束本批。

初始化后点击终端区域，用 `Alt+Shift+C` 开启或关闭无限重采样。`extended` 表示已开启，`standard` 表示标准额度。该设置仅作用于当前会话的手动回合，远端线程最多采样三次。关闭后保留当前数值，已达到三次时需先写入指标。重新初始化恢复标准额度。

写入后会自动唤醒当前会话，Agent 用工具读局面并提交自己的动作。会话正在处理消息或 Agent 中途停下时，可以点「恢复远端任务」。唤醒消息也要求模型使用采样、指标等术语，但工具详情中仍包含完整规则和原始游戏数据。

对局按 DSH 会话隔离，重新打开同一会话的「终端」页签可以继续。DSH 宿主重启或插件重载会清空进行中的对局。

## 开发

若 DSH 配置目录与 HGame 在同一盘，可使用源码链接。

```powershell
dsh plugin --profile web add 'link:F:/HNova/10HGame/plugins/dsh-hgame'
node --test plugin.test.js
```

- `matches.js` 管理会话对局、行动座位和局面版本。
- `yacht.js` 适配现有快艇骰子引擎，提供 `create`、`activeSeat`、`view`、`apply`。生成安装包时纳入同一份规则源码。
- `index.js` 注册 DSH 工具和由 Connection 鉴权的 `/api/dsh-hgame` 对局接口。Web 和 Desktop 共用该接口。
- `client.js` 注册会话页签。目前页面渲染快艇骰子。后续游戏需提供自己的适配器和界面。

会话视图和工具共享状态的结构参考 [casteadelqui/dsh-go](https://github.com/casteadelqui/dsh-go)。
