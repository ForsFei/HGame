import {
  available, canRoll, categories, commit, createGame, roll, score, total, validateDecision,
} from '../../games/001-YachtDice/public/engine.js';

export const yacht = {
  id: 'yacht-dice',
  title: '快艇骰子',
  create() {
    return createGame([{ name: '你', type: 'human' }, { name: 'DeepSeek', type: 'agent' }]);
  },
  activeSeat(game) {
    return game.done ? null : game.turn === 0 ? 'human' : 'agent';
  },
  view(game) {
    const players = game.players.map(player => ({
      name: player.name, sheet: player.sheet, total: total(player.sheet),
    }));
    const keys = available(game.players[game.turn].sheet);
    return {
      players,
      dice: game.rolls ? game.dice : [],
      rolls: game.rolls,
      unlimitedRolls: game.unlimitedRolls === true,
      categories: categories.map(([id, label, rule]) => ({
        id, label, rule, preview: game.rolls && keys.includes(id) ? score(game.dice, id) : null,
      })),
      actions: {
        roll: canRoll(game),
        score: game.done || !game.rolls ? [] : keys,
      },
      lastScore: game.log[0] ?? null,
    };
  },
  apply(game, action) {
    if (action?.type === 'score' && !game.rolls) throw new Error('请先掷骰。');
    const move = validateDecision(action, game);
    if (move.type === 'score') {
      commit(game, move.category);
    } else {
      if (!game.rolls && move.keep.length) throw new Error('首次掷骰不能保留骰子。');
      game.held = game.held.map((_, index) => move.keep.includes(index));
      roll(game);
    }
  },
};
