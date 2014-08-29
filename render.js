//                                  --------[RENDERING METHODS]--------

parser.prototype.renderObject = function () {      //level not needed now
    this.html += '<span class="objectStart">{</span><ul class="object">';
};

parser.prototype.renderObjectEnd = function (style, title) {
    this.html += '</ul><span title="' + title + '" class="objectEnd ' + style + '">}</span>';
};

parser.prototype.renderArray = function () {
    this.html += '<span class="arrayStart">[</span><ol class="array">';
};

parser.prototype.renderArrayEnd = function (style, title) {
    this.html += '</ol><span title="' + title + '" class="arrayEnd ' + style + '">]</span>';
};

parser.prototype.renderNewItem = function () {
    this.html += '<li>';
};
parser.prototype.renderEndItem = function () {
    this.html += '</li>';
};

parser.prototype.renderName = function () {
    this.html += '<span class="property">';
};
parser.prototype.renderEndName = function () {
    this.html += '</span>';
};
parser.prototype.renderValue = function () {
    this.html += '<span class="value">';
};

parser.prototype.renderEndValue = function () {
    this.html += '</span>';
};

parser.prototype.renderContent = function (value, styles, title) {
    this.html += '<span title="' + title + '" class="' + styles + '">' + value + '</span>';
};
