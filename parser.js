var Parser = (function () {
    "use strict";
    /**
     * @param {object} logger ODT.Logger
     * @constructor
     */
    var Parser = function (logger) {
        if (logger) {
            this.logger = logger;
            this.enableLogs = logger.isEnabledLogging();
        }
    };
    /**
     *Repeats string num times
     * @param {string} string
     * @param {number} num
     * @returns {string}
     */
    Parser.prototype.repeatString = function (string, num) {
        return new Array(num + 1).join(string);
    };
    /**
     * Gets next non-whitespace character.
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
     * Gets previous non-whitespace character.
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
     * Read from this.pointer to common ending tokens or newline.
     * @returns {string} extracted value
     */
    Parser.prototype.getJsonValue = function () {
        this.sendGroup("getJsonValue");

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

        this.sendLog(value);
        this.sendGroupEnd();
        return value;
    };

    /**
     * @name errorObject
     * @type {Object}
     * @property {number} atLine
     * @property {number} atCol
     * @property {number} atPointer
     * @property {string} text
     * @property {array.string} sampleString
     */

    /**
     * jsonImage:
     * jsonImage represents structure of JSON.
     * object and array notation is represented by array. First item is a string determining type. Following by objects
     * with property 'name' in case of object representation and 'value' for both types. Name property contains name of
     * json pair. Value property contains its value. In case a JSON value is array or object, value property will
     * contain jsonImage.
     * ['object' | 'array', {name: 'name', value: 'value'}, ...]
     * @typedef {Array.(Object.<string, *>|*)} jsonImage
     */

    /**
     * Starts parsing this.jsonString
     * @param (string) jsonString
     * @returns {object} {jsonImage: {@link jsonImage}, isValid: boolean, error: {@link errorObject}}
     */
    Parser.prototype.parseJson = function (jsonString) {
        this.sendLog("Starting parser...");

        this.timestamp = new Date().getTime();
        this.pointer = -1;
        this.jsonString = jsonString;
        this.length = jsonString.length;
        this.isValid = true;
        this.jsonImage = {};
        this.error = {};
        var jsonImage = {};
        this.oneshot = true;

        this.getNextToken();
        if (this.token === '{') {
            jsonImage.jsonImage = this.parseJsonObject();
        } else if (this.token === '[') {
            jsonImage.jsonImage = this.parseJsonArray();
        } else {
            this.errorExpected('{ or [');
        }
        if (this.getNextToken()) {
            this.errorExpected("no more characters");
        }

        jsonImage.error = this.error;
        jsonImage.isValid = this.isValid;
        return jsonImage;
    };
    /**
     * Parse json object.
     * @returns {jsonImage}
     */
    Parser.prototype.parseJsonObject = function () {
        this.sendGroup("parseJsonObject");
        this.sendLog("Parsing JSON object @ " + this.pointer);

        var pair, content = [];
        content.push("object");
        while (this.isValid && this.getNextToken() !== '}' && this.pointer <= this.length) {
            pair = this.parseJsonPair();
            content.push(pair);

        }
        if (this.token === '}' && this.getPrevToken() === ',') {
            this.getNextToken();
            this.errorExpected('Next pair', '}');
        } else if (this.getNextToken() !== '}') {
            this.errorExpected('}', 'EOF');
        }

        this.sendLog("Ended parsing JSON object");
        this.sendGroupEnd();

        return content;
    };
    /**
     * Parse json pair
     * @returns {{name: string, value: *}}
     */
    Parser.prototype.parseJsonPair = function () {
        this.sendGroup("parseJsonPair");
        this.sendLog("Parsing JSON pair @ " + this.pointer);

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

        this.sendGroupEnd();

        return {
            "name": name,
            "value": value
        };
    };
    /**
     * Parse json array
     * @returns {jsonImage}
     */
    Parser.prototype.parseJsonArray = function () {
        this.sendGroup("parseJsonArray");
        this.sendLog("Parsing JSON array @ " + this.pointer);

        var value, content = [];
        content.push("array");
        while (this.isValid && this.getNextToken() !== ']' && this.pointer <= this.length) {
            this.getPrevToken();
            value = this.parseJsonValue();
            content.push({value: value});

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
        this.sendGroupEnd();

        return content;
    };
    /**
     * Parse json value
     * @returns {*} converted value
     */
    Parser.prototype.parseJsonValue = function () {
        this.sendGroup("parseJsonValue");
        this.sendLog("Parsing JSON value @ " + this.pointer);
        var value,
            pattern = /^\s*(-?[0-9]*([.]?[0-9]+))(((e|E)(-|\+)?)[0-9]+)?\s*$/;
        this.sendProgressMsg("Parsing...");
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
                        if (pattern.test(value)) {
                            value = parseFloat(value);
                        } else {
                            this.errorExpected('STRING or NUMBER or true or false or null ', value, this.pointer - (value.length - 1 ));
                        }
                        break;
                }
        }
        this.sendGroupEnd();
        return this.escapeText(value);
    };
    /**
     * Escape dangerous characters.
     * @param {*} text
     * @returns {*}
     */
    Parser.prototype.escapeText = function (text) {
        if (typeof text === 'string') {
            return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        return text;
    };

    /**
     * Parse string.
     * @param string string to parse
     * @param string AtPointer end position of string
     */
    Parser.prototype.parseJsonString = function (string, stringAtPointer) {
        this.sendGroup("parseJsonString");
        this.sendLog("Parsing JSON string @ ", stringAtPointer);


        var pattern = /[0-9A-Fa-f]{4}/,
            hexnumber = "",
            pointer = -1,
            quotesfound = 0,
            character = "",
            start = stringAtPointer - (string.length - 1);

        if (string.charAt(0) !== '"') {
            this.errorExpected('STRING', string, start);
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
                        this.sendLog('testing hex:', hexnumber);
                        if (!pattern.test(hexnumber)) {
                            this.errorExpected('HEX NUMBER', hexnumber, start + pointer + 1);
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

        this.sendGroupEnd();
    };
    /**
     * Create error message.
     * @param expected
     * @param got
     */
    Parser.prototype.errorExpected = function (expected, got, pointer) {

        if (this.isValid) {
            if (!pointer) {
                pointer = this.pointer;
            }

            if (!got) {
                got = this.token;
            }
            if (this.pointer >= this.jsonString.length) {
                got = "eof";
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
            this.error.atLine = nl;
            this.error.atCol = i - nlpos;
            this.error.atPointer = this.pointer;
            this.error.text = "Error: Expected " + expected + ' \nGot: ' + got + '\nline ' + nl + ' col ' + (i - nlpos);
            this.error.sampleString = this.getErrorSubstring(pointer);

            //console.error(this.error.errorText);
        }
        this.isValid = false;
    };
    /**
     * Create an array containing 2lines or 50 charaters before and after error, and bad character inbetween
     * @param {number} errorAtPosition
     */
    Parser.prototype.getErrorSubstring = function (errorAtPosition) {
        var pointer = errorAtPosition,
            nl = 0,
            chars = 0,
            sampleString = [];

        do {
            pointer--;
            chars++;
            if (this.jsonString.charAt(pointer) === '\n') {
                nl++;
            }
        } while (nl < 3 && pointer > 0 && chars < 50);

        sampleString = [
            this.jsonString.substring(pointer, errorAtPosition),
            this.jsonString.substring(errorAtPosition, errorAtPosition + 1)
        ];

        pointer = errorAtPosition;
        nl = 0;
        chars = 0;

        do {
            chars++;
            pointer++;
            if (this.jsonString.charAt(pointer) === '\n') {
                nl++;
            }
        } while (nl < 3 && pointer <= this.length && chars < 50);
        sampleString.push(this.jsonString.substring(errorAtPosition + 1, pointer));

        if (!sampleString[1]) {
            sampleString[1] = ' ';
        }
        return sampleString;
    };
    /**
     * Prettify JSON.
     * @param {string} jsonString
     * @param {string} indentString
     * @returns {string} prettified string of jsonString
     */
    Parser.prototype.prettify = function (jsonString, indentString) {
        var character = "",
            prettified = "",
            indentLevel = 0;
        this.jsonString = jsonString;
        this.length = this.jsonString.length;
        this.pointer = -1;
        this.timestamp = new Date().getTime();
        this.oneshot = true;

        if (!indentString) {
            indentString = '  ';
        }
        while (this.pointer <= this.length) {
            character = this.getNextToken();
            this.sendProgressMsg("Prettifying...");
            switch (character) {
                case '"':
                    prettified += this.getJsonValue();
                    break;
                case ':':
                    prettified += ": ";
                    break;
                case '{':
                    indentLevel++;
                    prettified += "{\n" + this.repeatString(indentString, indentLevel);
                    break;
                case '[':
                    indentLevel++;
                    prettified += "[\n" + this.repeatString(indentString, indentLevel);
                    break;
                case ',':
                    prettified += ",\n" + this.repeatString(indentString, indentLevel);
                    break;
                case '}':
                    indentLevel--;
                    prettified += "\n" + this.repeatString(indentString, indentLevel) + "}";
                    break;
                case ']':
                    indentLevel--;
                    prettified += "\n" + this.repeatString(indentString, indentLevel) + "]";
                    break;
                default:
                    prettified += character;
                    break;
            }
        }
        return prettified;
    };
    /**
     * Minify JSON.
     * @param {string} jsonString
     * @returns {string} minified string of this.jsonString
     */
    Parser.prototype.minify = function (jsonString) {
        var minified = "";
        this.jsonString = jsonString;
        this.length = this.jsonString.length;
        this.pointer = -1;
        this.timestamp = new Date().getTime();
        this.oneshot = true;

        while (this.pointer <= this.length) {
            this.sendProgressMsg("Minifying...");
            if (this.getNextToken() === '"') {
                minified += this.getJsonValue();
            } else {
                minified += this.token;
            }
        }
        return minified;
    };
    /**
     * Logging function
     * @param {...*} context context
     */
    Parser.prototype.sendLog = function (context) {
        if (this.enableLogs) {
            var msg = {};
            msg.action = "log";
            var args = Array.prototype.slice.call(arguments);  //OMG this thing is such slow...
            msg.data = args.join(' ');
            if (self.document === undefined) {
                postMessage(JSON.stringify(msg));
            } else {
                this.logger.info(msg.data);
            }
        }
    };
    /**
     * Create new log group
     * @param {string} group
     */
    Parser.prototype.sendGroup = function (group) {
        if (this.enableLogs) {
            var msg = {};
            msg.action = "group";
            msg.data = group;
            if (self.document === undefined) {
                postMessage(JSON.stringify(msg));
            } else {
                this.logger.enter(msg.data);
            }
        }
    };
    /**
     * Close new log group
     * @param {string} group
     */
    Parser.prototype.sendGroupEnd = function (group) {
        if (this.enableLogs) {
            var msg = {};
            msg.action = "groupEnd";
            msg.data = group;
            if (self.document === undefined) {
                postMessage(JSON.stringify(msg));
            } else {
                this.logger.exit(msg.data);
            }
        }
    };
    /**
     * Send info about action progress
     * @param {string} action action name
     * @param {boolean} force force update
     */
    Parser.prototype.sendProgressMsg = function (action, force) {
        var time;
        if (self.document === undefined) {

            if (this.oneshot) {
                time = 50;
            } else {
                time = 50;
            }

            var timenow = new Date().getTime(),
                msg = {};

            if (timenow > this.timestamp + time || force) {
                this.oneshot = false;
                this.timestamp = timenow;
                msg.action = action;
                msg.processed = this.pointer;
                msg.total = this.length;
                postMessage(JSON.stringify(msg));
            }
        }
    };
    return Parser;
}());


