const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const test = require('ava');

const { BlockMap } = require('../');

test('it generates blockmap from a small string', async (t) => {
  const b = new BlockMap();

  await pipeline([ 'hello' ], b);

  t.deepEqual(b.chunks, [
    { size: 5, digest: '7wvIW6De/c95vuIIqueEFrhg' },
  ]);
  t.deepEqual(b.stats, {
    size: 5,
    sha512: 'm3HSJL1i83hdltRq0+o9czGb+8KJDKra4t/3JRln' +
      'PKcjI8PZm6XBHXx6zG4UuMXaDEZjR1wuXDre9G9zvN7AQw==',
  });
});

test('it generates blockmap from a large string', async (t) => {
  const b = new BlockMap();

  await pipeline([ 'hello'.repeat(16 * 1024) ], b);

  t.deepEqual(b.chunks, [
    { size: 32768, digest: 'F0T0sNKGJZFbmeQxfzJNr57j' },
    { size: 32768, digest: 'X1pU5Kd8VtOZEuT0ZnUQ8CFb' },
    { size: 16384, digest: 'rS/Xx91IBXZeCuzg5KoQhG1O' },
  ]);
  t.deepEqual(b.stats, {
    size: 81920,
    sha512: '8x/RRmNq/nAe8NN7Y+yp8HnqBX5ISYhiIeAJu6b+xL' +
      'GY6BFyBCI1s7fL0O7vWVOvLWExgoFtXIXCE43Dz4i4OA==',
  });
});

test('it produces correct JSON object for a small string', async (t) => {
  const b = new BlockMap();

  await pipeline([ 'hello' ], b);

  t.deepEqual(b.toObject(), {
    version: '2',
    files: [ {
      name: 'file',
      offset: 0,
      sizes: [ 5 ],
      checksums: [ '7wvIW6De/c95vuIIqueEFrhg' ],
    } ],
  });
  t.deepEqual(b.stats, {
    size: 5,
    sha512: 'm3HSJL1i83hdltRq0+o9czGb+8KJDKra4t/3JRln' +
      'PKcjI8PZm6XBHXx6zG4UuMXaDEZjR1wuXDre9G9zvN7AQw==',
  });
});

test('it generates blockmap from large semi-random stream', async (t) => {
  const b = new BlockMap();

  await pipeline(function* a() {
    const plain = Buffer.alloc(4);
    for (let i = 0; i < 1024; i++) {
      plain.writeUInt32LE(i);
      yield crypto.createHash('sha512').update(plain).digest();
    }
  }, b);

  t.deepEqual(b.chunks, [
    { size: 13947, digest: '0A78DQjFl2lOxv5Tze5Gq72H' },
    { size: 21527, digest: '5xSHHN6nQh+UrcauhrgyD6Pc' },
    { size: 30062, digest: 'ZS3JbX8laQK4QqvDkckT/HQj' },
  ]);
  t.deepEqual(b.stats, {
    size: 65536,
    sha512: 'N5BV4bWmrSASyxqePCmoRyv/adMtbTYexywJSPHgMO' +
      'y1zDL/kkWNsnyX1OFw4piOcDEyrt01zzuJ8Jrm2/tjEQ==',
  });
});
