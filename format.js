/**
 * @returns {string} prettified string of this.jsonString
 */
parser.prototype.prettify = function () {
    var character = "",
        prettified = "",
        indent = 0,
        indentChar = "  ";

    this.jsonString = this.minify();
    this.pointer = 0;

    while (this.pointer <= this.length) {
        character = this.jsonString.charAt(this.pointer);
        switch (character) {
            case '"':
                prettified += this.getJsonValue();
                this.pointer--;
                break;
            case ':':
                prettified += ": ";
                break;
            case '{':
                indent++;
                prettified += "{\n" + repeatString(indentChar, indent);
                break;
            case '[':
                indent++;
                prettified += "[\n" + repeatString(indentChar, indent);
                break;
            case ',':
                prettified += ",\n" + repeatString(indentChar, indent);
                break;
            case '}':
                indent--;
                prettified += "\n" + repeatString(indentChar, indent) + "}";
                break;
            case ']':
                indent--;
                prettified += "\n" + repeatString(indentChar, indent) + "]";
                break;
            default:
                prettified += character;
                break;
        }
        this.pointer++;
    }
    return prettified;
};
/**
 * @returns {string} minified string of this.jsonString
 */
parser.prototype.minify = function () {
    var minified = "";

    this.pointer = 0;
    while (this.pointer <= this.length) {
        if (this.getNextToken() === '"') {
            this.pointer--;
            minified += this.getJsonValue();
            //this.pointer++;
        } else {
            minified += this.token;
        }
    }
    return minified;
};