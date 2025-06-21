#! /usr/bin/env node

import { Compiler } from '../src/compiler.js';

try {
    const jack = new Compiler(process.argv.splice(2));
    jack.compile();
} catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
}
