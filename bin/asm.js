#!/usr/bin/env node

import Assembler from '../src/assembler.js';

try {
    const asm = new Assembler(process.argv.slice(2));
    asm.assemble();
} catch (e) {
    console.error(e);
    process.exit(1);
}
