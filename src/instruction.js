const compTable = new Map([
    ['0', '101010'],
    ['1', '111111'],
    ['-1', '111010'],
    ['D', '001100'],
    ['A', '110000'],
    ['!D', '001101'],
    ['!A', '110001'],
    ['-D', '001111'],
    ['-A', '110011'],
    ['D+1', '011111'],
    ['A+1', '110111'],
    ['D-1', '001110'],
    ['A-1', '110010'],
    ['D+A', '000010'],
    ['D-A', '010011'],
    ['A-D', '000111'],
    ['D&A', '000000'],
    ['D|A', '010101'],
]);

const compATable = new Map([
    ['M', '110000'],
    ['!M', '110001'],
    ['-M', '110011'],
    ['M+1', '110111'],
    ['M-1', '110010'],
    ['D+M', '000010'],
    ['D-M', '010011'],
    ['M-D', '000111'],
    ['D&M', '000000'],
    ['D|M', '010101'],
]);

const destTable = new Map([
    ['null', '000'],
    ['M', '001'],
    ['D', '010'],
    ['DM', '011'],
    ['MD', '011'],
    ['A', '100'],
    ['AM', '101'],
    ['MA', '101'],
    ['AD', '110'],
    ['DA', '110'],
    ['ADM', '111'],
]);

const jmpTable = new Map([
    ['null', '000'],
    ['JGT', '001'],
    ['JEQ', '010'],
    ['JGE', '011'],
    ['JLT', '100'],
    ['JNE', '101'],
    ['JLE', '110'],
    ['JMP', '111'],
]);

export const InstructionKind = {
    A: Symbol('a'),
    C: Symbol('c'),
};

export class Instruction {
    #kind = null;
    #instructionText = null;

    // the value of the instruction (only used for A instructions)
    #value = null;

    // operations from a C instruction
    #dest = null;
    #comp = null;
    #jmp = null;

    constructor(inst) {
        this.#instructionText = inst;

        if (inst[0] === '@') {
            this.#kind = InstructionKind.A;
        } else {
            this.#kind = InstructionKind.C;
        }

        this.#parse();
    }

    #parse() {
        let commentIndex = this.#instructionText.indexOf('//', 0);

        // remove any comments from the instruction
        if (commentIndex !== -1) {
            this.#instructionText = this.#instructionText
                .substring(0, commentIndex)
                .trim();
        }

        if (this.#kind === InstructionKind.A) {
            // remove the @
            this.#instructionText = this.#instructionText.slice(1).trim();

            // try to convert to number
            const value = parseInt(this.#instructionText);

            if (isNaN(value)) {
                this.#value = this.#instructionText;
            } else {
                this.#value = value;
            }
        } else if (this.#kind === InstructionKind.C) {
            this.#dest = 'null';
            this.#jmp = 'null';

            if (this.#instructionText.includes('=')) {
                // instruction is an assignment
                const assign = this.#instructionText.split('=');
                const dest = assign[0].trim();
                const comp = assign[1].trim();

                this.#dest = dest;
                this.#comp = comp;
            } else if (this.#instructionText.includes(';')) {
                // instruction is a jump
                const op = this.#instructionText.split(';');
                const comp = op[0].trim();
                const jmp = op[1].trim();

                this.#comp = comp;
                this.#jmp = jmp;
            }
        }
    }

    encode() {
        // return binary representation of the instruction
        if (this.#kind === InstructionKind.A) {
            let binary = this.#value.toString(2).padStart(15, '0');
            return '0' + binary;
        } else if (this.#kind === InstructionKind.C) {
            return (
                '111' +
                this.#encodeA() +
                this.#encodeComp() +
                this.#encodeDest() +
                this.#encodeJmp()
            );
        }
    }

    #encodeA() {
        if (this.#comp.includes('M')) {
            return '1';
        }
        return '0';
    }

    #encodeComp() {
        let compMap = null;

        if (this.#comp.includes('M')) {
            compMap = compATable;
        } else {
            compMap = compTable;
        }

        if (!compMap.has(this.#comp)) {
            throw new Error(`Invalid comp instruction: ${this.#comp}`);
        }

        return compMap.get(this.#comp);
    }

    #encodeDest() {
        if (!destTable.has(this.#dest)) {
            throw new Error(`Invalid dest instruction: ${this.#dest}`);
        }

        return destTable.get(this.#dest);
    }

    #encodeJmp() {
        if (!jmpTable.has(this.#jmp)) {
            throw new Error(`Invalid jmp instruction: ${this.#jmp}`);
        }

        return jmpTable.get(this.#jmp);
    }

    getKind() {
        return this.#kind;
    }

    // get the value of an A instruction
    getValue() {
        return this.#value;
    }

    // set the value of an A instruction
    setValue(value) {
        this.#value = value;
    }
}
