var Viewer = function () {
    "use strict";

    var Viewer = function () {
        this.html = [];
    };

    Viewer.prototype.render = function (jsonImage) {

        if (Array.isArray(jsonImage)) {
            this.renderArray(jsonImage);
        } else {
            this.renderObject(jsonImage);
        }
        console.groupEnd('Viewer');
    };

    Viewer.prototype.renderObject = function (content) {
        this.html.push('<span class="object start">{</span><span class="toogle">-</span><ul class="">');

        for (var i = 0; i < content.content.length; i++) {
            this.renderPair(content.content[i]);
        }

        this.html.push('</ul><span class="objectEnd">}</span>');
    };

    Viewer.prototype.renderArray = function (content) {
        this.html.push('<span class="array start">[</span><span class="toogle">-</span><ol class="">');

        for (var i = 0; i < content.length; i++) {
            this.html.push('<li>');
            this.renderValue(content[i]);
            this.html.push('</li>');
        }

        this.html.push('</ol><span class="arrayEnd">]</span>');
    };

    Viewer.prototype.renderPair = function (pair) {


        this.html.push('<li>');
        this.html.push('<span class="property">' + pair.name + ': </span>');

        this.renderValue(pair.value);
        this.html.push('</li>');
    };

    Viewer.prototype.renderValue = function (value) {
        if (typeof value !== "object") {
            this.html.push('<span class="value ' + typeof value + '">' + value + '</span>');
        } else if (Array.isArray(value)) {
            this.renderArray(value);
        } else if (value === null) {
            this.html.push('<span class="value null">' + value + '</span>');
        } else {
            this.renderObject(value);
        }
    };
    return Viewer;

}();
