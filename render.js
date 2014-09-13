

var Viewer = function () {
    "use strict";
    /**
     * @constructor
     */
    var Viewer = function(){

    };

    Viewer.prototype.render = function (jsonImage, renderToSelector, errorSelector, progress) {
        this.route = [];
        this.valueCount = 0;
        this.imageValueCount = jsonImage.valueCount;
        this.tag = $(renderToSelector);
        this.tag.html('');
        this.jsonImage = jsonImage.jsonImage;
        this.route.push({actual: this.jsonImage, index: 0, tag: this.tag});

        if (!jsonImage.isValid) {
            this.renderError(jsonImage, errorSelector);
        }

        if (this.imageValueCount) {
            this.renderContent(progress);
        }
    };

    Viewer.prototype.renderContent = function (progress) {
        var that = this,
            actual,
            before,
            index,
            indexbefore,
            tag,
            newtag,
            value,
            name,
            i = 0,
            maxcount = 300;

        while (i < maxcount && this.route.length) {
            actual = this.route[this.route.length - 1].actual;
            index = this.route[this.route.length - 1].index;
            tag = this.route[this.route.length - 1].tag;

            if (this.route.length === 2) {
                before = this.route[this.route.length - 2].actual;
                indexbefore = this.route[this.route.length - 2].index;
                if (this.typeOf(before) === "object") {
                    before = before.members;
                }
            } else {
                indexbefore = 666;
                before = [];
            }


            if (index === 0) {
                if (this.typeOf(actual) === "object") {
                    tag.append('<span class="value object start">{</span><span class="toogle expanded"></span>');
                    newtag = $('<ul />');
                    tag.append(newtag);
                    tag.append('<span class=" object end">}</span>');
                    if (indexbefore < before.length) {
                        tag.append(',');
                    }
                    tag = this.route[this.route.length - 1].tag = newtag;
                } else {
                    tag.append('<span class="value array start">[</span><span class="toogle expanded"></span>');
                    newtag = $('<ol />');
                    tag.append(newtag);
                    tag.append('<span class=" array end">]</span>');

                    if (indexbefore < before.length - 1) {
                        tag.append(',');
                    }
                    tag = this.route[this.route.length - 1].tag = newtag;
                }
            }

            if (actual && this.typeOf(actual) === "object") {
                while (index < actual.members.length && i < maxcount) {
                    newtag = $('<li />');
                    tag.append(newtag);
                    this.valueCount++;

                    name = actual.members[index].name;
                    newtag.append('<span class="property">' + name + '</span>: ');

                    value = actual.members[index].value;
                    if (this.typeOf(value) === "object" || this.typeOf(value) === "array") {
                        this.route[this.route.length - 1].index = index + 1;
                        this.route.push({actual: value, index: 0, tag: newtag});
                        index = 0;
                        break;
                    }
                    newtag.append('<span class="value ' + this.typeOf(value) + '">' + value || 'null' + '</span>');
                    if (index < actual.members.length - 1) {
                        newtag.append(',');
                    }

                    index++;

                    i++;
                }
                if (index >= actual.members.length) {
                    this.route.pop();
                } else {
                    this.route[this.route.length - 1].index = index;
                }

            }
            if (actual && this.typeOf(actual) === "array") {
                while (index < actual.length && i < maxcount) {
                    newtag = $('<li />');
                    tag.append(newtag);
                    this.valueCount++;
                    value = actual[index];
                    if (this.typeOf(value) === "object" || this.typeOf(value) === "array") {
                        this.route[this.route.length - 1].index = index + 1;
                        this.route.push({actual: value, index: 0, tag: newtag});
                        index = 0;
                        break;
                    }
                    newtag.append('<span class="value ' + this.typeOf(value) + '">' + value || 'null' + '</span>');
                    if (index < actual.length - 1) {
                        newtag.append(',');
                    }
                    index++;

                    i++;
                }
                if (index >= actual.length) {
                    this.route.pop();
                }
                else {
                    this.route[this.route.length - 1].index = index;
                }
            }
            i++;
        }
        progress("Rendering...", this.imageValueCount, this.valueCount);
        if (this.route.length) {
            setTimeout(function () {
                that.renderContent(progress);
            }, 20);
        }
    };

    Viewer.prototype.renderError = function (jsonImage, errorSelector) {
        if (!jsonImage.isValid) {
            $(errorSelector).append(jsonImage.error.text);
            $(errorSelector).append('<br><span style="white-space:pre-wrap">');
            $(errorSelector).append(
                jsonImage.error.sampleString[0] +
                '<span class="error">' +
                jsonImage.error.sampleString[1] +
                '</span>' +
                jsonImage.error.sampleString[2]
            );
        }
    }


    Viewer.prototype.typeOf = function (value) {
        if (typeof value !== "object") {
            return typeof value;
        }
        if (Array.isArray(value)) {
            return "array";
        }
        if (value === null) {
            return null;
        }
        return "object";
    };
    return Viewer;
}
();

