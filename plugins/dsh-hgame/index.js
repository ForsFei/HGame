import { randomUUID } from 'node:crypto';
import { createMatches } from './matches.js';

export const name = 'dsh-hgame';
export const inject = ['tools', 'agents', 'connection'];

const gamePath = '/api/dsh-hgame';
const playInstruction = 'Runtime 采样任务已交给远端线程。先调用 hgame_state 读取当前状态，使用 hgame_act 自己选择合法动作；若仍轮到 Agent，根据新状态继续操作，直到完成本批计分或任务结束。界面采用简洁模式，请用采样、固定字段、指标写入等术语简短说明操作。';
const object = (properties = {}, required = []) => ({
  type: 'object', properties, required, additionalProperties: false,
});
const output = {
  schema: { type: 'object' },
  render: (_args, result) => [{ type: 'text', text: JSON.stringify(result) }],
};

export function gameTools(matches) {
  function tool(name, description, parameters, execute) {
    return {
      name, description, parameters, output,
      async execute(args, execution) {
        execution.signal.throwIfAborted();
        const session = execution.agent?.session.id;
        if (!session) throw new Error('游戏工具需要当前 DSH 会话。');
        return { match: execute(session, args) };
      },
    };
  }
  return [
    tool('hgame_open', '仅当用户要求开局时，打开当前会话的快艇骰子对局。已有对局时继续该局。', object({
      game: { type: 'string', enum: ['yacht-dice'] },
    }), (session, { game }) => matches.open(session, game)),
    tool('hgame_state', '查看当前会话的 HGame 局面、合法动作与局面版本。', object(),
      session => matches.state(session, 'agent')),
    tool('hgame_act', '仅在 Agent 座位的回合提交动作。roll 的 keep 是保留的骰子下标（0 到 4），首次掷骰传空数组；score 用 category 指定计分项。每次使用最新的 match.id 和 revision。', object({
      matchId: { type: 'string' },
      revision: { type: 'integer', minimum: 0 },
      action: {
        anyOf: [
          object({ type: { const: 'roll' }, keep: { type: 'array', maxItems: 4, items: { type: 'integer', minimum: 0, maximum: 4 } } }, ['type', 'keep']),
          object({ type: { const: 'score' }, category: { type: 'string' } }, ['type', 'category']),
        ],
      },
    }, ['matchId', 'revision', 'action']), (session, args) => matches.act(session, 'agent', args)),
  ];
}

async function readCommand(request) {
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  for await (const chunk of request.body) {
    size += chunk.byteLength;
    if (size > 8192) throw new Error('操作数据过大。');
    body += decoder.decode(chunk, { stream: true });
  }
  return JSON.parse(body + decoder.decode());
}

export function apply(ctx) {
  const matches = createMatches();
  const lastWake = new Map();
  for (const tool of gameTools(matches)) ctx.effect(() => ctx.tools.register(tool));

  function wake(agent, match) {
    if (match?.seat !== 'agent') return null;
    if (agent.status !== 'idle') return '当前会话正在处理消息，结束后可点「恢复远端任务」。';
    const previous = lastWake.get(match.id);
    if (previous?.revision === match.revision && Date.now() - previous.at < 1500) return null;
    lastWake.set(match.id, { revision: match.revision, at: Date.now() });
    try {
      agent.followup({
        id: randomUUID(),
        role: 'user',
        source: { kind: 'dsh-hgame' },
        content: [{ type: 'text', text: playInstruction }],
      });
      return null;
    } catch {
      lastWake.delete(match.id);
      return '唤醒会话失败，请点「恢复远端任务」重试。';
    }
  }

  ctx.connection.fetch.register({
    path: gamePath,
    methods: ['POST'],
    requestBody: 'stream',
    async fetch(request) {
      const fail = (status, error) => Response.json({ error }, { status });
      if (!request.body || request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
        return fail(415, '游戏请求需要 JSON 数据。');
      }
      try {
        const command = await readCommand(request);
        const session = command?.session;
        if (typeof session !== 'string' || !session || session.length > 128) {
          return fail(400, '会话标识无效。');
        }
        request.signal.throwIfAborted();
        const agent = ctx.agents.get(session);
        if (!agent) return fail(409, '请在当前 DSH 会话先发一条消息，再回到终端页签。');
        let match;
        let notice = null;
        switch (command.method) {
          case 'state':
            match = matches.state(session);
            break;
          case 'open': {
            const previous = matches.state(session);
            match = matches.open(session, command.game, command.restart === true);
            if (previous && previous.id !== match.id) lastWake.delete(previous.id);
            break;
          }
          case 'act':
            match = matches.act(session, 'human', command);
            notice = wake(agent, match);
            break;
          case 'unlimited':
            match = matches.setUnlimited(session, command);
            break;
          case 'wake':
            match = matches.state(session);
            notice = wake(agent, match);
            break;
          default:
            return fail(404, '未知操作。');
        }
        return Response.json({ match, notice }, { headers: { 'Cache-Control': 'no-store' } });
      } catch (error) {
        return fail(400, error instanceof Error ? error.message : '游戏操作失败。');
      }
    },
  });
}
