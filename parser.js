/*
 * JSON parser. Parses string char by char
 * Maybe I should make it as a string method...
 *
 * Important note: I'm not very happy with this char by char method.
 * The reason is, that pointer have to be moved with caution.
 * This is because number, true, false and null values don't have any wrapping elements,
 * that string, array and object do.
 * So the string parser expects the pointer to be at '"' '{"string": ***}' ,
 * but the number parser expects pointer to be before an actual number.
 *
 * Also termination of non-wrapped value is a control token for its parent parser method.
 */

"use strict";

String.prototype.repeat = function (num) {
    return new Array(num + 1).join(this);
};

function parser(jsonString) {

    this.jsonString = jsonString;
    this.length = jsonString.length;
    this.pointer = 0;

    this.token = "";
    this.indentLevel = 0;

    this.level = 0;
    this.html = "";
}

//This function should be called to start parsing
parser.prototype.parseJson = function () {
    console.clear();
    console.log("Starting parser...");

    this.pointer = 0;

    while (this.pointer <= this.length) {
        this.getNextToken();
        if (this.token === '{') {
            this.parseJsonObject();
        }
        if (this.token === '[') {
            this.parseJsonArray();
        }           // else error...
    }
};

parser.prototype.parseJsonObject = function () {
    this.level++;
    console.group("parseJsonObject");
    console.log("Parsing JSON object Level " + this.level + " @ " + this.pointer);

    this.renderObject(this.level);
    while (this.getNextToken() !== '}' && this.pointer <= this.length) {
        this.parseJsonPair();
    }

    if (this.token === '}' && this.getPrevToken() === ',') {
        this.renderObjectEnd('error', this.errorExpected('Next pair', '}', 'objectEnd'));
        this.getNextToken();
    } else if (this.getNextToken() === '}') {
        this.renderObjectEnd();
    } else {
        this.errorExpected('}', '', 'dummy');       //dummy
    }

    console.log("Ended parsing JSON object");
    console.groupEnd();
    this.level--;
};

parser.prototype.parseJsonPair = function () {
    console.group("parseJsonPair");
    console.log("Parsing JSON pair @ " + this.pointer);

    //  if (this.token === '"') {
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
        this.renderContent(this.token, 'token error', this.errorExpected(', or }', this.token))
    } else if (this.token === ',') {
        this.renderContent(this.token, 'token');
    }
    this.renderEndItem();

    if (this.token === '}') {
        this.pointer--;
    }
    console.groupEnd();
};
parser.prototype.parseJsonArray = function () {
    this.level++;
    console.group("parseJsonArray");
    console.log("Parsing JSON array Level " + this.level + " @ " + this.pointer);

    this.renderArray(this.level);
    while (this.getNextToken() !== ']' && this.pointer <= this.length) {
        this.pointer--;

        this.renderNewItem();
        this.renderValue();
        this.parseJsonValue();
        this.renderEndValue();

        this.getNextToken();
        if (this.token === ']') {
            this.pointer--;
        } else if (this.token === ',') {
            this.renderContent(this.token, 'token');
        } else {
            this.renderToken(this.token, 'token error', this.errorExpected(', or ]'));
        }
    }
    if (this.token === ']') {
        this.getPrevToken();
        if (this.token === ',') {
            this.renderArrayEnd('error', this.errorExpected('Next item', ']', 'arrayEnd'));
        } else {
            this.renderArrayEnd();
        }
        this.getNextToken();
    } else {
        this.renderDummyToken(this.level);
        this.errorExpected(']', ' ', 'dummy');
    }

    console.groupEnd();
    this.level--;
};


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

    //  return [value, type, error];
};

//Add expected no more chars in case of missed ". Add errexpctd parameter for error offset report
parser.prototype.parseJsonString = function (string, jsonPointer) {
    console.group("parseJsonString");
    console.log("Parsing JSON string @ ", jsonPointer);

    var pattern = /[0-9A-Fa-f]{4}/,
        hexnumber = "",
        pointer = 0,
        substring = "",
        quotesfound = 0,
        char = "";

    //look if it is valid string from beginning
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
                        this.renderContent(hexnumber, error, this.errorExpected('uHEX NUMBER', hexnumber));
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

//show expected error message
parser.prototype.errorExpected = function (expected, got) {
    //alert("Error: expected " + expected + " got " + this.token);
    var text;
    if (got) {
        text = "Error: Expected " + expected + ' \nGot: ' + got + '\n@ ' + this.pointer;
    } else {
        text = "Error: Expected " + expected + ' \nGot: ' + this.token + '\n@ ' + this.pointer;
    }
    console.error(text);
    return text;
};


