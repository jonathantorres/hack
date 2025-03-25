import { CommandType } from './command.js';

export class CodeGen {
    #command = null;
    #namespace = null;
    #functionCallMap = null;

    constructor(namespace, command, callMap) {
        this.#namespace = namespace;
        this.#command = command;
        this.#functionCallMap = callMap;
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
            case CommandType.LABEL:
                instructions = this.#genLabel();
                break;
            case CommandType.GOTO:
                instructions = this.#genGoTo();
                break;
            case CommandType.IFGOTO:
                instructions = this.#genIfGoTo();
                break;
            case CommandType.FUNCTION:
                instructions = this.#genFunction();
                break;
            case CommandType.RETURN:
                instructions = this.#genReturn();
                break;
            case CommandType.CALL:
                instructions = this.#genCall();
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

        switch (op) {
            case 'add':
                instructions = this.#genMathOp('+');
                break;
            case 'sub':
                instructions = this.#genMathOp('-');
                break;
            case 'neg':
                instructions = this.#genUnaryOp('-');
                break;
            case 'not':
                instructions = this.#genUnaryOp('!');
                break;
            case 'eq':
            case 'gt':
            case 'lt':
                instructions = this.#genBranchOp(op);
                break;
            case 'and':
                instructions = this.#genLogicOp('&');
                break;
            case 'or':
                instructions = this.#genLogicOp('|');
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
    #genFunction() {
        let functionName = this.#command.arg1();
        let numOfVars = parseInt(this.#command.arg2());
        let instructions = [];

        // create label with entry to function
        instructions.push('(' + functionName + ')');

        // initialize the local segment for the function
        for (let i = 0; i < numOfVars; i++) {
            // push 0 into the stack
            instructions.push('@0');
            instructions.push('D=A');
            const push = this.#pushStack();
            for (const p of push) {
                instructions.push(p);
            }
        }
        return instructions;
    }
    #genReturn() {
        let instructions = [];

        // endFrame(R13) = LCL
        instructions.push('@LCL');
        instructions.push('D=M');
        instructions.push('@R13');
        instructions.push('M=D');

        // get the return address
        // retAddr(R14) = *(endFrame - 5)
        instructions.push('@R13');
        instructions.push('D=M');
        instructions.push('@5');
        instructions.push('A=D-A');
        instructions.push('D=M');
        instructions.push('@R14');
        instructions.push('M=D');

        // repositions the return value for the caller
        // *ARG = pop()
        const pop = this.#popStack();
        for (const p of pop) {
            instructions.push(p);
        }
        instructions.push('@ARG');
        instructions.push('A=M');
        instructions.push('M=D');

        // reposition the stack pointer of the caller
        // SP = ARG+1
        instructions.push('@ARG');
        instructions.push('D=M');
        instructions.push('@1');
        instructions.push('D=D+A');
        instructions.push('@SP');
        instructions.push('M=D');

        // restore segments
        // THAT = *(endFrame - 1)
        instructions.push('@R13');
        instructions.push('D=M');
        instructions.push('@1');
        instructions.push('A=D-A');
        instructions.push('D=M');
        instructions.push('@THAT');
        instructions.push('M=D');

        // THIS = *(endFrame - 2)
        instructions.push('@R13');
        instructions.push('D=M');
        instructions.push('@2');
        instructions.push('A=D-A');
        instructions.push('D=M');
        instructions.push('@THIS');
        instructions.push('M=D');

        // ARG = *(endFrame - 3)
        instructions.push('@R13');
        instructions.push('D=M');
        instructions.push('@3');
        instructions.push('A=D-A');
        instructions.push('D=M');
        instructions.push('@ARG');
        instructions.push('M=D');

        // LCL = *(endFrame - 4)
        instructions.push('@R13');
        instructions.push('D=M');
        instructions.push('@4');
        instructions.push('A=D-A');
        instructions.push('D=M');
        instructions.push('@LCL');
        instructions.push('M=D');

        // jump to the return address
        // goto retAddr
        instructions.push('@R14');
        instructions.push('A=M');
        instructions.push('0;JMP');
        return instructions;
    }
    #genCall() {
        let functionName = this.#command.arg1();
        let numOfArgs = parseInt(this.#command.arg2());
        let push = [];
        let instructions = [];
        let returnAddr = this.#getReturnAddr(functionName);

        // push returnAddr
        instructions.push('@' + returnAddr);
        instructions.push('D=A');
        push = this.#pushStack();
        for (const p of push) {
            instructions.push(p);
        }

        // push LCL
        instructions.push('@LCL');
        instructions.push('D=M');
        push = this.#pushStack();
        for (const p of push) {
            instructions.push(p);
        }

        // push ARG
        instructions.push('@ARG');
        instructions.push('D=M');
        push = this.#pushStack();
        for (const p of push) {
            instructions.push(p);
        }

        // push THIS
        instructions.push('@THIS');
        instructions.push('D=M');
        push = this.#pushStack();
        for (const p of push) {
            instructions.push(p);
        }

        // push THAT
        instructions.push('@THAT');
        instructions.push('D=M');
        push = this.#pushStack();
        for (const p of push) {
            instructions.push(p);
        }

        // ARG = SP-5-numOfArgs
        instructions.push('@SP');
        instructions.push('D=M');
        instructions.push('@5');
        instructions.push('D=D-A');
        instructions.push('@' + numOfArgs.toString());
        instructions.push('D=D-A');
        instructions.push('@ARG');
        instructions.push('M=D');

        // LCL = SP
        instructions.push('@SP');
        instructions.push('D=M');
        instructions.push('@LCL');
        instructions.push('M=D');

        // goto functionName
        instructions.push('@' + functionName);
        instructions.push('0;JMP');

        // insert label with return address
        instructions.push('(' + returnAddr + ')');
        return instructions;
    }
    #genLabel() {
        const labelName = this.#command.arg1();
        return ['(' + labelName + ')'];
    }
    #genGoTo() {
        let instructions = [];
        const labelName = this.#command.arg1();

        instructions.push('@' + labelName);
        instructions.push('0;JMP');
        return instructions;
    }
    #genIfGoTo() {
        let instructions = [];
        const labelName = this.#command.arg1();

        // pop value from the stack
        instructions = this.#popStack();

        // if D != 0 then jump to the label
        instructions.push('@' + labelName);
        instructions.push('D;JNE');
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
    #genMathOp(op) {
        let instructions = [];

        // pop value from the stack and store it in R14
        instructions = this.#popStack();
        instructions.push('@R14');
        instructions.push('M=D');

        // pop value from the stack, and store it in R13
        let pop = this.#popStack();
        for (const p of pop) {
            instructions.push(p);
        }
        instructions.push('@R13');
        instructions.push('M=D');

        // D = R13 {op} R14
        instructions.push('@R13');
        instructions.push('D=M');
        instructions.push('@R14');
        instructions.push('D=D' + op + 'M');

        // push D (the result) into the stack
        let push = this.#pushStack();
        for (const p of push) {
            instructions.push(p);
        }
        return instructions;
    }
    #genBranchOp(op) {
        let instructions = [];
        let jmp = '';

        switch (op) {
            case 'eq':
                jmp = 'JEQ';
                break;
            case 'gt':
                jmp = 'JGT';
                break;
            case 'lt':
                jmp = 'JLT';
                break;
            default:
                throw new Error(`Error: invalid branch operation: ${op}`);
        }

        // pop value from the stack and store it in R14
        instructions = this.#popStack();
        instructions.push('@R14');
        instructions.push('M=D');

        // pop value from the stack, and store it in R13
        let pop = this.#popStack();
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

        const rand = (Math.random() * 100).toString();
        const trueLabel = (this.#namespace + op + 'true' + rand).toUpperCase();
        const falseLabel = (
            this.#namespace +
            op +
            'false' +
            rand
        ).toUpperCase();

        // if D {op} 0 then D = 1 else D = 0
        instructions.push('@' + trueLabel);
        instructions.push('D;' + jmp);
        instructions.push('D=0');
        instructions.push('@' + falseLabel);
        instructions.push('0;JMP');
        instructions.push('(' + trueLabel + ')');
        instructions.push('D=-1');
        instructions.push('(' + falseLabel + ')');

        // push D (the result) into the stack
        let push = this.#pushStack();
        for (const p of push) {
            instructions.push(p);
        }

        return instructions;
    }
    #genLogicOp(op) {
        let instructions = [];

        // pop value from the stack and store it in R14
        instructions = this.#popStack();
        instructions.push('@R14');
        instructions.push('M=D');

        // pop value from the stack, and store it in R13
        let pop = this.#popStack();
        for (const p of pop) {
            instructions.push(p);
        }
        instructions.push('@R13');
        instructions.push('M=D');

        // D = R13 {op} R14
        instructions.push('@R13');
        instructions.push('D=M');
        instructions.push('@R14');
        instructions.push('D=D' + op + 'M');

        // push D (the result) into the stack
        let push = this.#pushStack();
        for (const p of push) {
            instructions.push(p);
        }

        return instructions;
    }
    #genUnaryOp(op) {
        let instructions = [];

        // pop value from the stack
        instructions = this.#popStack();

        // D = {op}D
        instructions.push('D=' + op + 'D');

        // push D (the result) into the stack
        let push = this.#pushStack();
        for (const p of push) {
            instructions.push(p);
        }
        return instructions;
    }
    #getReturnAddr(functionName) {
        let index = 0;

        if (this.#functionCallMap.has(functionName)) {
            const count = this.#functionCallMap.get(functionName);
            index = count + 1;
            this.#functionCallMap.set(functionName, index);
        } else {
            this.#functionCallMap.set(functionName, index);
        }

        return functionName + '$ret.' + index;
    }
}
