//                                      --------[DATA METHODS]--------

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

parser.prototype.getJsonValue = function () {
    console.group("getJsonValue");

    var start = this.pointer,
        string = "",
        char = '',
        isInString = 0;

    char = this.jsonString.charAt(this.pointer);
// Here comes the magic...
    while (((char !== ',' && char !== ':' && char !== ']' && char !== '}' && char !== '\n') || isInString === 1) && this.pointer <= this.length) {
//    while (((char !== ',' && char !== ':' && char !== ']' && char !== '}' && char !== '\n' && isInString < 2)) && this.pointer <= this.length) {
        if ((char === '"' && this.jsonString.charAt(this.pointer - 1) !== '\\') ||
            (char === '"' && this.jsonString.charAt(this.pointer - 1) === '\\' && this.jsonString.charAt(this.pointer - 2) === '\\')) {
            isInString++;       //fool me once...
        }
        this.pointer++;
        char = this.jsonString.charAt(this.pointer);
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
