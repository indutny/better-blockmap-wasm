const crypto = require('crypto');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { createWriteStream } = require('fs');
const { mkdtemp, copyFile, rm, readFile } = require('fs/promises');
let { execFile } = require('child_process');
let { pipeline }  = require('stream');
const { promisify } = require('util');
const test = require('ava');

execFile = promisify(execFile);
pipeline = promisify(pipeline);

const ourBinary = path.join(__dirname, '..', 'bin', 'blockmap.js');
const { appBuilderPath } = require('app-builder-bin');

test.beforeEach(async (t) => {
  const tmpDir = await mkdtemp(os.tmpdir());
  const input = path.join(tmpDir, 'app.bin');

  const us = path.join(tmpDir, 'app.bin.us');
  const them = path.join(tmpDir, 'app.bin.them');

  await pipeline(
    function* () {
      for (let i = 0; i < 32; i++) {
        yield crypto.randomBytes(1024 * 1024);
      }
    },
    createWriteStream(input),
  );

  t.context.data = { tmpDir, input, us, them };
});

test.afterEach(async (t) => {
  await rm(t.context.data.tmpDir, { recursive: true });
});

async function run(what, args) {
  if (what === 'better-blockmap') {
    return execFile(process.execPath, [ ourBinary, ...args ]);
  }

  if (what !== 'app-builder-bin') {
    throw new Error(`Unsupported binary: "${what}"`);
  }

  return execFile(appBuilderPath, [ 'blockmap', ...args ]);
}

test('it is compatible to app-builder-bin in gzip mode', async (t) => {
  const data = t.context.data;
  await Promise.all([
    run('better-blockmap', [ '-i', data.input, '-o', data.us ]),
    run('app-builder-bin', [ '-i', data.input, '-o', data.them ]),
  ]);

  const us = zlib.gunzipSync(await readFile(data.us));
  const them = zlib.gunzipSync(await readFile(data.them));

  t.true(us.equals(them));
});

test('it is compatible to app-builder-bin in deflate mode', async (t) => {
  const data = t.context.data;
  await Promise.all([
    run(
      'better-blockmap',
      [ '-i', data.input, '-c', 'deflate', '-o', data.us ],
    ),
    run(
      'app-builder-bin',
      [ '-i', data.input, '-c', 'deflate', '-o', data.them ],
    ),
  ]);

  const us = zlib.inflateRawSync(await readFile(data.us));
  const them = zlib.inflateRawSync(await readFile(data.them));

  t.true(us.equals(them));
});

test('it is compatible to app-builder-bin in append mode', async (t) => {
  const data = t.context.data;

  await Promise.all([
    copyFile(data.input, data.us),
    copyFile(data.input, data.them),
  ]);

  await Promise.all([
    run('better-blockmap', [ '-i', data.us ]),
    run('app-builder-bin', [ '-i', data.them ]),
  ]);

  let us = await readFile(data.us);
  let them = await readFile(data.them);

  const ourSize = us.readUint32BE(us.length - 4);
  const theirSize = them.readUint32BE(them.length - 4);

  us = us.slice(us.length - 4 - ourSize, us.length - 4);
  them = them.slice(them.length - 4 - theirSize, them.length - 4);

  us = zlib.gunzipSync(us);
  them = zlib.gunzipSync(them);

  t.true(us.equals(them));
});
