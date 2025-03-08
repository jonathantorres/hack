#! /usr/bin/env node

import { VirtualMachine } from '../src/vm.js';

try {
    const vm = new VirtualMachine(process.argv.splice(2));
    vm.translate();
} catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
}
