import * as fs from 'node:fs/promises';

export const TokenType = {
    IDENTIFIER: Symbol('identifier'),
    INT: Symbol('int'),
    KEYWORD: Symbol('keyword'),
    STRING: Symbol('string'),
    SYMBOL: Symbol('symbol'),
};

export const Keyword = {
    BOOLEAN: Symbol('boolean'),
    CHAR: Symbol('char'),
    CLASS: Symbol('class'),
    CONSTRUCTOR: Symbol('constructor'),
    DO: Symbol('do'),
    ELSE: Symbol('else'),
    FALSE: Symbol('false'),
    FIELD: Symbol('field'),
    FUNCTION: Symbol('function'),
    IF: Symbol('if'),
    INT: Symbol('int'),
    LET: Symbol('let'),
    METHOD: Symbol('method'),
    NULL: Symbol('null'),
    RETURN: Symbol('return'),
    STATIC: Symbol('static'),
    THIS: Symbol('this'),
    TRUE: Symbol('true'),
    VAR: Symbol('var'),
    VOID: Symbol('void'),
    WHILE: Symbol('while'),
};

const symbols = [
    '{',
    '}',
    '(',
    ')',
    '[',
    ']',
    '.',
    ',',
    ';',
    '+',
    '-',
    '*',
    '/',
    '&',
    '|',
    '<',
    '>',
    '=',
    '~',
];

const keywords = [
    'boolean',
    'char',
    'class',
    'constructor',
    'do',
    'else',
    'false',
    'field',
    'function',
    'if',
    'int',
    'let',
    'method',
    'null',
    'return',
    'static',
    'this',
    'true',
    'var',
    'void',
    'while',
];

export class Tokenizer {
    #currentPos = 0;
    #peeking = false;
    #peekToken = null;
    #peekTokenType = null;
    #currentToken = null;
    #currentTokenType = null;
    #fileLocation = null;
    #fileString = null;
    #doneTokenizing = false;

    constructor(filePath) {
        this.#fileLocation = filePath;
    }

    async init() {
        // open and load the whole jack file into memory
        try {
            this.#fileString = await fs.readFile(this.#fileLocation, {
                encoding: 'utf-8',
            });
        } catch (e) {
            throw new Error(`${e.message}`);
        }
    }

    advance(peek = false) {
        if (!this.#fileString) {
            throw new Error('File to tokenize was not read');
        }

        this.#peeking = peek;

        const buf = this.#fileString;
        let pos = this.#currentPos;
        let currentToken = '';
        let readStringConstant = false;

        while (true) {
            const tok = buf[pos];
            let next = null;

            if (pos < buf.length - 1) {
                next = buf[pos + 1];
            }

            // ignore single line comments
            if (tok === '/' && next === '/') {
                pos = this.#advanceUntil('\n', pos, true);
                continue;
            }

            // ignore multiline comments
            if (tok === '/' && next === '*') {
                // consume the current '/*'
                pos += 2;
                pos = this.#advanceUntil('*/', pos, true);
                continue;
            }

            // ignore whitespace
            if (tok === '\n' || tok === ' ' || tok === '\t' || tok === '\r') {
                pos++;

                if (currentToken !== '') {
                    break;
                }
                continue;
            }

            // handle symbols
            if (symbols.includes(tok)) {
                if (currentToken !== '') {
                    break;
                }

                pos++;
                currentToken = tok;
                break;
            }

            // handle string constant
            if (tok === '"') {
                if (currentToken !== '') {
                    break;
                }

                pos++;
                const str = this.#readStringConstant(pos);
                pos = str.pos;
                currentToken = str.string;
                readStringConstant = true;
                break;
            }

            currentToken += tok;
            pos++;
        }

        if (peek) {
            if (readStringConstant) {
                this.#peekToken = currentToken;
            } else {
                this.#peekToken = currentToken.trim();
            }
            this.#peekTokenType = this.#parseTokenType(readStringConstant);
        } else {
            this.#currentPos = pos;

            if (readStringConstant) {
                this.#currentToken = currentToken;
            } else {
                this.#currentToken = currentToken.trim();
            }
            this.#currentTokenType = this.#parseTokenType(readStringConstant);

            // check if we are done tokenizing
            let finalPos = pos;
            let done = false;

            while (true) {
                if (finalPos > buf.length - 1) {
                    done = true;
                    break;
                }

                const tok = buf[finalPos];

                if (
                    tok === '\n' ||
                    tok === ' ' ||
                    tok === '\t' ||
                    tok === '\r' ||
                    tok === ''
                ) {
                    finalPos++;
                    continue;
                }
                break;
            }

            this.#doneTokenizing = done;
        }
    }

    hasMoreTokens() {
        return !this.#doneTokenizing;
    }

    tokenType() {
        if (this.#peeking) {
            return this.#peekTokenType;
        }
        return this.#currentTokenType;
    }

    keyword() {
        const keywordType = this.keywordType();

        return keywordType.description;
    }

    keywordType() {
        const tokenType = this.tokenType();
        let keyword = null;
        let currentToken = this.#currentToken;

        if (this.#peeking) {
            currentToken = this.#peekToken;
        }

        if (tokenType !== TokenType.KEYWORD) {
            throw new Error(`Invalid token type: ${tokenType}`);
        }

        switch (currentToken) {
            case 'boolean':
                keyword = Keyword.BOOLEAN;
                break;
            case 'char':
                keyword = Keyword.CHAR;
                break;
            case 'class':
                keyword = Keyword.CLASS;
                break;
            case 'constructor':
                keyword = Keyword.CONSTRUCTOR;
                break;
            case 'do':
                keyword = Keyword.DO;
                break;
            case 'else':
                keyword = Keyword.ELSE;
                break;
            case 'false':
                keyword = Keyword.FALSE;
                break;
            case 'field':
                keyword = Keyword.FIELD;
                break;
            case 'function':
                keyword = Keyword.FUNCTION;
                break;
            case 'if':
                keyword = Keyword.IF;
                break;
            case 'int':
                keyword = Keyword.INT;
                break;
            case 'let':
                keyword = Keyword.LET;
                break;
            case 'method':
                keyword = Keyword.METHOD;
                break;
            case 'null':
                keyword = Keyword.NULL;
                break;
            case 'return':
                keyword = Keyword.RETURN;
                break;
            case 'static':
                keyword = Keyword.STATIC;
                break;
            case 'this':
                keyword = Keyword.THIS;
                break;
            case 'true':
                keyword = Keyword.TRUE;
                break;
            case 'var':
                keyword = Keyword.VAR;
                break;
            case 'void':
                keyword = Keyword.VOID;
                break;
            case 'while':
                keyword = Keyword.WHILE;
                break;
            default:
                throw new Error(`Unknown keyword: ${currentToken}`);
        }

        return keyword;
    }

    symbol(xml = false) {
        let value = this.#getCurrentTokenValue(TokenType.SYMBOL);

        // return XML friendly symbol
        if (xml) {
            if (value === '&') {
                value = '&amp;';
            }
            if (value === '<') {
                value = '&lt;';
            }
            if (value === '>') {
                value = '&gt;';
            }
        }

        return value;
    }

    identifier() {
        return this.#getCurrentTokenValue(TokenType.IDENTIFIER);
    }

    intVal() {
        return this.#getCurrentTokenValue(TokenType.INT);
    }

    stringVal() {
        return this.#getCurrentTokenValue(TokenType.STRING);
    }

    #parseTokenType(readString) {
        let token = this.#currentToken;

        if (this.#peeking) {
            token = this.#peekToken;
        }

        if (readString) {
            return TokenType.STRING;
        }

        if (keywords.includes(token)) {
            return TokenType.KEYWORD;
        }

        if (symbols.includes(token)) {
            return TokenType.SYMBOL;
        }

        if (!isNaN(parseInt(token))) {
            return TokenType.INT;
        }

        return TokenType.IDENTIFIER;
    }

    #readStringConstant(currentPos) {
        const buf = this.#fileString;
        let pos = currentPos;
        let token = '';

        // read the string until the next "
        while (true) {
            const tok = buf[pos];

            if (tok === '"') {
                pos++;
                break;
            }

            token += tok;
            pos++;
        }

        return {
            string: token,
            pos: pos,
        };
    }

    #advanceUntil(tokens, currentPos, consume) {
        const buf = this.#fileString;
        const token = tokens[0];
        let pos = currentPos;
        let next = null;

        if (tokens.length > 1) {
            next = tokens[1];
        }

        // move forward blindly until we see the specified token(s)
        while (true) {
            if (next !== null) {
                if (buf[pos] !== token || buf[pos + 1] !== next) {
                    pos++;
                    continue;
                }
            } else if (buf[pos] !== token) {
                pos++;
                continue;
            }

            // found token
            if (consume) {
                pos += tokens.length;
            }
            break;
        }

        return pos;
    }

    #getCurrentTokenValue(tokenType) {
        const currentTokenType = this.tokenType();

        if (currentTokenType !== tokenType) {
            throw new Error(
                `Invalid token type: expected "${currentTokenType.description}" but passed token is "${tokenType.description}"`
            );
        }

        if (this.#peeking) {
            return this.#peekToken;
        }

        return this.#currentToken;
    }
}
