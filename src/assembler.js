import fs from 'node:fs/promises';
import path from 'node:path';
import { Instruction, InstructionKind } from './instruction.js';

const symbolTable = new Map([
    ['R0', 0],
    ['R1', 1],
    ['R2', 2],
    ['R3', 3],
    ['R4', 4],
    ['R5', 5],
    ['R6', 6],
    ['R7', 7],
    ['R8', 8],
    ['R9', 9],
    ['R10', 10],
    ['R11', 11],
    ['R12', 12],
    ['R13', 13],
    ['R14', 14],
    ['R15', 15],
    ['SP', 0],
    ['LCL', 1],
    ['ARG', 2],
    ['THIS', 3],
    ['THAT', 4],
    ['SCREEN', 16384],
    ['KBD', 24576],
]);

export default class Assembler {
    #files = null;
    #varAddr = 16;

    constructor(files) {
        if (files.length === 0) {
            throw new Error('At least 1 file must be provided');
        }

        this.#files = files;
    }

    assemble() {
        for (const file of this.#files) {
            this.#assembleFile(file);
        }
    }

    async #assembleFile(filePath) {
        const filePathParts = path.parse(filePath);

        if (filePathParts.ext !== '.asm') {
            throw new Error(`Invalid file extension: ${filePathParts.ext}`);
        }

        let lines = [];
        try {
            const fileHandle = await fs.open(filePath, 'r');
            const fileContents = await fileHandle.readFile({
                encoding: 'utf-8',
            });
            lines = fileContents.split('\n');

            await fileHandle.close();
        } catch (e) {
            throw new Error(`${e.message}`);
        }

        if (lines.length === 0) {
            throw new Error(`File ${filePath} does not have any contents`);
        }

        let lineNumber = 0;
        let instructions = [];

        // first pass: store labels in the symbol table and record their index to remove them
        for (const line of lines) {
            const currentLine = line.trim();

            // ignore empty lines
            if (currentLine.length === 0) {
                continue;
            }

            // ignore comments
            if (currentLine[0] === '/' && currentLine[1] === '/') {
                continue;
            }

            if (currentLine[0] == '(') {
                let labelName = currentLine.replaceAll('(', '');
                labelName = labelName.replaceAll(')', '');
                symbolTable.set(labelName.trim(), lineNumber);
                continue;
            }
            instructions.push(currentLine);
            lineNumber++;
        }

        let encodedInstructions = [];

        // second pass, resolve symbols and encode binary instructions
        for (const inst of instructions) {
            let instruction = new Instruction(inst.trim());

            if (instruction.getKind() === InstructionKind.A) {
                const instValue = instruction.getValue();
                const value = parseInt(instValue, 10);
                // the instruction is a symbol, look it up in the table or allocate it
                if (isNaN(value)) {
                    if (symbolTable.has(instValue)) {
                        instruction.setValue(symbolTable.get(instValue));
                    } else {
                        symbolTable.set(instValue, this.#varAddr);
                        instruction.setValue(symbolTable.get(instValue));
                        this.#varAddr++;
                    }
                }
            } else if (instruction.getKind() === InstructionKind.C) {
                // nothing to do, the instruction will be encoded below
            } else {
                throw new Error(`Invalid instruction: ${inst}`);
            }

            encodedInstructions.push(instruction.encode());
        }

        // create destination hack file
        const destFilePath =
            filePathParts.dir + '/' + filePathParts.name + '.hack';

        try {
            const handle = await fs.open(destFilePath, 'w+');
            await fs.writeFile(handle, encodedInstructions.join('\n'));
        } catch (e) {
            throw new Error(`${e.message}`);
        }
    }
}
