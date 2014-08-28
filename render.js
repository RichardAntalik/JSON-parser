//                                  --------[RENDERING METHODS]--------

parser.prototype.renderObject = function (level) {
    console.log('rendering object', level);
    if (level === 1) {
        $('#output').append('<span class="objectStart">{</span><ul class="object level' + level + '"></ul>');
    } else {
        $('li').last().append('<span class="objectStart">{</span>');
        $('.level' + (level - 1)).append('<ul class="object level' + level + '"></ul>');
    }
};

parser.prototype.renderObjectEnd = function (level) {
    console.log('rendering object', level);
    $('.level' + level).last().after('<span class="objectEnd">}</span>');
};

parser.prototype.renderArray = function (level) {
    console.log('rendering object', level);
    if (level === 1) {
        $('#output').append('<span class="arrayStart">[</span><ol start="0" class="array level' + level + '"></ol>');
    } else {
        $('li').last().append('<span class="arrayStart">[</span>');
        $('.level' + (level - 1)).last().append('<ol start="0" class="object level' + level + '"></ol>');
    }
};

parser.prototype.renderArrayEnd = function (level) {
    console.log('rendering object', level);
    $('.level' + level).last().after('<span class="arrayEnd">]</span>');
};


parser.prototype.renderNewItem = function (level) {
    $('.level' + level).last().append('<li class=""></li>');
};

parser.prototype.renderContent = function (value) {
    $('li > span').last().append('<span>' + value + '</span>');
};

parser.prototype.renderSetError = function (text, elementStyle) {
    if (elementStyle) {
        $('.' + elementStyle).last().addClass('error');
        $('.' + elementStyle).last().attr('title', text);
    } else {
        $('li > span > span').last().addClass('error');
        $('li > span > span').last().attr('title', text);
    }
};
parser.prototype.renderSetType = function (type) {
    $('li > span > span').last().addClass(type);
};
parser.prototype.renderNewName = function (level) {
    $('.level' + level).last().append('<li><span class="property"></span></li>');
};
parser.prototype.renderNewValue = function () {
    $('li').last().append('<span class="value"></span>');
};
parser.prototype.renderToken = function (token) {
    $('span').last().after('<span class="token">' + token + '</span>');
};
parser.prototype.renderMissedToken = function () {

};



