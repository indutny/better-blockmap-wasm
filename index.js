const zlib = require('zlib');
const { Writable } = require('stream');

const { Chunker } = require('./pkg');

class BlockMap extends Writable {
  constructor({ detectZipBoundary = false } = {}) {
    super();

    this._chunker = new Chunker(detectZipBoundary);
    this._stats = undefined;
    this._chunks = [];
  }

  get chunks() {
    if (!this._stats) {
      throw new Error('BlockMap is not finished yet');
    }

    return this._chunks;
  }

  get stats() {
    if (!this._stats) {
      throw new Error('BlockMap is not finished yet');
    }

    return this._stats;
  }

  toObject() {
    return {
      version: '2',
      files: [ {
        name: 'file',
        offset: 0,
        checksums: this.chunks.map(({ digest }) => digest),
        sizes: this.chunks.map(({ size }) => size),
      } ],
    };
  }

  compress(compression = 'gzip') {
    const json = Buffer.from(JSON.stringify(this.toObject()));
    const opts = { level: 9 };

    if (compression === 'gzip') {
      return zlib.gzipSync(json, opts);
    }

    if (compression !== 'deflate') {
      throw new Error(`Unexpected compression type: "${compression}"`);
    }

    return zlib.deflateRawSync(json, opts);
  }

  _destroy(_, callback) {
    this._chunker.free();
    callback();
  }

  _write(data, enc, callback) {
    this._addChunks(this._chunker.update(Buffer.from(data, enc)));
    callback();
  }

  _final(callback) {
    const [ size, sha512, ...chunks ] = this._chunker.finalize_reset();
    this._addChunks(chunks);
    this._stats = { size, sha512 };
    callback();
  }

  _addChunks(arr) {
    for (let i = 0; i < arr.length; i += 2) {
      this._chunks.push({
        size: arr[i],
        digest: arr[i + 1],
      });
    }
  }
}
exports.BlockMap = BlockMap;
