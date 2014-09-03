/*
 *
 */

/*
 TODO: line counter, render invalid after json
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
     */
    var Parser = function (jsonString) {
        this.jsonString = jsonString;
        this.length = jsonString.length;

        this.pointer = -1;
        this.token = "";

        this.error = "";
        this.parse = true;
    };

    /**
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
        return jsonImage;
    };
    /**
     */
    Parser.prototype.parseJsonObject = function () {
        console.group("parseJsonObject");
        console.log("Parsing JSON object @ " + this.pointer);

        var pair, content = [];

        while (this.parse && this.getNextToken() !== '}' && this.pointer <= this.length) {
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

        return {"content": content};
    };
    /**
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
     */
    Parser.prototype.parseJsonArray = function () {
        console.group("parseJsonArray");
        console.log("Parsing JSON array @ " + this.pointer);

        var value, content = [];

        while (this.parse && this.getNextToken() !== ']' && this.pointer <= this.length) {
            this.getPrevToken();
            value = this.parseJsonValue();
            content.push(value);

            this.getNextToken();

            if (this.token  === ']') {
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
                this.errorExpected('STRING or NUMBER or true or false or null ');
                break;
            default :
                value = this.getJsonValue();
                switch (value) {
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
                        if (!isNaN(value)) {
                            value = parseInt(value, 10);
                        } else {
                            this.errorExpected('STRING or NUMBER or true or false or null ', value, this.pointer - (value.length - 1));
                        }
                        break;
                }
        }
        console.groupEnd();
        return value;
    };
    /**
     * Parse and render string.
     * @param string
     * @param jsonPointer
     */

    Parser.prototype.parseJsonString = function (string, jsonPointer) {
        console.group("parseJsonString");
        console.log("Parsing JSON string @ ", jsonPointer);

        var pattern = /[0-9A-Fa-f]{4}/,
            hexnumber = "",
            pointer = -1,
            quotesfound = 0,
            character = "",
            start = jsonPointer - string.length - 1;

        if (string.charAt(0) !== '"') {
            this.errorExpected('STRING', string, start);
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
                            this.errorExpected('uHEX NUMBER', hexnumber, start + pointer + 1);
                        }
                        pointer = pointer + 4;
                        break;
                    default:
                        this.errorExpected(' &#34; \\ / b f n r t uHEX NUMBER', character, start + pointer);
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
                this.errorExpected('No more characters', character, start + pointer);
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

        if (!pointer) {
            pointer = this.pointer;
        }

        var nl = 0, nlpos = 0, i;
        for (i = 0; i < pointer; i++) {
            if (this.jsonString.charAt(i) === '\n') {
                nl++;
                nlpos = i + 1;
            }
        }

        if (!this.error) {
            if (!got) {
                got = this.token;
            }
            this.error = "Error: Expected " + expected + ' \nGot: ' + got + '\nline ' + nl + ' col ' + (i - nlpos);
        }

        console.log(this.pointer, this.token);

        this.parse = false;
        console.error(this.error);
    };


    return Parser;
}();