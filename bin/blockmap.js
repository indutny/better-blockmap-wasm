#!/usr/bin/env node
const { createReadStream } = require('fs');
const { open, writeFile } = require('fs/promises');
const { pipeline }  = require('stream/promises');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { BlockMap } = require('../');

const argv = yargs(hideBin(process.argv))
  .option('i', {
    alias: 'input',
    describe: 'Input binary file',
    type: 'string',
    demandOption: true,
  })
  .option('o', {
    alias: 'output',
    describe: 'Output blockmap file (if absent - append to input file)',
    type: 'string',
  })
  .option('c', {
    alias: 'compression',
    describe: 'Compression',
    default: 'gzip',
    choices: [ 'gzip', 'deflate' ],
  })
  .option('z', {
    alias: 'detect-zip-boundary',
    describe: 'Use zip file boundaries for splitting chunks',
    type: 'boolean',
  })
  .parse();

async function main() {
  const input = createReadStream(argv.input);
  const blockMap = new BlockMap({
    detectZipBoundary: argv.detectZipBoundary,
  });
  await pipeline(input, blockMap);

  const output = blockMap.compress(argv.compression);

  if (argv.output) {
    await writeFile(argv.output, output);
  } else {
    const f = await open(argv.input, 'a');
    const size = Buffer.alloc(4);
    size.writeUint32BE(output.length);
    await f.write(output);
    await f.write(size);
    await f.close();
  }
  console.log(JSON.stringify(blockMap.stats));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
