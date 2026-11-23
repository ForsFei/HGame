import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apply } from './index.js';
import { createMatches } from './matches.js';

test('unlimited setting is versioned, session-local and limited to the human seat', () => {
  const matches = createMatches();
  let match = matches.open('local');
  const other = matches.open('other');
  const setting = enabled => ({ matchId: match.id, revision: match.revision, enabled });
  const act = (seat, action) => matches.act('local', seat, { matchId: match.id, revision: match.revision, action });
  const stale = setting(true);
  match = matches.setUnlimited('local', stale);
  assert.throws(() => matches.setUnlimited('local', stale), /更新/);
  assert.equal(matches.state('other').board.unlimitedRolls, false);
  for (let i = 0; i < 7; i++) match = act('human', { type: 'roll', keep: i ? [0] : [] });
  assert.equal(match.board.rolls, 7);
  assert.equal(match.board.actions.roll, true);
  const dice = [...match.board.dice];
  match = matches.setUnlimited('local', setting(false));
  assert.deepEqual(match.board.dice, dice);
  assert.equal(match.board.actions.roll, false);
  assert.throws(() => act('human', { type: 'roll', keep: [] }));
  match = act('human', { type: 'score', category: 'ones' });
  match = matches.setUnlimited('local', setting(true));
  for (let i = 0; i < 3; i++) match = act('agent', { type: 'roll', keep: [] });
  assert.equal(match.board.actions.roll, false);
  assert.throws(() => act('agent', { type: 'roll', keep: [] }));
  match = matches.open('local', undefined, true);
  assert.equal(match.board.unlimitedRolls, false);
  assert.notEqual(match.id, other.id);
});

test('DSH owner and Agent complete a shared game with one wake per human turn', async () => {
  const tools = new Map();
  const wakes = [];
  const agent = { session: { id: 'session-a' }, status: 'idle', followup: msg => wakes.push(msg) };
  let handler;
  apply({
    tools: { register: tool => tools.set(tool.name, tool) },
    agents: { get: id => id === agent.session.id ? agent : undefined },
    connection: { fetch: { register: route => {
      assert.equal(route.path, '/api/dsh-hgame');
      assert.deepEqual(route.methods, ['POST']);
      handler = route.fetch;
    } } },
    effect: setup => setup(),
  });
  const signal = new AbortController().signal;
  const request = (method, payload = {}) => handler(new Request('http://localhost/api/dsh-hgame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: agent.session.id, ...payload, method }),
  }));
  const move = async (method, payload) => {
    const result = await request(method, payload);
    const data = await result.json();
    assert.equal(result.status, 200, data.error);
    return data.match;
  };
  const call = (name, args, actor = agent) => tools.get(name).execute(args, {
    agent: actor, signal,
  });
  const command = (match, action) => ({ matchId: match.id, revision: match.revision, action });
  const roll = { type: 'roll', keep: [] };
  const score = match => ({ type: 'score', category: match.board.actions.score[0] });

  assert.equal((await request('open', { session: '' })).status, 400);
  assert.equal((await request('open', { session: 'missing' })).status, 409);
  assert.equal((await request('open', { padding: 'x'.repeat(8192) })).status, 400);
  assert.equal(await move('state'), null);
  let { match: first } = await call('hgame_open', {});
  assert.equal((await move('state')).id, first.id);
  first = await move('unlimited', { matchId: first.id, revision: first.revision, enabled: true });
  assert.equal(first.board.unlimitedRolls, true);
  first = await move('unlimited', { matchId: first.id, revision: first.revision, enabled: false });
  assert.equal(first.board.unlimitedRolls, false);
  assert.equal((await call('hgame_state', {}, { session: { id: 'session-b' } })).match, null);
  await assert.rejects(call('hgame_act', command(first, roll)), /座位/);
  let match = first;
  for (let round = 0; round < 12; round++) {
    const old = command(match, roll);
    match = await move('act', old);
    assert.equal((await request('act', old)).status, 400);
    match = await move('act', command(match, score(match)));
    assert.equal(match.seat, 'agent');
    const wakeCount = wakes.length;
    await move('wake');
    assert.equal(wakes.length, wakeCount, 'a retry must not enqueue the same revision twice');
    assert.equal((await request('act', command(match, roll))).status, 400);
    match = (await call('hgame_act', command(match, roll))).match;
    const heldFace = match.board.dice[0];
    match = (await call('hgame_act', command(match, { type: 'roll', keep: [0] }))).match;
    assert.equal(match.board.dice[0], heldFace);
    match = (await call('hgame_act', command(match, score(match)))).match;
  }
  assert.equal(match.seat, null);
  assert.equal(match.board.players.every(player => Object.keys(player.sheet).length === 12), true);
  assert.equal(wakes.length, 12);
  assert.equal(wakes[0].source.kind, 'dsh-hgame');
  const restarted = await move('open', { restart: true });
  assert.notEqual(restarted.id, match.id);
  assert.equal((await request('act', command(match, roll))).status, 400);
});
