/*
 * Known bugs:
 * Missing closing brackets are always rendered after parsing is done.
 * They could be rendered BEFORE their parrent is parsed.
 *
 * Need to add if to render title tooltip.
 */

/*
 TODO: line counter, render invalid after json
 */

"use strict";

String.prototype.repeat = function (num) {
    return new Array(num + 1).join(this);
};
/**
 * @constructor
 * @param {string} jsonString
 */
function parser(jsonString) {
    this.jsonString = jsonString;
    this.html = "";
    this.length = jsonString.length;

    this.pointer = 0;
    this.token = "";
}
/**
 * Check What type JSON is, call parseJsonObject or parseJsonArray
 */
parser.prototype.parseJson = function () {
    console.clear();
    console.log("Starting parser...");

    this.pointer = 0;

    this.getNextToken();
    if (this.token === '{') {
        this.parseJsonObject();
    } else if (this.token === '[') {
        this.parseJsonArray();
    } else {
        this.renderContent(this.jsonString, 'error', this.errorExpected('{ or ['));
    }
};
/**
 * If object is not empty call parseJsonPair, check object ending.
 * Render object container.
 */
parser.prototype.parseJsonObject = function () {
    console.group("parseJsonObject");
    console.log("Parsing JSON object @ " + this.pointer);

    this.renderObject();
    while (this.getNextToken() !== '}' && this.pointer <= this.length) {
        this.parseJsonPair();
    }
    if (this.token === '}' && this.getPrevToken() === ',') {
        this.renderObjectEnd('error', this.errorExpected('Next pair', '}', 'objectEnd'));
        this.getNextToken();
    } else if (this.getNextToken() === '}') {
        this.renderObjectEnd();
    } else {
        this.renderObjectEnd('error', this.errorExpected('}', 'EOF'));
    }

    console.log("Ended parsing JSON object");
    console.groupEnd();
};
/**
 * Parse name, check ':', parse value, check ',' or '}'.
 * Render name and value container. Render ':',',' tokens.
 */
parser.prototype.parseJsonPair = function () {
    console.group("parseJsonPair");
    console.log("Parsing JSON pair @ " + this.pointer);

    this.pointer--;
    this.renderNewItem();
    this.renderName();
    this.parseJsonString(this.getJsonValue(), this.pointer);
    this.renderEndName();

    this.getNextToken();
    if (this.token !== ':') {
        this.renderContent(this.token, 'token error', this.errorExpected(':', this.token));
    } else {
        this.renderContent(this.token, 'token');
    }

    this.renderValue();
    this.parseJsonValue();
    this.renderEndValue();

    this.getNextToken();

    if (this.token !== ',' && this.token !== '}') {
        this.renderContent(this.token, 'token error', this.errorExpected(', or }', this.token));
    } else if (this.token === ',') {
        this.renderContent(this.token, 'token');
    } else if (this.token === '}') {
        this.pointer--;
    }
    this.renderEndItem();

    console.groupEnd();
};
/**
 * If array is not empty call parseJsonValue, check array ending.
 * Render array container. Render value container. Render ',' token
 */
parser.prototype.parseJsonArray = function () {
    console.group("parseJsonArray");
    console.log("Parsing JSON array Level " + this.level + " @ " + this.pointer);

    this.renderArray(this.level);
    while (this.getNextToken() !== ']' && this.pointer <= this.length) {
        this.pointer--;

        this.renderNewItem();
        this.renderValue();
        this.parseJsonValue();
        this.renderEndValue();
        this.renderEndItem();

        this.getNextToken();
        if (this.token === ']') {
            this.pointer--;
        } else if (this.token === ',') {
            this.renderContent(this.token, 'token');
        } else {
            this.renderContent(this.token, 'token error', this.errorExpected(', or ]'));
        }
    }
    if (this.token === ']' && this.getPrevToken() === ',') {
        this.renderArrayEnd('error', this.errorExpected('Next value', ']', 'arrayEnd'));
        this.getNextToken();
    } else if (this.getNextToken() === ']') {
        this.renderArrayEnd();
    } else {
        this.renderArrayEnd('error', this.errorExpected(']', 'EOF'));
    }

    console.groupEnd();
    this.level--;
};
/**
 * Check value type. According to type call parseJsonString or parseJsonArray or parseJsonObject.
 * Otherwise parse and render value
 */
parser.prototype.parseJsonValue = function () {
    console.group("parseJsonValue");
    console.log("Parsing JSON value @ " + this.pointer);

    var value = "",
        type = "";

    this.getNextToken();
    switch (this.token) {
        case '"':
            this.pointer--;
            type = "string";
            value = this.getJsonValue();
            this.parseJsonString(value, this.pointer);
            break;
        case '[':
            this.parseJsonArray();
            break;
        case '{':
            this.parseJsonObject();
            break;
        default :
            this.pointer--;
            value = this.getJsonValue();
            switch (value) {
                case "true":
                    type = "true";
                    break;
                case 'false':
                    type = "false";
                    break;
                case 'null':
                    type = "null";
                    break;
                default :
                    if (!isNaN(value)) {
                        type = "number";
                    } else {
                        type = "error";
                    }
                    break;
            }
            if (type === 'error') {
                this.renderContent(value, 'error', this.errorExpected('STRING or NUMBER or true or false or null ', value));
            } else {
                this.renderContent(value, type);
            }
            break;
    }
    console.groupEnd();
};
/**
 * Parse and render string.
 * @param string
 * @param jsonPointer
 */

//add relative pointer ref.

parser.prototype.parseJsonString = function (string, jsonPointer) {
    console.group("parseJsonString");
    console.log("Parsing JSON string @ ", jsonPointer);

    var pattern = /[0-9A-Fa-f]{4}/,
        hexnumber = "",
        pointer = 0,
        substring = "",
        quotesfound = 0,
        char = "";

    //look if string is valid from beginning
    while (string.charAt(pointer) !== '"' && pointer <= string.length) {
        substring += string.charAt(pointer);
        pointer++;
    }

    //read invalid chars from start. render them and mark as bad
    if (substring) {
        this.renderContent(substring, 'error', this.errorExpected('STRING', substring));
        substring = "";
    }
    pointer--;
    //read string to second quotes
    while (quotesfound < 2 && pointer <= string.length) {
        if (char === '\\') {
            pointer++;
            char = string.charAt(pointer);
            substring += char;
            switch (char) {
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
                        this.renderContent(substring, 'string');
                        this.renderContent(hexnumber, 'error', this.errorExpected('uHEX NUMBER', hexnumber));
                        substring = "";
                    } else {
                        substring += hexnumber;
                    }
                    pointer = pointer + 4;
                    break;
                default:
                    substring = substring.substring(0, substring.length - 1);
                    this.renderContent(substring, 'string');
                    this.renderContent(char, 'error', this.errorExpected(' &#34; \\ / b f n r t uHEX NUMBER', char));
                    substring = "";
                    break;
            }
            console.info(this.token);
        }
        pointer++;

        char = string.charAt(pointer);
        if (char === '"') {
            quotesfound++;
        }
        substring += char;
    }
    this.renderContent(substring, 'string');
    substring = "";
    pointer++;
    //if there are any other chars read them as well
    while (pointer <= string.length) {
        substring += string.charAt(pointer);
        pointer++;
    }
    if (substring.trim()) {
        this.renderContent(substring, 'error', this.errorExpected('No more characters', substring));
    }


    console.groupEnd();
};
/**
 * Print error message to console.
 * @param expected
 * @param got
 * @returns {string} Formatted error message.
 */
parser.prototype.errorExpected = function (expected, got) {
    var text;
    if (got) {
        text = "Error: Expected " + expected + ' \nGot: ' + got + '\n@ ' + this.pointer;
    } else {
        text = "Error: Expected " + expected + ' \nGot: ' + this.token + '\n@ ' + this.pointer;
    }
    console.error(text);
    return text;
};


