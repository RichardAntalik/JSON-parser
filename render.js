/*global $:false */
//TODO: still ugly code, obj.constructor, error callback

var Viewer = function () {
    "use strict";
    /**
     * @constructor
     */
    var Viewer = function (controls) {
        this.controls = controls;
        this.index = 0;
        this.showTypes = $(controls.showTypesCheckbox).prop("checked");
        this.showIndex = $(controls.showArrayIndexCheckbox).prop("checked");

        var that = this;
        $(document).on('click', '.toogle', function (e) {
            e.preventDefault();
            if ($(this).hasClass("expanded")) {
                $(this).removeClass("expanded");
                $(this).addClass("collapsed");
                $(this).next().css("display", "none");
            } else {
                $(this).addClass("expanded");
                $(this).removeClass("collapsed");
                $(this).next().css("display", "block");
            }
        });

        $(document).on('click', controls.showTypesCheckbox, function () {
            that.showValueTypes($(this).prop("checked"), that.progress);
        });

        $(document).on('click', controls.showArrayIndexCheckbox, function () {
            that.showArrayIndex($(this).prop("checked"), that.progress);
        });

        this.progressbar = controls.progressbarElement;
        this.progressLabel =controls.progressbarLabelElement;

        this.progressbar.progressbar({
            value: false,
            change: function () {
                that.progressLabel.text(that.progressbarAction + ' ' + that.progressbar.progressbar("value") + "%");
            },
            complete: function () {
                that.progressLabel.text("Complete!");
                that.progressbar.fadeOut(900);
            }
        });
        this.progressbar.progressbar("value", 55);
    };

    Viewer.prototype.progress = function (action, done, total) {
        var percent;
        if (!action) {
            percent = 100;
        } else {
            percent = Math.round((done / total) * 100);
        }
        this.progressbarAction = action;
        this.progressbar.stop(true, true);
        this.progressbar.css("display", "block");
        this.progressbar.progressbar("value", percent);
    };

    Viewer.prototype.render = function (jsonImage, progress) {
        this.controls.renderOutputElement.html('');
        this.controls.errorOutput.html('');
        this.valueCount = 0;
        this.imageValueCount = jsonImage.valueCount;
        this.oneshot = true;
        this.route = [];
        if (!jsonImage.isValid) {
            this.renderError(jsonImage);
        }
        this.route.push({actual: jsonImage.jsonImage, index: 0, tag: this.controls.renderOutputElement});
        this.renderContent(progress);
    };

    Viewer.prototype.renderContent = function (progress) {
        var that = this,
            route,
            interrupt;

        this.timestamp = new Date().getTime();
        while (this.route.length && !interrupt) {
            this.createListElement();
            route = this.getRoute();
            //Refer to jsonImage in parser.js. modify route, so we have same conditions for arrays and objects
            //Maybe I should rather alter jsImg structure.
            route.actual = route.actual.members || route.actual;
            interrupt = this.renderValues(route);
        }

        if (!this.oneshot) {
            this.progress("Rendering...", this.valueCount, this.imageValueCount);
        }
        if (this.route.length) {
            setTimeout(function () {
                that.renderContent(progress);
            }, 2);
        }
    };

    Viewer.prototype.renderValues = function (route) {
        var itemElement,
            nameElement,
            valueElement,
            value,
            name,
            interrupt;
        while (route.index < route.actual.length && !interrupt) {
            //If we are rendering objects we expect pairs
            itemElement = $('<li />');
            if (this.typeOf(this.getRoute().actual) === "object") {
                name = route.actual[route.index].name;
                value = route.actual[route.index].value;
                nameElement = $('<span class="property"/>');
                nameElement.text(name);
                nameElement.append(': ');
                itemElement.append(nameElement);

            } else {
                value = route.actual[route.index];
            }

            valueElement = $('<span class="value"/>');
            valueElement.text(value);
            if (this.typeOf(value) === 'null') {
                valueElement.text(this.typeOf(value));
            }
            valueElement.addClass(this.typeOf(value));
            if (this.showTypes) {
                valueElement.addClass('show');
            }
            route.tag.append(itemElement);

            this.valueCount++;
            //Save current index and make new reference to subobject and tag, where to render it
            if (this.typeOf(value) === "object" || this.typeOf(value) === "array") {
                this.route[this.route.length - 1].index = route.index + 1;
                this.route.push({actual: value, index: 0, tag: itemElement});
                route.index = 0;
                break;
            }

            itemElement.append(valueElement);
            if (route.index < route.actual.length - 1) {
                itemElement.append(',');
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
        return interrupt;
    };

    Viewer.prototype.createListElement = function () {
        var type,
            elementStrings,
            listElement,
            valueElement,
            route;

        route = this.getRoute();
        if (route.index === 0) {
            type = this.typeOf(route.actual);
            if (type === "object") {
                elementStrings = {open: '{', close: '}', element: '<ul />'};
            } else {
                elementStrings = {open: '[', close: ']', element: '<ol />'};
            }
            listElement = $(elementStrings.element);
            if (this.showIndex && type === "array") {
                listElement.css('list-style', 'decimal');
                listElement.attr("start", "0");
            }
            valueElement = $('<span class="value start">');
            valueElement.addClass(type);
            valueElement.text(elementStrings.open);
            if (this.showTypes) {
                valueElement.addClass('show');
            }
            route.tag.append(valueElement);
            route.tag.append('<span class="toogle expanded"></span>');
            route.tag.append(listElement);
            route.tag.append('<span class=" ' + type + ' end">' + elementStrings.close + '</span>');
            if (route.indexbefore < route.before.length) {
                route.tag.append(',');
            }
            this.route[this.route.length - 1].tag = listElement;
        }
    };

    /**
     * @returns
     *          actual: reference to jsonImage (sub)object, index: number , tag: (jQuery|HTMLElement)
     *          before: reference to previous jsonImage (sub)object, indexbefore: number
     */
    Viewer.prototype.getRoute = function () {
        var before,
            indexbefore;

        if (this.route.length >= 2) {
            before = this.route[this.route.length - 2].actual;
            indexbefore = this.route[this.route.length - 2].index;
            before = before.members || before;
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
        var timenow = new Date().getTime(),
            time;

        if (this.oneshot) {
            time = 50;
        } else {
            time = 50;
        }

        if (timenow > this.timestamp + time || force) {
            this.timestamp = timenow;
            this.oneshot = false;
            return true;
        }
        return false;
    };

    Viewer.prototype.renderError = function (jsonImage) {
        var description,
            sample;
        description = $('<span />');
        description.text(jsonImage.error.text);
        this.controls.errorOutput.append(description);
        this.controls.errorOutput.append('<br>');

        sample = $('<span style="white-space:pre-wrap" />');
        sample.text(jsonImage.error.sampleString[0]);
        this.controls.errorOutput.append(sample);
        sample = $('<span class="error" style="white-space:pre-wrap" />');
        sample.text(jsonImage.error.sampleString[1]);
        this.controls.errorOutput.append(sample);
        sample = $('<span style="white-space:pre-wrap" />');
        sample.text(jsonImage.error.sampleString[2]);
        this.controls.errorOutput.append(sample);
    };

    Viewer.prototype.showValueTypes = function (state, progress, index) {
        var elements = $("#output .value"),
            that = this;
        if (!index) {
            this.oneshot = true;
            index = 0;
        }
        this.showTypes = state;
        this.timestamp = new Date().getTime();
        while (index <= elements.length && !this.isTimeToInterrupt()) {
            if (state) {
                $(elements[index]).addClass("show");
            } else {
                $(elements[index]).removeClass("show");
            }
            index++;
        }
        if (index <= elements.length) {
            this.progress("Showing value types...", index, elements.length);
            setTimeout(function () {
                that.showValueTypes(state, progress, index);
            }, 1);
        } else {
            if (!this.oneshot) {
                this.progress();
            }
        }
    };

    Viewer.prototype.showArrayIndex = function (state, progress, index) {
        var elements = $("#output ol"),
            that = this;
        if (!index) {
            index = 0;
            this.oneshot = true;
        }
        this.showIndex = state;
        this.timestamp = new Date().getTime();
        while (index <= elements.length && !this.isTimeToInterrupt()) {
            if (state) {
                $(elements[index]).css('list-style', 'decimal');
                $(elements[index]).attr("start", "0");
            } else {
                $(elements[index]).css('list-style', 'none');
            }
            index++;
        }

        if (index <= elements.length) {
            this.progress("Showing array indexes...", index, elements.length);
            setTimeout(function () {
                that.showArrayIndex(state, progress, index);
            }, 1);
        } else {
            if (!this.oneshot) {
                this.progress();
            }
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
            return 'null';
        }
        return "object";
    };
    return Viewer;
}();
