import path from 'node:path';
import * as fs from 'node:fs/promises';

import { VMCommand } from './command.js';
import { CodeGen } from './generator.js';

export class VirtualMachine {
    #locations = [];
    #functionCallMap = null;

    constructor(locations) {
        this.#locations = locations;
        this.#functionCallMap = new Map();
    }

    async translate() {
        // no path/location provided, use the current directory
        if (this.#locations.length === 0) {
            this.#locations.push(process.cwd());
        }

        for (const location of this.#locations) {
            const currentPath = path.parse(location);

            // location is just a single file
            if (currentPath.ext) {
                this.#translateAndSaveFile(location);
                continue;
            }

            // location is a directory of VM files
            let vmFiles = [];
            let asmFileName = currentPath.base;

            // open directory and get all of the VM files
            try {
                const files = await fs.readdir(location);

                for (const file of files) {
                    const currentFilePath = path.parse(file);

                    if (currentFilePath.ext === '.vm') {
                        vmFiles.push(file);
                    }
                }
            } catch (err) {
                throw new Error(`${e.message}`);
            }

            if (vmFiles.length === 0) {
                throw new Error(`No VM files to translate in ${location}`);
            }

            let program = this.#genBootstrap();
            let progLocation = location;

            // make sure program location ends with /
            if (!progLocation.endsWith('/')) {
                progLocation += '/';
            }

            for (const file of vmFiles) {
                const translated = await this.#translateFile(
                    progLocation + file
                );

                for (const inst of translated) {
                    program.push(inst);
                }
            }

            // export final program
            const progPath = progLocation + asmFileName + '.asm';
            try {
                const handle = await fs.open(progPath, 'w+');
                await fs.writeFile(handle, program.join('\n'));
            } catch (e) {
                throw new Error(`${e.message}`);
            }
        }
    }

    async #translateAndSaveFile(filePath) {
        const program = await this.#translateFile(filePath);

        // create destination file with instructions
        const fileElements = path.parse(filePath);
        const destFilePath =
            fileElements.dir + '/' + fileElements.name + '.asm';

        try {
            const handle = await fs.open(destFilePath, 'w+');
            await fs.writeFile(handle, program.join('\n'));
        } catch (e) {
            throw new Error(`${e.message}`);
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
                const gen = new CodeGen(
                    fileElements.name,
                    vmCmd,
                    this.#functionCallMap
                );

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

        return program;
    }
    #genBootstrap() {
        // bootstrapping code initializes the stack and calls Sys.init
        // SP = 256
        const instructions = ['@256', 'D=A', '@0', 'M=D'];

        // call Sys.init 0
        const vmCmd = new VMCommand('call Sys.init 0');
        const gen = new CodeGen('', vmCmd, this.#functionCallMap);
        const initInstructions = gen.emit();

        for (const inst of initInstructions) {
            instructions.push(inst);
        }
        return instructions;
    }
}
