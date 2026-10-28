# 研究、授权与适配记录

检索日期：2026-10-28。只使用公开的本地规则代码与图鉴数据，没有接入游戏客户端。

| 项目 | 检查结果 | 本项目采用方式 |
| --- | --- | --- |
| [ColinHong10/NRC_AI](https://github.com/ColinHong10/NRC_AI) | MIT；Python 战斗引擎、SQLite 数据、效果配置、人机与 Web UI。README 明确仍需完善特性并校准伤害 | 固定提交 `9b5801b08d349c6505a233c513faa5075f427035`，复制必要引擎和数据库，保留 `vendor/nrc/LICENSE`，自建 Node 接口和简洁前端 |
| [leolion03/roco-kingdom-pet](https://github.com/leolion03/roco-kingdom-pet) | 图鉴/资料型 JS 项目，未查到明确代码许可证 | 仅参考资料查询与配队工具的功能划分，未复制代码或图片 |
| [eTATr/raco-helper](https://github.com/eTATr/raco-helper) | PvP 分析工具，包含实时协议相关功能与伤害分析 | 仅参考基础伤害与效果修正应分开呈现的思路，未复制代码或接入客户端 |

## 导入范围

保留 `models.py`、`battle.py`、`effect_models.py`、`effect_data.py`、`effect_engine.py`、`skill_effects_generated.py`、`skill_db.py`、`pokemon_db.py`、`pokemon_nature_table.py`、`team_builder.py`，以及引擎实际导入的 `engine/__init__.py` 与 `engine/_monolith.py`、各包初始化文件和 `data/nrc.db`。

未导入 FastAPI 服务、WebSocket、MCTS、爬虫、图标、Excel 原始资料及无运行依赖的拆分草稿。因此当前规则运行仅依赖 Python 标准库。

数据库实读：461 条 pokemon、491 条 skill、20,433 条 pokemon_skill；技能均有配置对象，但其中自动生成配置和特性覆盖不能视为实机已验证。

## 本地适配

Vendor 源码仅清理行尾空白，未改变逻辑；修正通过 `worker.py` 完成：

1. 将技能加载器的短属性映射同步给 TeamBuilder，修正数据库 `地` 在构建器中回退为普通系的问题。
2. 将 8 个相同 ON_USE 作用域中的重复 SkillEffect 包装展开：休息回复、徒长、根吸收、富养化、杠杆置换、雪球、架势、风隐。原结构会在读取 tag.type 时报 AttributeError；只展平触发时机和条件完全一致的包装。
3. 上游 `get_actions` 未在正常存活状态返回主动换人，本地合法动作生成器加入可用后备，实际换人仍调用上游执行逻辑。
4. 用 Python `copy.deepcopy` 克隆待执行与策略模拟状态，确保任意异常不产生半回合，也避免共享技能/特性状态。
5. 对少于 4 只的练习阵容增加全队倒下判负，对所有阵容增加 200 回合平局上限。被动替补/脱离沿用上游自动路径，本版不实现回合中二次选替补。
6. 不复用上游 UI/服务与 MCTS；新增同一 HTTP 服务中的 JSON 接口、独立预设策略、同时提交协议和模型适配。
7. 所有数据读取使用同一个 SQLite 只读 immutable 连接，避免运行时修改快照或产生 WAL/SHM 临时文件。

## API 兼容资料

- [DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/)：JSON 模式并明确提示返回 JSON。
- [DeepSeek Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/)：官方接口传 `thinking: {type: 'disabled'}`，减少这类短动作请求的空输出和截断问题。
- [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)：使用兼容的 messages 结构和 `max_completion_tokens`。模型 ID 由用户填写，不假设账号可用模型。

## 后续核对重点

最新赛季的种族值/技能学习关系、未配置特性、动态能耗的合法动作过滤、技能连击与蓄力字段、双人强制换人时机，以及与实机伤害案例的回归对照。当前 UI 显示“社区规则快照”，不声称官方一致或全技能准确。

## 首版验证

基础运行抽查：数据库中 469 个能找到学习者的技能各执行一个代表回合，434 只有可用学习关系的精灵各构建并执行一个代表回合，均未抛异常。其余 22 个技能和 27 只精灵缺少可用学习关联。该检查不覆盖全部条件组合，也不证明效果与实机一致。

自动化测试另覆盖了手算 135 点伤害的公式样例、增益与零威力、回复技能、主动切换、完整预设人机对局、双人隐藏指令、非法配置和动作、API 重试/鉴权失败、脱敏以及失败不推进回合。浏览器验证了人机、双人交接、配置修改、全部可学攻击技能选择、公式/回合对照、接口失效后的单次人机接管，以及窄屏无横向溢出。真实付费模型服务未在开发中调用。
