# hack

The Hack Computer Platform. It includes an assembler, virtual machine and a compiler.

## Installation

Install with `npm` directly from the GitHub repository. Now 3 binaries in total will be available on your `PATH`, one for each program.

```bash
npm install -g git://github.com/jonathantorres/hack
```

## Requirements

At least Node.js 18 is required.

## Running the Assembler

Run the binary with `asm` and specify the assembly file(s) that you would like to assemble.

```bash
asm <path to .asm file>
```

## Running the Virtual Machine Translator

Run the binary with `vm` and specify the virtual machine file(s) that you would like to translate.

```bash
vm <path to .vm file>
```

## Running the Jack Compiler

Run the binary with `jack` and specify the Jack file(s) that you would like to compile.

```bash
jack <path to .jack file>
```

## License

MIT
