# better-blockmap-wasm

Wasm bindings for [better-blockmap][0].

## Installing

```sh
npm install --global better-blockmap
```

## Running

```sh
$ better-blockmap --help
Options:
      --help                 Show help                                 [boolean]
      --version              Show version number                       [boolean]
  -i, --input                Input binary file               [string] [required]
  -o, --output               Output blockmap file (if absent - append to input
                             file)                                      [string]
  -c, --compression          Compression
                                  [choices: "gzip", "deflate"] [default: "gzip"]
  -z, --detect-zip-boundary  Use zip file boundaries for splitting chunks
                                                                       [boolean]
```

## Building

```sh
npm install
npm run prepublish
```

[0]: https://github.com/indutny/better-blockmap
