//                                  --------[RENDERING METHODS]--------

parser.prototype.renderObject = function () {      //level not needed now
    this.html += '<span class="object Start">{</span><span class="toogle">-</span><ul class="">';
};

parser.prototype.renderObjectEnd = function (style, title) {
    if (!title) {
        title = '';
    }
    this.html += '</ul><span title="' + title + '" class="objectEnd ' + style + '">}</span>';
};

parser.prototype.renderArray = function () {
    this.html += '<span class="array Start">[</span><span class="toogle">-</span><ol class="">';
};

parser.prototype.renderArrayEnd = function (style, title) {
    if (!title) {
        title = '';
    }
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
    if (!title) {
        title = '';
    }
    this.html += '<span title="' + title + '" class="' + styles + '">' + value + '</span>';
};
