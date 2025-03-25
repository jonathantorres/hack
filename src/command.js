export const CommandType = {
    ARITHMETIC: Symbol('arithmetic'),
    PUSH: Symbol('push'),
    POP: Symbol('pop'),
    LABEL: Symbol('label'),
    GOTO: Symbol('goto'),
    IF: Symbol('if'),
    IFGOTO: Symbol('if-goto'),
    FUNCTION: Symbol('function'),
    RETURN: Symbol('return'),
    CALL: Symbol('call'),
    CONSTANT: Symbol('constant'),
};

export class VMCommand {
    #type = null;
    #arg1 = null;
    #arg2 = null;
    #rawCommand = '';

    constructor(command) {
        // remove any comments from the command
        let rawCommand = command;
        let commentIndex = rawCommand.indexOf('//', 0);

        if (commentIndex !== -1) {
            rawCommand = rawCommand.substring(0, commentIndex).trim();
        }
        this.#rawCommand = rawCommand;

        this.#parse();
    }

    arg1() {
        return this.#arg1;
    }
    arg2() {
        return this.#arg2;
    }
    getType() {
        return this.#type;
    }

    #parse() {
        // parse the command
        const cmd = this.#rawCommand;
        const cmdPieces = cmd.split(' ');

        if (cmdPieces.length === 0) {
            throw new Error(`Invalid VM Command: ${cmd}`);
        }

        const cmdType = cmdPieces[0].trim();

        // figure out the type of the vm command
        switch (cmdType) {
            case 'add':
            case 'sub':
            case 'neg':
            case 'eq':
            case 'gt':
            case 'lt':
            case 'and':
            case 'or':
            case 'not':
                this.#type = CommandType.ARITHMETIC;
                break;
            case 'push':
                this.#type = CommandType.PUSH;
                break;
            case 'pop':
                this.#type = CommandType.POP;
                break;
            case 'label':
                this.#type = CommandType.LABEL;
                break;
            case 'goto':
                this.#type = CommandType.GOTO;
                break;
            case 'if':
                this.#type = CommandType.IF;
                break;
            case 'if-goto':
                this.#type = CommandType.IFGOTO;
                break;
            case 'function':
                this.#type = CommandType.FUNCTION;
                break;
            case 'return':
                this.#type = CommandType.RETURN;
                break;
            case 'call':
                this.#type = CommandType.CALL;
                break;
            case 'constant':
                this.#type = CommandType.CONSTANT;
                break;
            default:
                throw new Error(`Invalid VM Command: ${cmdType}`);
        }

        // this is an operation, save the operation in the first argument
        if (cmdPieces.length === 1) {
            this.#arg1 = cmdPieces[0].trim();
        }

        // save the first argument (if any)
        if (cmdPieces.length >= 2) {
            this.#arg1 = cmdPieces[1].trim();
        }

        // save the second argument (if any)
        if (cmdPieces.length >= 3) {
            this.#arg2 = cmdPieces[2].trim();
        }
    }
}
