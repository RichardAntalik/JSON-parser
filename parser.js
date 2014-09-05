/*
 TODO:
 */
function repeatString(string, num) {
    "use strict";
    return new Array(num + 1).join(string);
}
var Parser = function () {
    "use strict";
    /**
     * @constructor
     * @param {string} jsonString
     *
     *
     */
    var Parser = function (jsonString) {
        this.jsonString = jsonString;
        this.length = jsonString.length;

        this.pointer = -1;
        this.token = "";

        this.error = {};
        this.error.isValid = true;
        this.error.trace = [];
    };
    /**
     * @returns {string} Return next token of this.jsonString relative to this.pointer
     */
    Parser.prototype.getNextToken = function () {

        do {
            this.pointer++;
            this.token = this.jsonString.charAt(this.pointer);
        }
        while (this.token === ' ' || this.token === '\t' || this.token === '\n');
        return this.token;
    };
    /**
     * @returns {string} Return previous token of this.jsonString relative to this.pointer
     */
    Parser.prototype.getPrevToken = function () {

        do {
            this.pointer--;
            this.token = this.jsonString.charAt(this.pointer);
        }
        while (this.token === ' ' || this.token === '\t' || this.token === '\n');
        return this.token;
    };
    /**
     * Extract value from this.jsonString.
     * Read from this.pointer to common ending tokens, newline.
     * Strings are extracted properly.
     * @returns {string} extracted value
     */
    Parser.prototype.getJsonValue = function () {
        console.group("getJsonValue");

        var start = this.pointer,
            value = "",
            character = '',
            escaped = false,
            isInString = 0;

        do {
            character = this.jsonString.charAt(this.pointer);
            if (character === '\\') {
                escaped = !escaped;
            } else {
                if (character === '"' && !escaped) {
                    isInString++;
                }
                escaped = false;
            }
            this.pointer++;
        }
        while (
        ( isInString === 1 || (
        character !== ',' &&
        character !== ':' &&
        character !== ']' &&
        character !== '}' &&
        character !== '\n' &&
        character !== ' ')
        ) && this.pointer <= this.length);

        value = this.jsonString.substring(start, this.pointer - 1);
        if (start === this.pointer) {
            value = this.jsonString.charAt(this.pointer);
            this.pointer++;
        }
        this.pointer--;
        this.pointer--;

        console.log(value);
        console.groupEnd();
        return value;
    };
    /**
     * Starts parsing this.jsonString
     * @returns {object} jsonImage
     *
     * jsonImage is object in form {members: [[name:name, value:vlaue],...]} or an array of values.
     */
    Parser.prototype.parseJson = function () {
        console.clear();
        console.log("Starting parser...");

        var jsonImage;

        this.getNextToken();
        if (this.token === '{') {
            jsonImage = this.parseJsonObject();
        } else if (this.token === '[') {
            jsonImage = this.parseJsonArray();
        } else {
            this.errorExpected('{ or [');
        }
        if(this.getNextToken()) {
            this.errorExpected("no more characters");
        }
        return jsonImage;
    };
    /**
     * Parse json object.
     * @returns {object} object in form {members: {[name:name, value:vlaue],...]}
     */
    Parser.prototype.parseJsonObject = function () {
        console.group("parseJsonObject");
        console.log("Parsing JSON object @ " + this.pointer);

        var pair, content = [];

        while (this.error.isValid && this.getNextToken() !== '}' && this.pointer <= this.length) {
            pair = this.parseJsonPair();
            content.push(pair);

        }
        if (this.token === '}' && this.getPrevToken() === ',') {
            this.getNextToken();
            this.errorExpected('Next pair', '}');
        } else if (this.getNextToken() !== '}') {
            this.errorExpected('}', 'EOF');
        }

        console.log("Ended parsing JSON object");
        console.groupEnd();

        return {"members": content};
    };
    /**
     * Parse json pair
     * @returns {{name: string, value: *}}
     */
    Parser.prototype.parseJsonPair = function () {
        console.group("parseJsonPair");
        console.log("Parsing JSON pair @ " + this.pointer);

        var name, value;

        name = this.getJsonValue();
        this.parseJsonString(name, this.pointer);

        if (this.getNextToken() !== ':') {
            this.errorExpected(':', this.token);
        }

        value = this.parseJsonValue();
        this.getNextToken();

        if (this.token !== ',' && this.token !== '}') {
            this.errorExpected(', or }', this.token);
        } else if (this.token === '}') {
            this.getPrevToken();
        }

        console.groupEnd();

        return {
            "name": name,
            "value": value
        };
    };
    /**
     * Parse json array
     * @returns {Array}
     */
    Parser.prototype.parseJsonArray = function () {
        console.group("parseJsonArray");
        console.log("Parsing JSON array @ " + this.pointer);

        var value, content = [];

        while (this.error.isValid && this.getNextToken() !== ']' && this.pointer <= this.length) {
            this.getPrevToken();
            value = this.parseJsonValue();
            content.push(value);

            this.getNextToken();

            if (this.token === ']') {
                this.getPrevToken();
            } else if (this.token !== ',') {
                this.errorExpected(', or ]');
            }
        }
        if (this.token === ']' && this.getPrevToken() === ',') {
            this.errorExpected('Next value', ']');
        }
        this.getNextToken();
        console.groupEnd();

        return content;
    };
    /**
     * Parse json value
     * @returns {*} converted value
     */
    Parser.prototype.parseJsonValue = function () {
        console.group("parseJsonValue");
        console.log("Parsing JSON value @ " + this.pointer);

        var value;

        this.getNextToken();
        switch (this.token) {
            case '"':
                value = this.getJsonValue();
                this.parseJsonString(value, this.pointer);
                break;
            case '[':
                value = this.parseJsonArray();
                break;
            case '{':
                value = this.parseJsonObject();
                break;
            case '+':
                this.errorExpected('STRING or NUMBER or true or false or null');
                break;
            default :
                value = this.getJsonValue();
                switch (value.trim()) {
                    case "true":
                        value = true;
                        break;
                    case 'false':
                        value = false;
                        break;
                    case 'null':
                        value = null;
                        break;
                    default :
                        if (isNaN(value) || !value) {
                            this.errorExpected('STRING or NUMBER or true or false or null ', value, this.pointer - (value.length - 1 ));
                        } else {
                            value = parseFloat(value);
                        }
                        break;
                }
        }
        console.groupEnd();
        return value;
    };
    /**
     * Parse string.
     * @param string string to parse
     * @param stringAtPointer position of string
     */

    Parser.prototype.parseJsonString = function (string, stringAtPointer) {
        console.group("parseJsonString");
        console.log("Parsing JSON string @ ", stringAtPointer);

        var pattern = /[0-9A-Fa-f]{4}/,
            hexnumber = "",
            pointer = -1,
            quotesfound = 0,
            character = "",
            start = stringAtPointer - string.length - 1;

        if (string.charAt(0) !== '"') {
            this.errorExpected('STRING', string, start + 2);
            console.log('error');
        }

        //read string to second quotes
        while (quotesfound < 2 && pointer <= string.length) {
            if (character === '\\') {
                pointer++;
                character = string.charAt(pointer);
                switch (character) {
                    case '"':
                        break;
                    case '\\':
                        break;
                    case '/':
                        break;
                    case 'b':
                        break;
                    case 'f':
                        break;
                    case 'n':
                        break;
                    case 'r':
                        break;
                    case 't':
                        break;
                    case 'u':
                        hexnumber = string.substr(pointer + 1, 4);
                        console.log('testing hex:', hexnumber);
                        if (!pattern.test(hexnumber)) {
                            this.errorExpected('HEX NUMBER', hexnumber, start + pointer + 3);
                        }
                        pointer = pointer + 4;
                        break;
                    default:
                        this.errorExpected(' &#34; \\ / b f n r t uHEX NUMBER', character, start + pointer + 2);
                        break;
                }
            }
            pointer++;
            character = string.charAt(pointer);
            if (character === '"') {
                quotesfound++;
            }
        }
        while (pointer <= string.length) {
            pointer++;
            character = string.charAt(pointer);
            if (character.trim()) {
                this.errorExpected('No more characters', character, start + pointer + 2);
            }
        }

        console.groupEnd();
    };
    /**
     * Print error message to console.
     * @param expected
     * @param got
     * @returns {string} Formatted error message.
     */
    Parser.prototype.errorExpected = function (expected, got, pointer) {

        if (!this.error.errorText) {
            if (!pointer) {
                pointer = this.pointer;
            }

            if (!got) {
                got = this.token;
            }

            var nlpos = 0,
                nl = 0,
                i;

            for (i = 0; i < pointer; i++) {
                if (this.jsonString.charAt(i) === '\n') {
                    nl++;
                    nlpos = i + 1;
                }
            }
            this.error.errorAtLine = nl;
            this.error.errorAtCol = i - nlpos;
            this.error.errorAtPointer = this.pointer;
            if (this.pointer >= this.jsonString.length) {
                got = "eof";
            }
            this.error.errorText = "Error: Expected " + expected + ' \nGot: ' + got + '\nline ' + nl + ' col ' + (i - nlpos);

            this.getErrorSubstring(pointer);

            console.error(this.error.errorText);
        }
        this.error.isValid = false;
    };
    /**
     * Create an array containing 2lines or 100 charaters before and after error, and bad character inbetween
     * @param errorAtPointer
     */
    Parser.prototype.getErrorSubstring = function (errorAtPointer) {
        var pointer = errorAtPointer,
            nl = 0,
            chars = 0;

        do {
            pointer--;
            chars++;
            if (this.jsonString.charAt(pointer) === '\n') {
                nl++;
            }
        } while (nl < 3 && pointer > 0 && chars < 100);

        this.error.sampleString = [
            this.jsonString.substring(pointer, errorAtPointer),
            this.jsonString.substring(errorAtPointer, errorAtPointer + 1)
        ];

        pointer = errorAtPointer;
        nl = 0;
        chars = 0;

        do {
            chars++;
            pointer++;
            if (this.jsonString.charAt(pointer) === '\n') {
                nl++;
            }
        } while (nl < 3 && pointer <= this.length && chars < 100);
        this.error.sampleString.push(this.jsonString.substring(errorAtPointer + 1, pointer));
    };

    return Parser;
}
();
