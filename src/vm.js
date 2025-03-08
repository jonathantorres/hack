import path from 'node:path';
import * as fs from 'node:fs/promises';

import { VMCommand } from './command.js';
import { CodeGen } from './generator.js';

export class VirtualMachine {
    #files = [];

    constructor(files) {
        this.#files = files;
    }

    translate() {
        if (this.#files.length === 0) {
            throw new Error('No files to translate');
        }

        for (const file of this.#files) {
            this.#translateFile(file);
        }
    }

    async #translateFile(filePath) {
        const fileElements = path.parse(filePath);

        // make sure the extension is "vm"
        if (fileElements.ext !== '.vm') {
            throw new Error(`Invalid file extension: ${fileElements.ext}`);
        }

        // make sure the first letter of the name of the file is uppercase
        if (fileElements.name[0] !== fileElements.name[0].toUpperCase()) {
            throw new Error(
                `Error: The first character of the file name must be uppercase: ${fileElements.name}`
            );
        }

        // open and read the file contents
        let commands = [];
        try {
            const fileHandle = await fs.open(filePath);
            const fileContents = await fileHandle.readFile({
                encoding: 'utf-8',
            });

            commands = fileContents.split('\n');
        } catch (e) {
            throw new Error(`Error opening VM file: ${e.message}`);
        }

        // parse and generate code for each VM command
        let program = [];
        for (const cmd of commands) {
            const command = cmd.trim();

            // skip empty lines
            if (command.length === 0) {
                continue;
            }

            // skip comments
            if (command[0] === '/' && command[1] === '/') {
                continue;
            }

            try {
                // this would parse the command and return
                // a new object that represents the VM Command
                const vmCmd = new VMCommand(command);

                // The code generator gets the VM Command Object
                const gen = new CodeGen(fileElements.name, vmCmd);

                // and return an array of assembly instructions
                const instructions = gen.emit();

                // push every instruction generated from the command
                for (const inst of instructions) {
                    program.push(inst);
                }
            } catch (e) {
                throw new Error(`Parsing error: ${e.message}`);
            }
        }

        // create destination file with instructions
        const destFilePath =
            fileElements.dir + '/' + fileElements.name + '.asm';

        try {
            const handle = await fs.open(destFilePath, 'w+');
            await fs.writeFile(handle, program.join('\n'));
        } catch (e) {
            throw new Error(`${e.message}`);
        }
    }
}
