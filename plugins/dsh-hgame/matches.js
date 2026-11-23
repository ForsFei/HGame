import { randomUUID } from 'node:crypto';
import { yacht } from './yacht.js';

export function createMatches(adapters = [yacht]) {
  const registry = new Map(adapters.map(adapter => [adapter.id, adapter]));
  const matches = new Map();

  function snapshot(match, viewer) {
    if (!match) return null;
    return structuredClone({
      id: match.id,
      game: match.adapter.id,
      title: match.adapter.title,
      revision: match.revision,
      seat: match.adapter.activeSeat(match.state),
      board: match.adapter.view(match.state, viewer),
    });
  }

  return {
    open(session, game = 'yacht-dice', restart = false) {
      const current = matches.get(session);
      if (current && !restart) return snapshot(current, 'human');
      const adapter = registry.get(game);
      if (!adapter) throw new Error('这个游戏尚未接入。');
      const match = { id: randomUUID(), adapter, revision: 0, state: adapter.create() };
      if (!current && matches.size >= 100) throw new Error('已达到本次运行的对局数量上限。');
      matches.set(session, match);
      return snapshot(match, 'human');
    },
    state(session, viewer = 'human') {
      return snapshot(matches.get(session), viewer);
    },
    setUnlimited(session, command) {
      const match = matches.get(session);
      if (!match || command.matchId !== match.id || command.revision !== match.revision) {
        throw new Error('局面已更新，请重新读取后再操作。');
      }
      if (typeof command.enabled !== 'boolean') throw new Error('采样开关无效。');
      match.state.unlimitedRolls = command.enabled;
      match.revision++;
      return snapshot(match, 'human');
    },
    act(session, seat, command) {
      const match = matches.get(session);
      if (!match || command.matchId !== match.id || command.revision !== match.revision) {
        throw new Error('局面已更新，请重新读取后再操作。');
      }
      if (match.adapter.activeSeat(match.state) !== seat) throw new Error('当前不轮到这个座位。');
      const next = structuredClone(match.state);
      match.adapter.apply(next, command.action, seat);
      match.state = next;
      match.revision++;
      return snapshot(match, seat);
    },
  };
}
