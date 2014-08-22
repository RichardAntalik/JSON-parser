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
    this.pointer = 0;
    this.token = "";
    this.length = jsonString.length;
    this.objectLevel = 0;
    this.arrayLevel = 0;
}

//Return next token of this.jsonString relative to this.pointer
parser.prototype.getNextToken = function () {

    this.token = this.jsonString.charAt(this.pointer);
    while (this.token === ' ' || this.token === '\t' || this.token === '\n') {
        this.pointer++;
        this.token = this.jsonString.charAt(this.pointer);
    }
    this.pointer++;
    return this.token;
};

//This function should be called to start parsing
parser.prototype.parseJson = function () {
    console.clear();
    console.log("Starting parser...");
    if (this.getNextToken() === '{') {
        this.parseJsonObject();
    } else {
        this.errorExpected('{');
    }
};

//parse JSON object.
parser.prototype.parseJsonObject = function () {
    this.objectLevel++;
    console.group("parseJsonObject");
    console.log("Parsing JSON object Level " + this.objectLevel + " @ " + this.pointer);
    while (this.getNextToken() !== '}' && this.pointer <= this.length) {
        if (this.token === '"') {
            this.parseJsonPair();
        } else {
            this.errorExpected('} or "');
        }
    }
    console.log("Ended parsing JSON object");
    console.groupEnd();
    this.objectLevel--;
};

//Because JSON is name:value pair. Parse string, than parse value
parser.prototype.parseJsonPair = function () {
    console.group("parseJsonPair");
    console.log("Parsing JSON pair @ " + this.pointer);

    if (this.token === '"') {
        this.parseJsonString();
    } else {
        this.errorExpected('"');
    }
    if (this.getNextToken() !== ':') {
        this.errorExpected(':');
    } else {
        this.parseJsonValue();
    }
    this.getNextToken();
    if (this.token === '}') {
        this.pointer--;
    } else if (this.token !== ',') {
        this.errorExpected(', }');
    }

    console.groupEnd();
};

parser.prototype.parseJsonValue = function () {
    console.group("parseJsonValue");
    console.log("Parsing JSON value @ " + this.pointer);

    this.getNextToken();
    if (this.token === '"') {
        this.parseJsonString();
    } else if (this.token === 't') {
        this.parseJsonTrue();
    } else if (this.token === 'f') {
        this.parseJsonFalse();
    } else if (this.token === 'n') {
        this.parseJsonNull();
    } else if (this.token === '[') {
        this.parseJsonArray();
    } else if (this.token === '{') {
        this.parseJsonObject();
    } else if (this.token === '-') {
        this.parseJsonNumber();
    } else if (!isNaN(this.token)) {
        this.parseJsonNumber();
    } else {
        this.errorExpected('[ { NUMBER STRING true false null');
    }

    console.groupEnd();
};

parser.prototype.parseJsonTrue = function () {
    console.group("parseJsonString");
    console.log("Parsing . @ " + this.pointer);

    var start = this.pointer - 1, value;

    while (this.token !== ',' && this.token !== '}' && this.token !== ']') {
        this.getNextToken();
    }
    value = this.jsonString.substring(start, --this.pointer);
    if (value.trim() !== "true") {
        console.log('expected true got ' + value);
    }

    console.groupEnd();
};

parser.prototype.parseJsonFalse = function () {
    console.group("parseJsonFalse");
    console.log("Parsing JSON false @ " + this.pointer);

    var start = this.pointer - 1, value;

    while (this.token !== ',' && this.token !== '}' && this.token !== ']') {
        this.getNextToken();
    }
    value = this.jsonString.substring(start, --this.pointer);
    if (value.trim() !== "false") {
        console.log('expected false got ' + value);
    }


    console.groupEnd();
};

parser.prototype.parseJsonNull = function () {
    console.group("parseJsonNull");
    console.log("Parsing JSON null @ " + this.pointer);

    var start = this.pointer - 1, value;

    while (this.token !== ',' && this.token !== '}' && this.token !== ']') {
        this.getNextToken();
    }
    value = this.jsonString.substring(start, --this.pointer);
    if (value.trim() !== "null") {
        console.log('expected null got ' + value);
    }

    console.groupEnd();
};

parser.prototype.parseJsonNumber = function () {
    console.group("parseJsonNumber");
    console.log("Parsing JSON number @ " + this.pointer);

    var start = this.pointer - 1, number;

    while (this.token !== ',' && this.token !== '}' && this.token !== ']') {
        this.getNextToken();
    }
    number = this.jsonString.substring(start, --this.pointer);
    if (isNaN(number)) {
        this.errorExpected('NUMBER', number);
    }

    console.groupEnd();
};

parser.prototype.parseJsonString = function () {
    console.group("parseJsonString");
    console.log("Parsing JSON string @ " + this.pointer);

    var pattern = /[0-9A-Fa-f]{4}/, hexnumber;

    this.getNextToken();
    while (this.token !== '"') {
        if (this.token === '\\') {
            this.getNextToken();
            switch (this.token) {
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
                    hexnumber = this.jsonString.substr(this.pointer, 4);
                    if (!pattern.test(hexnumber)) {
                        console.log(hexnumber);
                        this.errorExpected('HEX NUMBER', hexnumber);
                    }
                    this.pointer = this.pointer + 4;
                    break;
                default:
                    this.errorExpected('" \\ / b f n r t u');
                    break;
            }
        }
        this.getNextToken();
    }

    console.groupEnd();
};


//array can contain any type of above. combined, nested
parser.prototype.parseJsonArray = function () {
    this.arrayLevel++;
    console.group("parseJsonArray");
    console.log("Parsing JSON array Level " + this.arrayLevel + " @ " + this.pointer);

    while (this.getNextToken() !== ']') {
        this.pointer--;
        this.parseJsonValue();
        this.getNextToken();
        if (this.token === ']') {
            break;
        }
        if (this.token !== ',') {
            this.errorExpected(',');
        }
    }

    console.groupEnd();
    this.arrayLevel--;
};

//show expected error message
parser.prototype.errorExpected = function (expected, got) {
    //alert("Error: expected " + expected + " got " + this.token);
    if (got) {
        console.error("Error: expected " + expected + " got " + got + " @ " + this.pointer);
    } else {
        console.error("Error: expected " + expected + " got " + this.token + " @ " + this.pointer);
    }
};

parser.prototype.getJsonString = function () {
    console.group("getJsonString");

    var string = "",
        char = "";
    do {
        char = this.jsonString.charAt(this.pointer);
        this.pointer++;
        if (char === '\\' && this.jsonString.charAt(this.pointer) === '\"') {
            string += '\\\"';
            this.pointer++;
        } else {
            string += char;
        }
    } while (this.jsonString.charAt(this.pointer) !== '"');
    string += '"';

    console.info(string);
    console.groupEnd();
    return string;
};

parser.prototype.prettify = function () {
    var char = "",
        prettified = "",
        indent = 0;

    this.jsonString = this.minify();
    while (this.pointer <= this.length) {
        char = this.jsonString.charAt(this.pointer);
        switch (char) {
            case '"':
                prettified += this.getJsonString();
                break;
            case ':':
                prettified += ": ";
                break;
            case '{':
                indent++;
                prettified += "{\n" + "\t".repeat(indent);
                break;
            case '[':
                indent++;
                prettified += "[\n" + "\t".repeat(indent);
                break;
            case ',':
                prettified += ",\n" + "\t".repeat(indent);
                break;
            case '}':
                indent--;
                prettified += "\n" + "\t".repeat(indent) + "}";
                break;
            case ']':
                indent--;
                prettified += "\n" + "\t".repeat(indent) + "]";
                break;
            default:
                prettified += char;
                break;
        }
        this.pointer++;
    }
    return prettified;
};

parser.prototype.minify = function () {
    var minified = "";

    while (this.pointer <= this.length) {
        if (this.getNextToken() === "\"") {
            this.pointer--;
            minified += this.getJsonString();
            this.pointer++;
        } else {
            minified += this.token;
        }
    }
    this.pointer = 0;
    return minified;
};
