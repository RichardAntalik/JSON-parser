//                                      --------[DATA METHODS]--------
/**
 *
 * @returns {string} Return next token of this.jsonString relative to this.pointer
 */
parser.prototype.getNextToken = function () {

    this.token = this.jsonString.charAt(this.pointer);
    while (this.token === ' ' || this.token === '\t' || this.token === '\n') {
        this.pointer++;
        this.token = this.jsonString.charAt(this.pointer);
    }
    this.pointer++;
    return this.token;
};
/**
 *
 * @returns {string} Return previous token of this.jsonString relative to this.pointer
 */
parser.prototype.getPrevToken = function () {

    this.pointer = this.pointer - 2;

    this.token = this.jsonString.charAt(this.pointer);
    while (this.token === ' ' || this.token === '\t' || this.token === '\n') {
        this.pointer--;
        this.token = this.jsonString.charAt(this.pointer);
    }
    this.pointer++;
    return this.token;
};
/**
 * Extract value from tjis.jsonString.
 * Read from this.pointer to common ending tokens, newline.
 * Strings are extracted properly thanks to magical condition
 *
 * @returns {string} extracted value
 */
parser.prototype.getJsonValue = function () {
    console.group("getJsonValue");

    var start = this.pointer,
        string = "",
        character = '',
        isInString = 0;

    character = this.jsonString.charAt(this.pointer);
// Here comes the magic... \" is not token \\" is
    while ((isInString === 1 || (character !== ',' && character !== ':' && character !== ']' && character !== '}' && character !== '\n')) && this.pointer <= this.length) {
        if ((character === '"' && this.jsonString.charAt(this.pointer - 1) !== '\\') ||
            (character === '"' && this.jsonString.charAt(this.pointer - 1) === '\\' && this.jsonString.charAt(this.pointer - 2) === '\\')) {
            isInString++;
        }
        this.pointer++;
        character = this.jsonString.charAt(this.pointer);
    }
    string = this.jsonString.substring(start, this.pointer);
    if (start === this.pointer) {
        string = this.jsonString.charAt(this.pointer);
        this.pointer++;
    }
    console.log(string, isInString);
    console.groupEnd();
    return string;
};
