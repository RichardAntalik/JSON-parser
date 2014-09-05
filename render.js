var Viewer = function () {
    "use strict";
    /**
     * @constructor
     * Viewer.html [array] contains rendered content of jsonImage
     */
    var Viewer = function () {
        this.html = [];
    };

    /**
     * Start rendering jsonImage
     * @param jsonImage object in form {members: {[name:name, value:vlaue],...]} or an array
     */
    Viewer.prototype.render = function (jsonImage) {

        if (Array.isArray(jsonImage)) {
            this.renderArray(jsonImage);
        } else if (typeof jsonImage === 'object') {
            this.renderObject(jsonImage);
        }
    };
    /**
     * Render object content
     * @param jsonImage object in form {members: {[name:name, value:vlaue],...]}
     */
    Viewer.prototype.renderObject = function (jsonImage) {
        this.html.push('<span class="object start">{</span><span class="toogle">-</span><ul class="">');

        var length = jsonImage.members.length;
        for (var i = 0; i < length; i++) {
            this.renderPair(jsonImage.members[i], i, length);
        }

        this.html.push('</ul><span class="objectEnd">}</span>');
    };
    /**
     * Render array content
     * @param jsonImage array
     */
    Viewer.prototype.renderArray = function (jsonImage) {
        this.html.push('<span class="array start">[</span><span class="toogle">-</span><ol class="">');

        var length = jsonImage.length;
        for (var i = 0; i < length; i++) {
            this.html.push('<li>');
            this.renderValue(jsonImage[i], i, length);
            this.html.push('</li>');
        }

        this.html.push('</ol><span class="arrayEnd">]</span>');
    };
    /**
     * Render Pair
     * @param pair {name:name, value:value}
     * @param index index of pair
     * @param length number of pairs
     */
    Viewer.prototype.renderPair = function (pair, index, length) {

        this.html.push('<li>');
        this.html.push('<span class="property">' + pair.name + ': </span>');

        this.renderValue(pair.value);

        if (index < length - 1) {
            this.html.push(',');
        }
        this.html.push('</li>');
    };
    /**
     * Render value
     * @param value can be null, boolean, number, string or jsonImage
     * @param index index of value
     * @param length number of values
     */
    Viewer.prototype.renderValue = function (value, index, length) {
        if (typeof value !== "object") {
            this.html.push('<span class="value ' + typeof value + '">' + value + '</span>');
        } else if (Array.isArray(value)) {
            this.renderArray(value);
        } else if (value === null) {
            this.html.push('<span class="value null">' + value + '</span>');
        } else {
            this.renderObject(value);
        }
        if (index < length - 1) {
            this.html.push(',');
        }
    };

    return Viewer;
}();
