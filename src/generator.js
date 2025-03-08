import { CommandType } from './command.js';

export class CodeGen {
    #command = null;
    #namespace = null;

    constructor(namespace, command) {
        this.#namespace = namespace;
        this.#command = command;
    }

    emit() {
        let instructions = [];

        switch (this.#command.getType()) {
            case CommandType.ARITHMETIC:
                instructions = this.#genArith();
                break;
            case CommandType.PUSH:
                instructions = this.#genPush();
                break;
            case CommandType.POP:
                instructions = this.#genPop();
                break;
            default:
                throw new Error(
                    `Error: emitting invalid command: ${this.#command.getType().toString()}`
                );
        }

        return instructions;
    }
    #genArith() {
        const op = this.#command.arg1();
        let instructions = [];
        let push = null;
        let pop = null;
        let trueLabel = '';
        let falseLabel = '';

        switch (op) {
            case 'add':
                // pop value from the stack and store it in R14
                instructions = this.#popStack();
                instructions.push('@R14');
                instructions.push('M=D');

                // pop value from the stack, and store it in R13
                pop = this.#popStack();
                for (const p of pop) {
                    instructions.push(p);
                }
                instructions.push('@R13');
                instructions.push('M=D');

                // D = R13 + R14
                instructions.push('@R13');
                instructions.push('D=M');
                instructions.push('@R14');
                instructions.push('D=D+M');

                // push D (the result) into the stack
                push = this.#pushStack();
                for (const p of push) {
                    instructions.push(p);
                }
                break;
            case 'sub':
                // pop value from the stack and store it in R14
                instructions = this.#popStack();
                instructions.push('@R14');
                instructions.push('M=D');

                // pop value from the stack, and store it in R13
                pop = this.#popStack();
                for (const p of pop) {
                    instructions.push(p);
                }
                instructions.push('@R13');
                instructions.push('M=D');

                // D = R13 - R14
                instructions.push('@R13');
                instructions.push('D=M');
                instructions.push('@R14');
                instructions.push('D=D-M');

                // push D (the result) into the stack
                push = this.#pushStack();
                for (const p of push) {
                    instructions.push(p);
                }
                break;
            case 'neg':
                // pop value from the stack
                instructions = this.#popStack();

                // D = -D
                instructions.push('D=-D');

                // push D (the result) into the stack
                push = this.#pushStack();
                for (const p of push) {
                    instructions.push(p);
                }
                break;
            case 'eq':
                // pop value from the stack and store it in R14
                instructions = this.#popStack();
                instructions.push('@R14');
                instructions.push('M=D');

                // pop value from the stack, and store it in R13
                pop = this.#popStack();
                for (const p of pop) {
                    instructions.push(p);
                }
                instructions.push('@R13');
                instructions.push('M=D');

                // D = R13 - R14
                instructions.push('@R13');
                instructions.push('D=M');
                instructions.push('@R14');
                instructions.push('D=D-M');

                const eqRandom = (Math.random() * 100).toString();
                trueLabel = (
                    this.#namespace +
                    'eqtrue' +
                    eqRandom
                ).toUpperCase();

                falseLabel = (
                    this.#namespace +
                    'eqfalse' +
                    eqRandom
                ).toUpperCase();

                // if D == 0 then D = 1 else D = 0
                instructions.push('@' + trueLabel);
                instructions.push('D;JEQ');
                instructions.push('D=0');
                instructions.push('@' + falseLabel);
                instructions.push('0;JMP');
                instructions.push('(' + trueLabel + ')');
                instructions.push('D=-1');
                instructions.push('(' + falseLabel + ')');

                // push D (the result) into the stack
                push = this.#pushStack();
                for (const p of push) {
                    instructions.push(p);
                }
                break;
            case 'gt':
                // pop value from the stack and store it in R14
                instructions = this.#popStack();
                instructions.push('@R14');
                instructions.push('M=D');

                // pop value from the stack, and store it in R13
                pop = this.#popStack();
                for (const p of pop) {
                    instructions.push(p);
                }
                instructions.push('@R13');
                instructions.push('M=D');

                // D = R13 - R14
                instructions.push('@R13');
                instructions.push('D=M');
                instructions.push('@R14');
                instructions.push('D=D-M');

                const gtRandom = (Math.random() * 100).toString();
                trueLabel = (
                    this.#namespace +
                    'gttrue' +
                    gtRandom
                ).toUpperCase();

                falseLabel = (
                    this.#namespace +
                    'gtfalse' +
                    gtRandom
                ).toUpperCase();

                // if D > 0 then D = 1 else D = 0
                instructions.push('@' + trueLabel);
                instructions.push('D;JGT');
                instructions.push('D=0');
                instructions.push('@' + falseLabel);
                instructions.push('0;JMP');
                instructions.push('(' + trueLabel + ')');
                instructions.push('D=-1');
                instructions.push('(' + falseLabel + ')');

                // push D (the result) into the stack
                push = this.#pushStack();
                for (const p of push) {
                    instructions.push(p);
                }
                break;
            case 'lt':
                // pop value from the stack and store it in R14
                instructions = this.#popStack();
                instructions.push('@R14');
                instructions.push('M=D');

                // pop value from the stack, and store it in R13
                pop = this.#popStack();
                for (const p of pop) {
                    instructions.push(p);
                }
                instructions.push('@R13');
                instructions.push('M=D');

                // D = R13 - R14
                instructions.push('@R13');
                instructions.push('D=M');
                instructions.push('@R14');
                instructions.push('D=D-M');

                const ltRandom = (Math.random() * 100).toString();
                trueLabel = (
                    this.#namespace +
                    'lttrue' +
                    ltRandom
                ).toUpperCase();

                falseLabel = (
                    this.#namespace +
                    'ltfalse' +
                    ltRandom
                ).toUpperCase();

                // if D < 0 then D = 1 else D = 0
                instructions.push('@' + trueLabel);
                instructions.push('D;JLT');
                instructions.push('D=0');
                instructions.push('@' + falseLabel);
                instructions.push('0;JMP');
                instructions.push('(' + trueLabel + ')');
                instructions.push('D=-1');
                instructions.push('(' + falseLabel + ')');

                // push D (the result) into the stack
                push = this.#pushStack();
                for (const p of push) {
                    instructions.push(p);
                }
                break;
            case 'and':
                // pop value from the stack and store it in R14
                instructions = this.#popStack();
                instructions.push('@R14');
                instructions.push('M=D');

                // pop value from the stack, and store it in R13
                pop = this.#popStack();
                for (const p of pop) {
                    instructions.push(p);
                }
                instructions.push('@R13');
                instructions.push('M=D');

                // D = R13 & R14
                instructions.push('@R13');
                instructions.push('D=M');
                instructions.push('@R14');
                instructions.push('D=D&M');

                // push D (the result) into the stack
                push = this.#pushStack();
                for (const p of push) {
                    instructions.push(p);
                }
                break;
            case 'or':
                // pop value from the stack and store it in R14
                instructions = this.#popStack();
                instructions.push('@R14');
                instructions.push('M=D');

                // pop value from the stack, and store it in R13
                pop = this.#popStack();
                for (const p of pop) {
                    instructions.push(p);
                }
                instructions.push('@R13');
                instructions.push('M=D');

                // D = R13 | R14
                instructions.push('@R13');
                instructions.push('D=M');
                instructions.push('@R14');
                instructions.push('D=D|M');

                // push D (the result) into the stack
                push = this.#pushStack();
                for (const p of push) {
                    instructions.push(p);
                }
                break;
            case 'not':
                // pop value from the stack
                instructions = this.#popStack();

                // D = !D
                instructions.push('D=!D');

                // push D (the result) into the stack
                push = this.#pushStack();
                for (const p of push) {
                    instructions.push(p);
                }
                break;
            default:
                throw new Error(`Error: invalid arithmetic instruction: ${op}`);
        }
        return instructions;
    }
    #genPush() {
        let instructions = [];
        const arg1 = this.#command.arg1();
        const arg2 = this.#command.arg2();

        const segmentInstructions = this.#genSegment(arg1, arg2, true);
        for (const i of segmentInstructions) {
            instructions.push(i);
        }

        const pushInstructions = this.#pushStack();
        for (const i of pushInstructions) {
            instructions.push(i);
        }

        return instructions;
    }
    #genPop() {
        let instructions = [];
        const arg1 = this.#command.arg1();
        const arg2 = this.#command.arg2();

        const popInstructions = this.#popStack();
        for (const i of popInstructions) {
            instructions.push(i);
        }

        const segmentInstructions = this.#genSegment(arg1, arg2, false);
        for (const i of segmentInstructions) {
            instructions.push(i);
        }

        return instructions;
    }
    #genSegment(arg1, arg2, push) {
        const segment = arg1;
        const index = arg2;
        let instructions = [];

        switch (segment) {
            case 'argument':
                if (push) {
                    instructions = this.#genPushSegment('ARG', index);
                } else {
                    instructions = this.#genPopSegment('ARG', index);
                }
                break;
            case 'local':
                if (push) {
                    instructions = this.#genPushSegment('LCL', index);
                } else {
                    instructions = this.#genPopSegment('LCL', index);
                }
                break;
            case 'static':
                instructions.push('@' + this.#namespace + '.' + index);

                if (push) {
                    instructions.push('D=M');
                } else {
                    instructions.push('M=D');
                }
                break;
            case 'constant':
                instructions.push('@' + index);
                instructions.push('D=A');
                break;
            case 'this':
                if (push) {
                    instructions = this.#genPushSegment('THIS', index);
                } else {
                    instructions = this.#genPopSegment('THIS', index);
                }
                break;
            case 'that':
                if (push) {
                    instructions = this.#genPushSegment('THAT', index);
                } else {
                    instructions = this.#genPopSegment('THAT', index);
                }
                break;
            case 'pointer':
                let addr = 'THIS';
                if (index === '1') {
                    addr = 'THAT';
                }

                instructions.push('@' + addr);
                if (push) {
                    instructions.push('D=M');
                } else {
                    instructions.push('M=D');
                }
                break;
            case 'temp':
                const pos = parseInt(index) + 5;
                if (push) {
                    instructions.push('@' + pos);
                    instructions.push('D=M');
                } else {
                    // set @5 + index to the value popped (stored in D)
                    instructions.push('@' + pos);
                    instructions.push('M=D');
                }
                break;
            default:
                throw new Error(`ERROR: Invalid segment: ${segment}`);
        }
        return instructions;
    }
    #pushStack() {
        return ['@SP', 'A=M', 'M=D', '@SP', 'M=M+1'];
    }
    #popStack() {
        return ['@SP', 'A=M-1', 'D=M', '@SP', 'M=M-1'];
    }
    #genPushSegment(segmentName, index) {
        let instructions = [];

        // set A to @segmentName + index
        instructions.push('@' + segmentName);
        instructions.push('D=M');
        instructions.push('@' + index);
        instructions.push('A=D+A');

        // set D to the value at that address, this will be pushed to the stack
        instructions.push('D=M');

        return instructions;
    }
    #genPopSegment(segmentName, index) {
        let instructions = [];

        // Save the popped value in @R13
        instructions.push('@R13');
        instructions.push('M=D');

        // set @R14 to @segmentName + index
        instructions.push('@' + segmentName);
        instructions.push('D=M');
        instructions.push('@' + index);
        instructions.push('D=D+A');
        instructions.push('@R14');
        instructions.push('M=D');

        // @R14 = @R13
        instructions.push('@R13');
        instructions.push('D=M');
        instructions.push('@R14');
        instructions.push('A=M');
        instructions.push('M=D');

        return instructions;
    }
}
