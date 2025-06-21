import path from 'node:path';
import * as fs from 'node:fs/promises';

import { Tokenizer, TokenType, Keyword } from './tokenizer.js';
import { SymbolTable, SymbolKind } from './table.js';

export class Compiler {
    #locations = [];
    #labelCounter = 0;

    constructor(locations) {
        this.#locations = locations;
    }

    async compile() {
        // no path/location provided, use the current directory
        if (this.#locations.length === 0) {
            this.#locations.push(process.cwd());
        }

        for (const location of this.#locations) {
            const currentPath = path.parse(location);

            // location is just a single file
            if (currentPath.ext) {
                this.#compileAndSaveFile(location);
                continue;
            }

            // location is a directory of jack files
            let jackFiles = [];

            // open directory and get all of the jack files
            try {
                const files = await fs.readdir(location);

                for (const file of files) {
                    const currentFilePath = path.parse(file);

                    if (currentFilePath.ext === '.jack') {
                        jackFiles.push(file);
                    }
                }
            } catch (err) {
                throw new Error(`${e.message}`);
            }

            if (jackFiles.length === 0) {
                throw new Error(`No Jack files to translate in ${location}`);
            }

            let progLocation = location;

            // make sure program location ends with /
            if (!progLocation.endsWith('/')) {
                progLocation += '/';
            }

            for (const file of jackFiles) {
                await this.#compileAndSaveFile(progLocation + file);
            }
        }
    }

    async #compileAndSaveFile(filePath) {
        const instructions = await this.#compileFile(filePath);

        // create destination file with VM commands
        const fileElements = path.parse(filePath);
        const destFilePath = fileElements.dir + '/' + fileElements.name + '.vm';

        try {
            const handle = await fs.open(destFilePath, 'w+');
            await fs.writeFile(handle, instructions);
            handle.close();
        } catch (e) {
            throw new Error(`${e.message}`);
        }
    }

    async #compileFile(filePath) {
        const fileElements = path.parse(filePath);

        // make sure the extension is "jack"
        if (fileElements.ext !== '.jack') {
            throw new Error(`Invalid file extension: ${fileElements.ext}`);
        }

        // make sure the first letter of the name of the file is uppercase
        if (fileElements.name[0] !== fileElements.name[0].toUpperCase()) {
            throw new Error(
                `Error: The first character of the file name must be uppercase: ${fileElements.name}`
            );
        }

        const tokenizer = new Tokenizer(filePath);
        await tokenizer.init();
        const instructions = this.#compileClass(tokenizer);

        return instructions;
    }

    #compileClass(tok) {
        let table = new SymbolTable();
        let output = '';

        this.#labelCounter = 0;

        // consume the class keyword
        tok.advance();
        let tokenType = tok.tokenType();

        if (tokenType !== TokenType.KEYWORD) {
            throw new Error(
                `class keyword not found: ${tokenType.description}`
            );
        }

        // compile the class name
        tok.advance();
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.IDENTIFIER) {
            throw new Error(`class name not found: ${tokenType.description}`);
        }

        const className = tok.identifier();

        // consume the opening brace
        tok.advance();
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(
                `opening brace not found, found: ${tokenType.description}`
            );
        }

        while (true) {
            tok.advance();
            tokenType = tok.tokenType();

            if (tokenType === TokenType.KEYWORD) {
                const keyType = tok.keywordType();

                // compile the class variable declarations
                if (keyType === Keyword.STATIC || keyType === Keyword.FIELD) {
                    this.#compileClassVarDec(tok, table);
                    continue;
                }

                // compile the subroutine declarations
                if (
                    keyType === Keyword.CONSTRUCTOR ||
                    keyType === Keyword.FUNCTION ||
                    keyType === Keyword.METHOD
                ) {
                    output += this.#compileSubroutine(tok, table, className);
                    continue;
                }
            }

            break;
        }

        return output;
    }

    #compileClassVarDec(tok, table) {
        let varKind = null;
        const kind = tok.keywordType();

        if (kind === Keyword.STATIC) {
            varKind = SymbolKind.STATIC;
        } else if (kind === Keyword.FIELD) {
            varKind = SymbolKind.FIELD;
        }

        tok.advance();
        let tokenType = tok.tokenType();
        let varType = null;

        // compile the type of the variable
        if (tokenType === TokenType.KEYWORD) {
            const keyType = tok.keywordType();

            if (
                keyType === Keyword.INT ||
                keyType === Keyword.CHAR ||
                keyType === Keyword.BOOLEAN
            ) {
                varType = tok.keyword();
            } else {
                throw new Error(`Invalid keyword: ${keyType.description}`);
            }
        } else if (tokenType === TokenType.IDENTIFIER) {
            varType = tok.identifier();
        } else {
            throw new Error(
                `Invalid class declaration: ${tokenType.description}`
            );
        }

        let varName = null;

        // compile the variable name
        tok.advance();
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.IDENTIFIER) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        varName = tok.identifier();

        // add the variable to the class-level symbol table
        table.define(varName, varType, varKind);

        // compile any other variables declared of the same type
        while (true) {
            tok.advance();
            tokenType = tok.tokenType();

            if (tokenType !== TokenType.SYMBOL) {
                throw new Error(`Invalid token: ${tokenType.description}`);
            }

            const currentSymbol = tok.symbol();

            if (currentSymbol === ',') {
                // compile the next variable name
                tok.advance();
                tokenType = tok.tokenType();

                if (tokenType !== TokenType.IDENTIFIER) {
                    throw new Error(`Invalid token: ${tokenType.description}`);
                }

                // add the variable to the class-level symbol table
                varName = tok.identifier();
                table.define(varName, varType, varKind);

                continue;
            }
            break;
        }
    }

    #compileSubroutine(tok, classTable, className) {
        let routineTable = new SymbolTable();
        const subroutineKind = tok.keywordType();
        let out = `function ${className}.`;

        if (subroutineKind === Keyword.METHOD) {
            // add "this" to the subroutine-level symbol table
            routineTable.define('this', className, SymbolKind.ARG);
        }

        // compile return type
        tok.advance();
        let tokenType = tok.tokenType();
        let returnType = null;

        if (tokenType === TokenType.KEYWORD) {
            const keyType = tok.keywordType();

            if (
                keyType === Keyword.VOID ||
                keyType === Keyword.CONSTRUCTOR ||
                keyType === Keyword.INT ||
                keyType === Keyword.CHAR ||
                keyType === Keyword.BOOLEAN
            ) {
                returnType = tok.keyword();
            } else {
                throw new Error(`Invalid keyword: ${keyType.description}`);
            }
        } else if (tokenType === TokenType.IDENTIFIER) {
            returnType = tok.identifier();
        } else {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        // compile subroutine name
        tok.advance();
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.IDENTIFIER) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        let subroutineName = tok.identifier();

        out += `${subroutineName} `;

        // advance the opening paren
        tok.advance();
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        // compile list of 0 or more parameters (they are added to the subroutine symbol table)
        this.#compileParameterList(tok, routineTable);

        // consume opening brace
        tok.advance();
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        // compile any var declarations in this subroutine
        while (true) {
            tok.advance(true);
            tokenType = tok.tokenType();

            if (tokenType === TokenType.KEYWORD) {
                const keyType = tok.keywordType();

                if (keyType === Keyword.VAR) {
                    tok.advance();
                    this.#compileVarDec(tok, routineTable);
                    continue;
                }
            }
            break;
        }

        const localCount = routineTable.varCount(SymbolKind.VAR);
        out += `${localCount}\n`;

        if (subroutineKind === Keyword.CONSTRUCTOR) {
            // constructor, allocate memory for the object
            const size = classTable.varCount(SymbolKind.FIELD);
            out += `push constant ${size}\n`;
            out += `call Memory.alloc 1\n`;
            out += `pop pointer 0\n`;
        } else if (subroutineKind === Keyword.FUNCTION) {
            // nothing to do here, just a function
        } else if (subroutineKind === Keyword.METHOD) {
            out += `push argument 0\n`;
            out += `pop pointer 0\n`;
        } else {
            throw new Error(
                `Invalid subroutine kind: ${subroutineKind.description}`
            );
        }

        // compile the body of the subroutine
        out += this.#compileSubroutineBody(
            tok,
            classTable,
            className,
            routineTable,
            subroutineName
        );

        return out;
    }

    #compileParameterList(tok, routineTable) {
        tok.advance();
        let tokenType = tok.tokenType();

        if (
            tokenType === TokenType.KEYWORD ||
            tokenType === TokenType.IDENTIFIER
        ) {
            // parameters are present, compile them
            while (true) {
                // compile param type
                let paramType = null;

                if (tokenType === TokenType.KEYWORD) {
                    const keyType = tok.keywordType();

                    if (
                        keyType === Keyword.INT ||
                        keyType === Keyword.CHAR ||
                        keyType === Keyword.BOOLEAN
                    ) {
                        paramType = tok.keyword();
                    } else {
                        throw new Error(
                            `Invalid keyword: ${keyType.description}`
                        );
                    }
                } else if (tokenType === TokenType.IDENTIFIER) {
                    paramType = tok.identifier();
                } else {
                    throw new Error(`Invalid token: ${tokenType.description}`);
                }

                // compile param name
                tok.advance();
                tokenType = tok.tokenType();

                if (tokenType !== TokenType.IDENTIFIER) {
                    throw new Error(`Invalid token: ${tokenType.description}`);
                }

                let paramName = tok.identifier();

                // get next param or end of params
                tok.advance();
                tokenType = tok.tokenType();

                if (tokenType === TokenType.SYMBOL) {
                    const symbol = tok.symbol();

                    // add the parameter to the subroutine-level symbol table
                    routineTable.define(paramName, paramType, SymbolKind.ARG);

                    if (symbol === ',') {
                        // there are more params, continue to get the next one
                        tok.advance();
                        tokenType = tok.tokenType();
                        continue;
                    }
                    break;
                } else {
                    throw new Error(`Invalid token: ${tokenType.description}`);
                }
            }
        }
    }

    #compileSubroutineBody(
        tok,
        classTable,
        className,
        routineTable,
        subroutineName
    ) {
        // compile the statements in the subroutine body
        const out = this.#compileStatements(
            tok,
            classTable,
            className,
            routineTable,
            subroutineName,
            true
        );

        return out;
    }

    #compileVarDec(tok, routineTable) {
        tok.advance();
        let tokenType = tok.tokenType();
        let varType = null;

        // compile the type of the variable
        if (tokenType === TokenType.KEYWORD) {
            const keyType = tok.keywordType();

            if (
                keyType === Keyword.INT ||
                keyType === Keyword.CHAR ||
                keyType === Keyword.BOOLEAN
            ) {
                varType = tok.keyword();
            } else {
                throw new Error(`Invalid keyword: ${keyType.description}`);
            }
        } else if (tokenType === TokenType.IDENTIFIER) {
            varType = tok.identifier();
        } else {
            throw new Error(
                `Invalid var declaration: ${tokenType.description}`
            );
        }

        // compile the variable name
        tok.advance();
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.IDENTIFIER) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        let varName = tok.identifier();

        // compile any other variables declared of the same type
        while (true) {
            tok.advance();
            tokenType = tok.tokenType();

            if (tokenType !== TokenType.SYMBOL) {
                throw new Error(`Invalid token: ${tokenType.description}`);
            }

            const currentSymbol = tok.symbol();

            // add the variable to the subroutine-level symbol table
            routineTable.define(varName, varType, SymbolKind.VAR);

            if (currentSymbol === ',') {
                // compile the next variable name
                tok.advance();
                tokenType = tok.tokenType();

                if (tokenType !== TokenType.IDENTIFIER) {
                    throw new Error(`Invalid token: ${tokenType.description}`);
                }

                varName = tok.identifier();
                continue;
            }
            break;
        }
    }

    #compileStatements(
        tok,
        classTable,
        className,
        routineTable,
        subroutineName,
        read = true
    ) {
        let out = '';
        let readNext = read;

        while (true) {
            if (readNext) {
                tok.advance();
            }

            let tokenType = tok.tokenType();

            if (tokenType !== TokenType.KEYWORD) {
                break;
            }

            const keywordType = tok.keywordType();

            switch (keywordType) {
                case Keyword.LET:
                    out += this.#compileLet(
                        tok,
                        classTable,
                        className,
                        routineTable
                    );
                    readNext = true;
                    break;
                case Keyword.IF:
                    const ifVal = this.#compileIf(
                        tok,
                        classTable,
                        className,
                        routineTable,
                        subroutineName
                    );
                    out += ifVal.output;
                    readNext = !ifVal.advanced;
                    break;
                case Keyword.WHILE:
                    out += this.#compileWhile(
                        tok,
                        classTable,
                        className,
                        routineTable,
                        subroutineName
                    );
                    readNext = true;
                    break;
                case Keyword.DO:
                    out += this.#compileDo(
                        tok,
                        classTable,
                        className,
                        routineTable
                    );
                    readNext = true;
                    break;
                case Keyword.RETURN:
                    out += this.#compileReturn(
                        tok,
                        classTable,
                        className,
                        routineTable
                    );
                    readNext = true;
                    break;
                default:
                    throw new Error(
                        `Invalid keyword: ${keywordType.description}`
                    );
            }
        }

        return out;
    }

    #compileLet(tok, classTable, className, routineTable) {
        let out = '';

        tok.advance();
        let tokenType = tok.tokenType();

        if (tokenType !== TokenType.IDENTIFIER) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        let varName = tok.identifier();
        let arrayAccess = false;

        // check for array syntax
        tok.advance(true);
        tokenType = tok.tokenType();

        if (tokenType === TokenType.SYMBOL) {
            const sym = tok.symbol();

            if (sym === '[') {
                tok.advance();

                arrayAccess = true;

                // generate the segment for the array variable
                const seg = this.#generateIdentifierSegment(
                    varName,
                    classTable,
                    routineTable
                );
                out += `push ${seg}\n`;
                out += this.#compileExpression(
                    tok,
                    classTable,
                    className,
                    routineTable
                );

                // advance closing "]"
                tok.advance();
                tokenType = tok.tokenType();

                if (tokenType !== TokenType.SYMBOL) {
                    throw new Error(`Invalid token: ${tokenType.description}`);
                }

                out += 'add\n';
            }
        }

        // consume the '=' sign
        tok.advance();
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        out += this.#compileExpression(
            tok,
            classTable,
            className,
            routineTable
        );

        // advance the semicolon
        tok.advance();

        if (arrayAccess) {
            out += 'pop temp 0\n';
            out += 'pop pointer 1\n';
            out += 'push temp 0\n';
            out += 'pop that 0\n';
        } else {
            // generate the segment for the variable and pop it
            const seg = this.#generateIdentifierSegment(
                varName,
                classTable,
                routineTable
            );
            out += 'pop ' + seg + '\n';
        }

        return out;
    }

    #compileIf(tok, classTable, className, routineTable, routineName) {
        let out = '';

        // consume the opening paren
        tok.advance();
        let tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        // branch labels
        const label1 = this.#nextLabel(className);
        const label2 = this.#nextLabel(className);

        // compile the expression inside the parens
        out += this.#compileExpression(
            tok,
            classTable,
            className,
            routineTable
        );

        // advance the closing paren
        tok.advance();

        // advance the opening brace
        tok.advance();
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        out += 'not\n';
        out += `if-goto ${label1}\n`;

        tok.advance(true);
        tokenType = tok.tokenType();

        if (tokenType === TokenType.SYMBOL) {
            // no statements (an empty if)
            out += this.#compileStatements(
                tok,
                classTable,
                className,
                routineTable,
                routineName,
                false
            );
            tok.advance();
        } else {
            // compile the statements inside the if
            out += this.#compileStatements(
                tok,
                classTable,
                className,
                routineTable,
                routineName
            );
        }

        // advance the closing brace
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        out += `goto ${label2}\n`;
        out += `label ${label1}\n`;

        // compile optional "else" if it's there
        tok.advance();
        tokenType = tok.tokenType();
        let advanced = true;

        if (tokenType === TokenType.KEYWORD) {
            const keyType = tok.keywordType();

            if (keyType === Keyword.ELSE) {
                advanced = false;

                // advance the opening brace
                tok.advance();
                tokenType = tok.tokenType();

                if (tokenType !== TokenType.SYMBOL) {
                    throw new Error(`Invalid token: ${tokenType.description}`);
                }

                tok.advance(true);
                tokenType = tok.tokenType();

                if (tokenType === TokenType.SYMBOL) {
                    // no statements (an empty else)
                    out += this.#compileStatements(
                        tok,
                        classTable,
                        className,
                        routineTable,
                        routineName,
                        false
                    );
                    tok.advance();
                } else {
                    // compile the statements inside the else
                    out += this.#compileStatements(
                        tok,
                        classTable,
                        className,
                        routineTable,
                        routineName
                    );
                }

                // advance the closing brace
                tokenType = tok.tokenType();

                if (tokenType !== TokenType.SYMBOL) {
                    throw new Error(`Invalid token: ${tokenType.description}`);
                }
            }
        }

        out += `label ${label2}\n`;

        return {
            output: out,
            advanced: advanced,
        };
    }

    #compileWhile(tok, classTable, className, routineTable, routineName) {
        let out = '';

        // branch labels
        const label1 = this.#nextLabel(className);
        const label2 = this.#nextLabel(className);

        out += `label ${label2}\n`;

        // advance opening paren
        tok.advance();
        let tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        // compile the expression inside the parens
        out += this.#compileExpression(
            tok,
            classTable,
            className,
            routineTable
        );

        // advance closing paren
        tok.advance();

        out += 'not\n';
        out += `if-goto ${label1}\n`;

        // advance opening brace
        tok.advance();
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        tok.advance(true);
        tokenType = tok.tokenType();

        if (tokenType === TokenType.SYMBOL) {
            // no statements (an empty while)
            out += this.#compileStatements(
                tok,
                classTable,
                className,
                routineTable,
                routineName,
                false
            );
            tok.advance();
        } else {
            // compile the statements inside the while
            out += this.#compileStatements(
                tok,
                classTable,
                className,
                routineTable,
                routineName
            );
        }

        // advance closing brace
        tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        out += `goto ${label2}\n`;
        out += `label ${label1}\n`;

        return out;
    }

    #compileDo(tok, classTable, className, routineTable) {
        let out = '';
        let tokenType = null;

        // compile subroutine expression
        out += this.#compileExpression(
            tok,
            classTable,
            className,
            routineTable
        );

        // advance semicolon
        tok.advance();
        tokenType = tok.tokenType();
        if (tokenType !== TokenType.SYMBOL) {
            throw new Error(`Invalid token: ${tokenType.description}`);
        }

        // get rid of the returned value
        out += 'pop temp 0\n';

        return out;
    }

    #compileReturn(tok, classTable, className, routineTable) {
        let out = '';

        // check if there is an expression
        tok.advance(true);
        let tokenType = tok.tokenType();

        if (tokenType !== TokenType.SYMBOL) {
            out += this.#compileExpression(
                tok,
                classTable,
                className,
                routineTable
            );
        } else {
            // no expression, return 0
            out += 'push constant 0\n';
        }

        // advance the semicolon
        tok.advance();

        out += 'return\n';

        return out;
    }

    #compileExpression(tok, classTable, className, routineTable) {
        let out = '';

        out += this.#compileTerm(tok, classTable, className, routineTable);

        // check for an "op" and then another term
        while (true) {
            tok.advance(true);
            let tokenType = tok.tokenType();

            if (tokenType === TokenType.SYMBOL) {
                const sym = tok.symbol();

                if (
                    sym === '+' ||
                    sym === '-' ||
                    sym === '*' ||
                    sym === '/' ||
                    sym === '&' ||
                    sym === '|' ||
                    sym === '<' ||
                    sym === '>' ||
                    sym === '='
                ) {
                    tok.advance();
                    const op = this.#compileOp(tok);
                    out += this.#compileTerm(
                        tok,
                        classTable,
                        className,
                        routineTable
                    );
                    out += op;
                    continue;
                }
                break;
            }
            break;
        }

        return out;
    }

    #compileTerm(tok, classTable, className, routineTable) {
        let out = '';

        tok.advance();
        let tokenType = tok.tokenType();

        switch (tokenType) {
            case TokenType.IDENTIFIER:
                const ident = tok.identifier();

                tok.advance(true);
                tokenType = tok.tokenType();

                if (tokenType === TokenType.SYMBOL) {
                    const symb = tok.symbol();

                    if (symb === '(' || symb === '.') {
                        // assume it's a subroutine call
                        out += this.#compileSubroutineCall(
                            tok,
                            classTable,
                            className,
                            routineTable,
                            ident
                        );
                    } else if (symb === '[') {
                        // array access varName[exp]
                        out += this.#compileIdentifier(
                            tok,
                            classTable,
                            routineTable,
                            ident
                        );

                        // advance the opening "["
                        tok.advance();

                        out += this.#compileExpression(
                            tok,
                            classTable,
                            className,
                            routineTable
                        );

                        // advance closing "]"
                        tok.advance();
                        tokenType = tok.tokenType();

                        if (tokenType !== TokenType.SYMBOL) {
                            throw new Error(
                                `Invalid token: ${tokenType.description}`
                            );
                        }

                        out += 'add\n';
                        out += 'pop pointer 1\n';
                        out += 'push that 0\n';
                    } else {
                        out += this.#compileIdentifier(
                            tok,
                            classTable,
                            routineTable,
                            ident
                        );
                    }
                }
                break;
            case TokenType.INT:
                out += this.#compileIntegerConstant(tok);
                break;
            case TokenType.KEYWORD:
                out += this.#compileKeywordConstant(tok);
                break;
            case TokenType.STRING:
                out += this.#compileStringConstant(tok);
                break;
            case TokenType.SYMBOL:
                // this is a "(expression)" or an "(unaryOp term)"
                const sym = tok.symbol();

                if (sym === '(') {
                    out += this.#compileExpression(
                        tok,
                        classTable,
                        className,
                        routineTable
                    );

                    // advance the closing paren of the expression
                    tok.advance();
                    tokenType = tok.tokenType();

                    if (tokenType !== TokenType.SYMBOL) {
                        throw new Error(
                            `Invalid token: ${tokenType.description}`
                        );
                    }
                } else if (sym === '~' || sym === '-') {
                    // compile unary operation
                    const op = this.#compileOp(tok, true);
                    out += this.#compileTerm(
                        tok,
                        classTable,
                        className,
                        routineTable
                    );
                    out += op;
                } else {
                    throw new Error(`Invalid symbol: ${sym}`);
                }
                break;
            default:
                throw new Error(`Invalid token: ${tokenType.description}`);
        }

        return out;
    }

    #compileSubroutineCall(
        tok,
        classTable,
        className,
        routineTable,
        routineName
    ) {
        let out = '';
        let tokenType = null;

        // consume the opening symbol (paren or dot)
        tok.advance();
        const symb = tok.symbol();

        if (symb === '(') {
            // calling a function
            out += 'push pointer 0\n';

            const res = this.#compileExpressionList(
                tok,
                classTable,
                className,
                routineTable
            );
            out += res.output;
            const count = res.count + 1;

            tok.advance();
            tokenType = tok.tokenType();

            // compile closing paren
            if (tokenType !== TokenType.SYMBOL) {
                throw new Error(`Invalid token: ${tokenType.description}`);
            }

            out += `call ${className}.${routineName} ${count}\n`;
        } else if (symb === '.') {
            // calling a method
            // advance the name of the method
            tok.advance();
            tokenType = tok.tokenType();

            if (tokenType !== TokenType.IDENTIFIER) {
                throw new Error(`Invalid token: ${tokenType.description}`);
            }

            const methodName = tok.identifier();

            // advance opening paren
            tok.advance();
            tokenType = tok.tokenType();

            if (tokenType !== TokenType.SYMBOL) {
                throw new Error(`Invalid token: ${tokenType.description}`);
            }

            let objName = null;
            let argCount = 0;

            // compile the calling object name
            try {
                const obj = this.#compileIdentifier(
                    tok,
                    classTable,
                    routineTable,
                    routineName
                );

                out += obj;

                // find the type in the routine table or the class table
                let objType = routineTable.typeOf(routineName);

                if (!objType) {
                    objType = classTable.typeOf(routineName);
                }

                objName = objType;
                argCount = 1;
            } catch (e) {
                // if the identifier is not found, it means it's a static method
                // so we use the class name as the object name
                if (routineName !== className) {
                    objName = routineName;
                } else {
                    objName = className;
                }
            }

            if (!objName) {
                throw new Error(
                    `Object name not found for method call: ${routineName}`
                );
            }

            // compile expression list
            const res = this.#compileExpressionList(
                tok,
                classTable,
                className,
                routineTable
            );
            out += res.output;
            const count = res.count + argCount;

            tok.advance();
            tokenType = tok.tokenType();

            // advance closing paren
            if (tokenType !== TokenType.SYMBOL) {
                throw new Error(`Invalid token: ${tokenType.description}`);
            }

            out += `call ${objName}.${methodName} ${count}\n`;
        } else {
            throw new Error(`Invalid symbol: ${symb}`);
        }

        return out;
    }

    #compileExpressionList(tok, classTable, className, routineTable) {
        let out = '';
        let count = 0;
        let tokenType = null;

        // get initial expression (if any)
        tok.advance(true);
        tokenType = tok.tokenType();

        // expressions are not present inside the expression list, nothing to compile
        if (tokenType === TokenType.SYMBOL) {
            const symb = tok.symbol();

            if (symb == ')') {
                return {
                    output: out,
                    count: count,
                };
            }
        }

        out += this.#compileExpression(
            tok,
            classTable,
            className,
            routineTable
        );
        count++;

        while (true) {
            // get the next expression (if any)
            tok.advance(true);
            tokenType = tok.tokenType();

            if (tokenType === TokenType.SYMBOL) {
                const symb = tok.symbol();
                if (symb === ',') {
                    tok.advance();
                    out += this.#compileExpression(
                        tok,
                        classTable,
                        className,
                        routineTable
                    );
                    count++;
                    continue;
                }
                break;
            }
            break;
        }

        return {
            output: out,
            count: count,
        };
    }

    #compileIdentifier(tok, classTable, routineTable, identifier = null) {
        let ident = identifier;

        if (!identifier) {
            ident = tok.identifier();
        }

        // generate the identifier segment
        const seg = this.#generateIdentifierSegment(
            ident,
            classTable,
            routineTable
        );

        return `push ${seg}\n`;
    }

    #compileIntegerConstant(tok) {
        let out = 'push constant ';
        out += tok.intVal();
        out += '\n';

        return out;
    }

    #compileKeywordConstant(tok) {
        let out = '';

        switch (tok.keywordType()) {
            case Keyword.TRUE:
                out += 'push constant 1\n';
                out += 'neg\n';
                break;
            case Keyword.FALSE:
            case Keyword.NULL:
                out += 'push constant 0\n';
                break;
            case Keyword.THIS:
                out += 'push pointer 0\n';
                break;
            default:
                throw new Error(`Invalid keyword: ${tok.keyword()}`);
        }

        return out;
    }

    #compileStringConstant(tok) {
        const str = tok.stringVal();
        let out = '';
        out += `push constant ${str.length}\n`;
        out += 'call String.new 1\n';

        for (let i = 0; i < str.length; i++) {
            out += `push constant ${str.charCodeAt(i)}\n`;
            out += 'call String.appendChar 2\n';
        }

        return out;
    }

    #compileOp(tok, unary = false) {
        let out = '';
        const op = tok.symbol();

        if (unary && op !== '~' && op !== '-') {
            throw new Error(`Invalid unary operator: ${op}`);
        }

        switch (op) {
            case '+':
                out += 'add\n';
                break;
            case '-':
                if (unary) {
                    out += 'neg\n';
                } else {
                    out += 'sub\n';
                }
                break;
            case '*':
                out += 'call Math.multiply 2\n';
                break;
            case '/':
                out += 'call Math.divide 2\n';
                break;
            case '&':
                out += 'and\n';
                break;
            case '|':
                out += 'or\n';
                break;
            case '<':
                out += 'lt\n';
                break;
            case '>':
                out += 'gt\n';
                break;
            case '=':
                out += 'eq\n';
                break;
            case '~':
                out += 'not\n';
                break;
            default:
                throw new Error(`Invalid symbol: ${op}`);
        }

        return out;
    }

    #generateIdentifierSegment(ident, classTable, routineTable) {
        let seg = '';

        // look up the identifier
        let varKind = this.#lookupVariable(ident, classTable, routineTable);

        // generate the segment for the identifier
        switch (varKind) {
            case SymbolKind.STATIC:
                seg = `static ${classTable.indexOf(ident)}`;
                break;
            case SymbolKind.FIELD:
                seg = `this ${classTable.indexOf(ident)}`;
                break;
            case SymbolKind.VAR:
                seg = `local ${routineTable.indexOf(ident)}`;
                break;
            case SymbolKind.ARG:
                seg = `argument ${routineTable.indexOf(ident)}`;
                break;
            default:
                throw new Error(`Invalid identifier kind: ${varKind}`);
        }

        return seg;
    }

    #lookupVariable(varName, classTable, routineTable) {
        // look up the variable in the subroutine symbol table
        let varKind = routineTable.kindOf(varName);

        // if not found, look it up in the class symbol table
        if (varKind === SymbolKind.NONE) {
            varKind = classTable.kindOf(varName);

            // if not found in the class table, throw an error
            if (varKind === SymbolKind.NONE) {
                throw new Error(
                    `Variable "${varName}" not found in symbol table`
                );
            }
        }

        return varKind;
    }

    #nextLabel(className) {
        const label = className + '_' + this.#labelCounter.toString();
        this.#labelCounter++;
        return label;
    }
}
