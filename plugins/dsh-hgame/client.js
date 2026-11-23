window.__ModuleLoader__.load({
  id: 'dsh-hgame',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const buttonStyle = {
      padding: '6px 10px', border: '1px solid #d8e0ea', borderRadius: 3,
      background: '#fff', color: '#1e2b3a', cursor: 'pointer', font: 'inherit',
    };
    const cellStyle = { padding: '6px 10px', borderBottom: '1px solid #8884', textAlign: 'left' };
    const metrics = {
      ones: ['sum(1)', '值为 1 的字段之和'], twos: ['sum(2)', '值为 2 的字段之和'],
      threes: ['sum(3)', '值为 3 的字段之和'], fours: ['sum(4)', '值为 4 的字段之和'],
      fives: ['sum(5)', '值为 5 的字段之和'], sixes: ['sum(6)', '值为 6 的字段之和'],
      choice: ['sum(*)', '全部字段之和'], four: ['repeat(4)', '至少四个字段相同，取全部字段之和'],
      house: ['group(3,2)', '严格分为三个相同值与两个相同值，取全部字段之和'],
      small: ['sequence(4)', '包含四个连续值，写入 15'],
      large: ['sequence(5)', '五个连续值，写入 30'], yacht: ['repeat(5)', '五个相同值，写入 50'],
    };
    function quietMessage(text) {
      return text.replaceAll('对局', '任务').replaceAll('游戏', '工作台').replaceAll('掷骰', '采样')
        .replaceAll('骰子', '字段').replaceAll('计分项', '指标').replaceAll('局面', '状态').replaceAll('座位', '线程');
    }

    async function request(session, method, payload = {}, signal) {
      const response = await fetch('api/dsh-hgame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, session, method }),
        signal,
      });
      if (response.status === 401 || response.status === 403) throw new Error('请先连接 DSH 会话。');
      const data = await response.json();
      if (!response.ok) throw new Error(quietMessage(data.error || '任务服务暂不可用。'));
      return data;
    }

    function GamePanel({ session }) {
      const [match, setMatch] = React.useState(null);
      const [keep, setKeep] = React.useState([]);
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      const [notice, setNotice] = React.useState('');
      const requestScope = React.useRef(null);
      const mutation = React.useRef({ epoch: 0, busy: false });

      React.useEffect(() => {
        const scope = new AbortController();
        requestScope.current = scope;
        let timer;
        async function refresh() {
          const epoch = mutation.current.epoch;
          try {
            const data = await request(session, 'state', {}, scope.signal);
            if (!scope.signal.aborted && epoch === mutation.current.epoch && !mutation.current.busy) {
              setMatch(data.match);
            }
          } catch (err) {
            if (!scope.signal.aborted) setError(err.message);
          } finally {
            if (!scope.signal.aborted) timer = setTimeout(refresh, 900);
          }
        }
        refresh();
        return () => { scope.abort(); clearTimeout(timer); };
      }, [session]);

      React.useEffect(() => setKeep([]), [match?.id, match?.revision]);

      async function send(route, payload) {
        const scope = requestScope.current;
        if (mutation.current.busy || !scope || scope.signal.aborted) return;
        mutation.current = { epoch: mutation.current.epoch + 1, busy: true };
        setBusy(true);
        setError('');
        setNotice('');
        try {
          const data = await request(session, route, payload, scope.signal);
          if (!scope.signal.aborted) {
            setMatch(data.match);
            setNotice(data.notice ?? '');
          }
        } catch (err) {
          if (!scope.signal.aborted) setError(err.message);
        } finally {
          mutation.current = { epoch: mutation.current.epoch + 1, busy: false };
          if (!scope.signal.aborted) setBusy(false);
        }
      }
      function act(action) {
        return send('act', { matchId: match.id, revision: match.revision, action });
      }
      function button(label, onClick, disabled = false, extra = {}) {
        return h('button', { type: 'button', style: buttonStyle, onClick, disabled, ...extra }, label);
      }

      const board = match?.board;
      const humanTurn = match?.seat === 'human';
      const agentTurn = match?.seat === 'agent';
      const finished = board && !match.seat;
      const result = finished
        ? board.players[0].total === board.players[1].total ? 'equal'
          : board.players[0].total > board.players[1].total ? 'local ahead' : 'remote ahead'
        : null;

      return h('section', {
        className: 'dsh-hgame-runtime',
        tabIndex: 0,
        onKeyDown(event) {
          if (event.code !== 'KeyC' || !event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.repeat) return;
          if (event.target.closest('input, textarea, select, [contenteditable=true]')) return;
          event.preventDefault();
          if (match) send('unlimited', { matchId: match.id, revision: match.revision, enabled: !board.unlimitedRolls });
        },
        style: { flex: 1, minWidth: 0, overflow: 'auto', padding: 20, fontSize: 12, lineHeight: 1.6,
          background: '#f4f6f9', color: '#1e2b3a', colorScheme: 'light',
          fontFamily: 'Consolas, "Cascadia Code", "Microsoft YaHei", monospace' },
      },
      h('style', null, '.dsh-hgame-runtime button:disabled{opacity:.45;cursor:default}'
        + '.dsh-hgame-runtime button:enabled:hover{background:#edf2f8}'
        + '.dsh-hgame-runtime button:focus-visible{outline:2px solid #33608c;outline-offset:2px}'
        + '.dsh-hgame-runtime button[aria-pressed=true]{border-color:#33608c;background:#edf2f8}'
        + '.dsh-hgame-runtime th{font-weight:500}.dsh-hgame-runtime p{margin:8px 0}'),
      h('h2', { style: { fontSize: 14, fontWeight: 600, margin: '0 0 8px' } }, 'Runtime / sample-worker'),
      h('p', { style: { color: '#63758a' } }, 'local 由你操作，remote 由当前会话处理。两个线程各写入 12 项指标，每批最多采样 3 次。'),
      h('p', { style: { color: '#63758a' } }, 'Alt+Shift+C · 切换本地采样额度 · ' + (board?.unlimitedRolls ? 'extended' : 'standard')),
      error && h('p', { role: 'alert' }, quietMessage(error)),
      notice && h('p', { role: 'status' }, quietMessage(notice)),
      !board && button('初始化任务', () => send('open', { game: 'yacht-dice' }), busy),
      board && h(React.Fragment, null,
        h('p', { role: 'status' }, finished ? 'exit 0 · ' + result
          : (agentTurn ? 'remote' : 'local') + ' · sample ' + board.rolls + '/' + (humanTurn && board.unlimitedRolls ? '∞' : '3') + ' · rev ' + match.revision),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6, margin: '12px 0', maxWidth: 640 } },
          ...Array.from({ length: 5 }, (_, index) => button(
            h('span', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 } },
              h('small', { style: { color: '#63758a', fontSize: 10 } }, 's[' + index + ']'),
              h('span', { style: { fontSize: 20, fontVariantNumeric: 'tabular-nums' } }, board.dice[index] ?? '—'),
              h('small', { style: { fontSize: 10 } }, keep.includes(index) ? 'fixed' : 'mutable'),
            ),
            () => setKeep(previous => previous.includes(index)
              ? previous.filter(item => item !== index)
              : previous.length < 4 ? [...previous, index] : previous),
            busy || !humanTurn || !board.actions.roll || !board.rolls,
            { key: index, 'aria-pressed': keep.includes(index), 'aria-label': '字段 ' + index + '，值 ' + (board.dice[index] ?? '未采样') + (keep.includes(index) ? '，已固定' : '，可更新') },
          )),
        ),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 } },
          humanTurn && board.actions.roll && button(board.rolls ? '重新采样' : '运行采样', () => act({ type: 'roll', keep }), busy),
          agentTurn && button('恢复远端任务', () => send('wake'), busy),
          finished && button('重新初始化', () => send('open', { restart: true }), busy),
        ),
        h('p', { style: { color: '#63758a' } }, '点击字段切换 fixed / mutable，最多固定四项。选择一个未写入的指标以结束当前批次。'),
        board.lastScore && h('p', null, 'commit · ' + (board.lastScore.name === board.players[0].name ? 'local' : 'remote') + ' · '
          + (metrics[board.lastScore.key]?.[0] ?? board.lastScore.key) + ' = ' + board.lastScore.points),
        h('div', { style: { overflowX: 'auto', maxWidth: 640 } },
        h('table', { style: { borderCollapse: 'collapse', width: '100%', background: '#fff' } },
          h('thead', null, h('tr', null,
            h('th', { style: cellStyle }, '指标'),
            ...board.players.map((player, index) => h('th', { key: player.name, style: cellStyle }, (index ? 'remote' : 'local') + ' · ' + player.total)),
            h('th', { style: cellStyle }, '写入'),
          )),
          h('tbody', null, ...board.categories.map(category => h('tr', { key: category.id },
            h('th', { scope: 'row', style: cellStyle, title: metrics[category.id]?.[1] }, metrics[category.id]?.[0] ?? category.id),
            ...board.players.map(player => h('td', { key: player.name, style: cellStyle }, player.sheet[category.id] ?? '—')),
            h('td', { style: cellStyle }, humanTurn && board.actions.score.includes(category.id)
              ? button('写入 ' + category.preview, () => act({ type: 'score', category: category.id }), busy,
                { 'aria-label': (metrics[category.id]?.[0] ?? category.id) + ' 写入 ' + category.preview })
              : null),
          ))),
        )),
        h('p', { style: { color: '#63758a' } }, '前六项累计达到 63，追加 35。悬停指标名称可查看计算规则。'),
      ));
    }

    function GameView({ sessionId }) {
      return sessionId
        ? h(GamePanel, { session: sessionId, key: sessionId })
        : h('p', null, '请先打开一条 DSH 会话。');
    }

    return {
      name: 'dsh-hgame',
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.view', () => ctx.slots.register({
          name: 'conversation.view', id: 'hgame', order: 35, label: () => '终端',
        }, GameView));
      },
    };
  },
});
