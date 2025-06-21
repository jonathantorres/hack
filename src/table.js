export const SymbolKind = {
    STATIC: Symbol('static'),
    FIELD: Symbol('field'),
    ARG: Symbol('arg'),
    VAR: Symbol('var'),
    NONE: Symbol('none'),
};

export class SymbolTable {
    #table = {};
    #staticIndex = 0;
    #fieldIndex = 0;
    #argIndex = 0;
    #varIndex = 0;

    constructor() {
        // nothing to do
    }

    define(name, type, kind) {
        switch (kind) {
            case SymbolKind.STATIC:
                this.#table[name] = { type, kind, index: this.#staticIndex++ };
                break;
            case SymbolKind.FIELD:
                this.#table[name] = { type, kind, index: this.#fieldIndex++ };
                break;
            case SymbolKind.ARG:
                this.#table[name] = { type, kind, index: this.#argIndex++ };
                break;
            case SymbolKind.VAR:
                this.#table[name] = { type, kind, index: this.#varIndex++ };
                break;
            default:
                throw new Error(`Unknown kind: ${kind.toString()}`);
        }
    }

    varCount(kind) {
        switch (kind) {
            case SymbolKind.STATIC:
                return this.#staticIndex;
            case SymbolKind.FIELD:
                return this.#fieldIndex;
            case SymbolKind.ARG:
                return this.#argIndex;
            case SymbolKind.VAR:
                return this.#varIndex;
            default:
                throw new Error(`Unknown kind: ${kind.toString()}`);
        }
    }

    kindOf(name) {
        const symbol = this.#table[name];

        if (symbol) {
            return symbol.kind;
        }

        return SymbolKind.NONE;
    }

    typeOf(name) {
        const symbol = this.#table[name];

        if (symbol) {
            return symbol.type;
        }

        return null;
    }

    indexOf(name) {
        const symbol = this.#table[name];

        if (symbol) {
            return symbol.index;
        }

        return null;
    }

    reset() {
        this.#table = {};
        this.#staticIndex = 0;
        this.#fieldIndex = 0;
        this.#argIndex = 0;
        this.#varIndex = 0;
    }
}
