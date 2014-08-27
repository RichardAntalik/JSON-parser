parser.prototype.prettify = function () {
    var char = "",
        prettified = "",
        indent = 0,
        indentChar = "  ";

    this.jsonString = this.minify();
    this.pointer = 0;

    while (this.pointer <= this.length) {
        char = this.jsonString.charAt(this.pointer);
        switch (char) {
            case '"':
                prettified += this.getJsonValue();
                this.pointer--;
                break;
            case ':':
                prettified += ": ";
                break;
            case '{':
                indent++;
                prettified += "{\n" + indentChar.repeat(indent);
                break;
            case '[':
                indent++;
                prettified += "[\n" + indentChar.repeat(indent);
                break;
            case ',':
                prettified += ",\n" + indentChar.repeat(indent);
                break;
            case '}':
                indent--;
                prettified += "\n" + indentChar.repeat(indent) + "}";
                break;
            case ']':
                indent--;
                prettified += "\n" + indentChar.repeat(indent) + "]";
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