var Viewer = function () {
    "use strict";
    /**
     * @constructor
     */
    var Viewer = function () {

    };

    Viewer.prototype.render = function (jsonImage, renderToSelector, errorSelector, progress) {
        this.route = [];
        this.valueCount = 0;
        this.imageValueCount = jsonImage.valueCount;
        this.tag = $(renderToSelector);
        this.tag.html('');
        this.jsonImage = jsonImage.jsonImage;
        this.route.push({actual: this.jsonImage, index: 0, tag: this.tag});
        this.timestamp = new Date().getTime();

        if (!jsonImage.isValid) {
            this.renderError(jsonImage, errorSelector);
        }

        if (this.imageValueCount) {
            this.renderContent(progress);
        }
    };

    Viewer.prototype.renderContent = function (progress) {
        var that = this,
            newtag,
            value,
            name,
            route,
            interrupt;

        //Loop until this.route is completely popped.
        while (this.route.length && !interrupt) {
            this.createListElement();
            route = this.getRoute();

            //Refer to jsonImage in parser.js. modify route, so we have same conditions for arrays and objects
            //Maybe I should rather alter jsImg structure.
            if (this.typeOf(route.actual) === "object") {
                route.actual = route.actual.members;
            }

            while (route.index < route.actual.length && !interrupt) {
                newtag = $('<li />');
                route.tag.append(newtag);
                this.valueCount++;
                //If we are rendering objects we expect pairs
                if (this.typeOf(this.getRoute().actual) === "object") {
                    name = route.actual[route.index].name;
                    newtag.append('<span class="property">' + name + '</span>: ');
                    value = route.actual[route.index].value;
                } else {
                    value = route.actual[route.index];
                }
                //Save current index and make new reference to subobject and tag, where to render it
                if (this.typeOf(value) === "object" || this.typeOf(value) === "array") {
                    this.route[this.route.length - 1].index = route.index + 1;
                    this.route.push({actual: value, index: 0, tag: newtag});
                    route.index = 0;
                    break;
                }
                newtag.append('<span class="value ' + this.typeOf(value) + '">' + value || 'null' + '</span>');
                if (route.index < route.actual.length - 1) {
                    newtag.append(',');
                }
                route.index++;

                interrupt = this.isTimeToInterrupt();
            }
            if (interrupt) {
                //Looks like it's time to let browser render our elements, so save index to route
                this.route[this.route.length - 1].index = route.index;
            }
            if (route.index >= route.actual.length) {
                this.route.pop();
            }
        }
        progress("Rendering...", this.valueCount, this.imageValueCount);
        if (this.route.length) {
            setTimeout(function () {
                that.renderContent(progress);
            }, 2);
        }
    };

    Viewer.prototype.createListElement = function () {
        var type,
            emenentStrings,
            newtag,
            route;

        route = this.getRoute();
        if (route.index === 0) {
            type = this.typeOf(route.actual);
            if (type === "object") {
                emenentStrings = {open: '{', close: '}', element: '<ul />'};
            } else {
                emenentStrings = {open: '[', close: ']', element: '<ol />'};
            }
            route.tag.append('<span class="value ' + type + ' start">' + emenentStrings.open);
            route.tag.append('</span><span class="toogle expanded"></span>');
            newtag = $(emenentStrings.element);
            route.tag.append(newtag);
            route.tag.append('<span class=" ' + type + ' end">' + emenentStrings.close + '</span>');

            if (route.indexbefore < route.before.length) {
                route.tag.append(',');
            }
            this.route[this.route.length - 1].tag = newtag;
        }
    };
    /**
     *
     * @returns
     *          actual: reference to jsonImage (sub)object, index: number , tag: (jQuery|HTMLElement)
     *          before: reference to previous jsonImage (sub)object, indexbefore: number
     *
     */
    Viewer.prototype.getRoute = function () {
        var before,
            indexbefore;

        if (this.route.length >= 2) {
            before = this.route[this.route.length - 2].actual;
            indexbefore = this.route[this.route.length - 2].index;
            if (this.typeOf(before) === "object") {
                before = before.members;
            }
        } else {
            //If we are rendering 1st level of jsonImage there is no before so here are some random numbers
            indexbefore = 666;
            before = [];
        }
        return {
            actual: this.route[this.route.length - 1].actual,
            index: this.route[this.route.length - 1].index,
            tag: this.route[this.route.length - 1].tag,
            before: before,
            indexbefore: indexbefore
        };
    };

    Viewer.prototype.isTimeToInterrupt = function (force) {
        var timenow = new Date().getTime();

        if (timenow > this.timestamp + 50 || force) {
            this.timestamp = timenow;
            return true;
        }
        return false;
    };

    Viewer.prototype.renderError = function (jsonImage, errorSelector) {
        if (!jsonImage.isValid) {
            var description,
                sample;

            description = $('<span />')
            description.text(jsonImage.error.text);
            $(errorSelector).append(description);
            $(errorSelector).append('<br>');

            sample = $('<span style="white-space:pre-wrap" />');
            sample.text(jsonImage.error.sampleString[0])
            $(errorSelector).append(sample);
            sample = $('<span class="error" style="white-space:pre-wrap" />');
            sample.text(jsonImage.error.sampleString[1])
            $(errorSelector).append(sample);
            sample = $('<span style="white-space:pre-wrap" />');
            sample.text(jsonImage.error.sampleString[2])
            $(errorSelector).append(sample);
        }
    };

    Viewer.prototype.showValueTypes = function (state, progress) {
        this.index = -0;
        this.timestamp = new Date().getTime();
        this.processShowValueTypes(state, progress);
    };

    Viewer.prototype.processShowValueTypes = function (state, progress) {
        var elements = $(".value"),
            that = this;
        var i = this.index;
        while (i <= elements.length && !this.isTimeToInterrupt()) {
            if (state) {
                $(elements[i]).addClass("show");
            } else {
                $(elements[i]).removeClass("show");
            }
            i++;
        }
        this.index = i;
        if (i <= elements.length) {
            progress("Showing value types...", i, elements.length);
            setTimeout(function () {
                that.processShowValueTypes(state, progress);
            }, 2);
        }else {
            progress();
        }
    };


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

