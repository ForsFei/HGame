import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('.', import.meta.url));
const destination = resolve(process.argv[2] ?? process.cwd());
const stage = await mkdtemp(join(tmpdir(), 'dsh-hgame-pack-'));
const files = ['client.js', 'cordis.patch.yml', 'index.js', 'matches.js', 'README.md'];
await Promise.all(files.map(file => copyFile(join(source, file), join(stage, file))));

const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
delete manifest.scripts;
await writeFile(join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');

const engine = '../../games/001-YachtDice/public/engine.js';
await copyFile(resolve(source, engine), join(stage, 'yacht-engine.js'));
const adapter = await readFile(join(source, 'yacht.js'), 'utf8');
if (!adapter.includes(engine)) throw new Error('未找到快艇骰子规则引擎引用。');
await writeFile(join(stage, 'yacht.js'), adapter.replace(engine, './yacht-engine.js'));

const npm = process.env.npm_execpath;
if (!npm) throw new Error('请使用 npm run pack:local 打包。');
const result = spawnSync(process.execPath, [npm, 'pack', stage, '--pack-destination', destination], {
  stdio: 'inherit',
  windowsHide: true,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
