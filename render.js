/*global $:false */
//TODO: still ugly code, element walker, cancelAction

var Viewer = function () {
    "use strict";
    /**
     * @constructor
     */
    var Viewer = function (controls) {
        var that = this;
        this.controls = controls;
        this.showTypes = controls.showTypesCheckbox.prop("checked");
        this.showIndex = controls.showArrayIndexCheckbox.prop("checked");
        $(document).on('click', controls.showTypesCheckbox.selector, function () {
            that.showValueTypes($(this).prop("checked"), that.progress);
        });
        $(document).on('click', controls.showArrayIndexCheckbox.selector, function () {
            that.showArrayIndex($(this).prop("checked"), that.progress);
        });
        $(document).on('click', controls.renderOutputElement.selector + ' .toogle', function (e) {
            e.preventDefault();
            that.toogleList($(this));
        });
        this.progressbar = controls.progressbarElement;
        this.progressLabel = controls.progressbarLabelElement;
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
    };

    Viewer.prototype.progress = function (action, done, total) {
        var percent;
        if (!action) {
            percent = 100;
        } else {
            percent = Math.round((done / total) * 100);
        }
        console.log(done, total);

        this.progressbarAction = action;
        this.progressbar.stop(true, true);
        this.progressbar.css("display", "block");
        this.progressbar.progressbar("value", percent);
    };

    Viewer.prototype.render = function (jsonImage, progress) {
        var maxcount = 1000;

        this.cancelAction('render');
        this.controls.renderOutputElement.html('');
        this.jsonImage = jsonImage.jsonImage;
        if (this.controls.errorOutput[0]) {
            this.controls.errorOutput.html('');
        }
        this.oneshot = true;

        this.valueCount = 0;
        this.imageValueCount = this.getValueCount(jsonImage.jsonImage, maxcount);

        this.route = [];
        this.route.push({actual: jsonImage.jsonImage, index: 0, tag: this.controls.renderOutputElement});

        if (!jsonImage.isValid) {
            this.renderError(jsonImage);
        }
        this.renderContent(progress, maxcount);
    };

    Viewer.prototype.renderContent = function (progress, maxcount) {
        var that = this,
            interrupt = false;

        this.timestamp = new Date().getTime();
        while (this.route.length && !interrupt) {
            this.renderList(maxcount);
            interrupt = this.renderValues();
        }
        if (!this.oneshot) {
            this.progress("Rendering...", this.valueCount, this.imageValueCount);
        }
        if (this.route.length) {
            this.renderTimeout = setTimeout(function () {
                that.renderContent(progress, maxcount);
            }, 5);
        }
    };


    Viewer.prototype.renderValues = function () {
        var itemElement,
            value,
            name,
            route = this.getRoute(),
            interrupt;

        while (route.index < route.actual.length && !interrupt) {
            interrupt = this.isTimeToInterrupt();
            this.valueCount++;
            if (route.type === "object") {
                name = route.actual[route.index].name;
            }
            value = route.actual[route.index].value;
            itemElement = this.createItemElement(name, value, route.index);
            route.tag.append(itemElement);
            if (this.typeOf(value) === "array") {
                this.route[this.route.length - 1].index = route.index + 1;
                this.route.push({actual: value, index: 0, tag: itemElement});
                route.index = 0;
                break;
            }
            if (route.index < route.actual.length - 1) {
                itemElement.append(',');
            }
            route.index++;
        }
        this.route[this.route.length - 1].index = route.index;
        if (route.index >= route.actual.length) {
            this.route.pop();
        }
        return interrupt;
    };
    Viewer.prototype.createItemElement = function (name, value, index) {
        var nameElement,
            valueElement,

            itemElement = $('<li data-index="' + index + '" />');

        if (name) {
            nameElement = $('<span class="property"/>');
            nameElement.text(name);
            nameElement.append(': ');
            itemElement.append(nameElement);
        }
        if (typeof value !== 'object') {
            valueElement = $('<span class="value"/>');
            valueElement.text(value);
            if (this.typeOf(value) === 'null') {
                valueElement.text(this.typeOf(value));
            }
            valueElement.addClass(this.typeOf(value));
            if (this.showTypes) {
                valueElement.addClass('show');
            }
            itemElement.append(valueElement);
        }
        return itemElement;
    };


    Viewer.prototype.renderList = function (maxcount) {
        var listElement,
            route = this.getRoute();


        if (route.index === 0) {
            this.route[this.route.length - 1].index++;

            listElement = this.createListElement(route, maxcount);
            this.route[this.route.length - 1].tag = listElement;

            if (route.indexbefore < route.before.length) {
                route.tag.append(',');
            }
            if (this.valueCount > maxcount) {
                this.route.pop();
            }

        }
    };

    Viewer.prototype.createListElement = function (route, maxcount) {
        var elementStrings,
            listElement,
            valueElement;

        if (route.type === "object") {
            elementStrings = {
                open: '{',
                close: '}',
                element: '<ul class="list" />',
                count: route.actual.length - 1
            };
        } else {
            elementStrings = {
                open: '[',
                close: ']',
                element: '<ol start="0" class="list" />',
                count: route.actual.length - 1
            };
        }
        listElement = $(elementStrings.element);
        valueElement = $('<span class="value start toogle expanded">');
        valueElement.addClass(route.type);
        valueElement.text(elementStrings.open);
        route.tag.append(valueElement);
        route.tag.append('<span class="count">(' + elementStrings.count + ')</span>');
        route.tag.append(listElement);
        route.tag.append('<span class=" ' + route.type + ' end">' + elementStrings.close + '</span>');
        if (this.showIndex && route.type === "array") {
            listElement.css('list-style', 'decimal');
        }
        if (this.showTypes) {
            valueElement.addClass('show');
        }

        if (this.valueCount > maxcount) {
            this.toogleList(valueElement);
            valueElement.addClass('empty');
        }
        return listElement;
    };

    /**
     * @returns
     *          actual: reference to jsonImage (sub)object, index: number , tag: (jQuery|HTMLElement)
     *          before: reference to previous jsonImage (sub)object, indexbefore: number
     */
    Viewer.prototype.getRoute = function () {
        var actual,
            index,
            before,
            indexbefore;

        if (this.route.length >= 2) {
            before = this.route[this.route.length - 2].actual;
            indexbefore = this.route[this.route.length - 2].index;
        } else {
            //If we are rendering 1st level of jsonImage there is no before so here are some random numbers
            indexbefore = 666;
            before = [];
        }
        actual = this.route[this.route.length - 1].actual;
        index = this.route[this.route.length - 1].index;

        return {
            type: actual[0],
            actual: actual,
            index: index,
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
        if (typeof this.controls.errorOutput === "function") {
            this.controls.errorOutput(jsonImage.error);
        } else if (this.controls.errorOutput) {
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
        }
    };

    Viewer.prototype.getElementInView = function () {
        var container = this.controls.renderOutputElement,
            elements = container.find("*"),
            offset = -666,
            index = 0;
        while (offset < -1) {
            offset = $(elements[index]).offset().top - container.offset().top;
            index++;
        }
        console.log('referencing view to:', elements[index]);
//        console.log($(elements[index]).selector);
        return {element: $(elements[index]), offset: offset};
    };
    Viewer.prototype.recoverView = function (container, view) {
        var offset = view.element.offset().top - container.offset().top;
        container.scrollTop(container.scrollTop() + offset - view.offset);
        console.log('restoring view to:', view.element[0]);

    };

    Viewer.prototype.showValueTypes = function (state, progress, index, view) {
        var container = this.controls.renderOutputElement,
            elements = container.find(".value"),
            that = this;

        if (!index) {
            index = 0;
            this.cancelAction('showTypes');
            this.oneshot = true;
            view = this.getElementInView();
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
        this.recoverView(container, view);
        if (index <= elements.length) {
            this.progress("Showing value types...", index, elements.length);
            this.typesTimeout = setTimeout(function () {
                that.showValueTypes(state, progress, index, view);
            }, 1);
        } else {
            if (!this.oneshot) {
                this.progress();
            }
            console.log('returning view to', view.element);
        }
    };

    Viewer.prototype.showArrayIndex = function (state, progress, index, view) {
        var container = this.controls.renderOutputElement,
            elements = container.find("ol"),
            that = this;
        if (!index) {
            index = 0;
            this.cancelAction('showIndex');
            this.oneshot = true;
            view = this.inView = this.getElementInView();
        }
        this.showIndex = state;
        this.timestamp = new Date().getTime();
        while (index <= elements.length && !this.isTimeToInterrupt() && !this.ca) {
            if (state) {
                $(elements[index]).css('list-style', 'decimal');
                $(elements[index]).attr("start", "0");
            } else {
                $(elements[index]).css('list-style', 'none');
            }
            index++;
        }
        this.recoverView(container, view);
        if (index <= elements.length) {
            this.progress("Showing array indexes...", index, elements.length);
            this.indexTimeout = setTimeout(function () {
                that.showArrayIndex(state, progress, index, view);
            }, 1);
        } else {
            if (!this.oneshot) {
                this.progress();
            }
        }
    };
    Viewer.prototype.toogleList = function ($toogleBtnElement) {

        if ($toogleBtnElement.hasClass("expanded")) {
            $toogleBtnElement.removeClass("expanded");
            $toogleBtnElement.addClass("collapsed");
            $toogleBtnElement.parent().find(".list").first().css("display", "none");
            $toogleBtnElement.parent().find(".count").first().css("display", "inline");
        } else {
            $toogleBtnElement.addClass("expanded");
            $toogleBtnElement.removeClass("collapsed");
            $toogleBtnElement.parent().find(".list").first().css("display", "block");
            $toogleBtnElement.parent().find(".count").first().css("display", "none");
        }
        if ($toogleBtnElement.hasClass("empty")) {
            $toogleBtnElement.removeClass('empty');
            this.renderToEmptyList($toogleBtnElement.parent());
        }
    };

    Viewer.prototype.renderToEmptyList = function ($itemElement) {
        var trace = [],
            image,
            $rootElement = $itemElement.find('.list');

        while ($itemElement.prop("tagName") === 'LI') {
            trace.push($itemElement.attr('data-index'));
            $itemElement = $itemElement.parent().parent();
        }
        image = this.jsonImage;
        while (trace.length) {
            image = image[trace[trace.length - 1]].value;
            trace.pop();
        }

        this.imageValueCount = this.getValueCount(image, 1000);
        this.route = [{actual: image, index: 1, tag: $rootElement}];
        this.oneshot = true;
        this.valueCount = 0;
        this.renderContent(this.progress, 1000);
    };

    Viewer.prototype.getValueCount = function (jsonImage, maxcount) {
        var valueCount = 0,
            i = 0,
            value,
            total = 0,
            route;
        this.route = [];
        this.route.push({actual: jsonImage, index: 1, tag: ""});

        while (this.route.length) {
            route = this.getRoute();
            i = route.index;
            while (i < route.actual.length && valueCount <= maxcount) {
                valueCount++;
                value = route.actual[i].value;
                if (this.typeOf(value) === 'array') {
                    this.route[this.route.length - 1].index = i + 1;
                    this.route.push({actual: value, index: 1, tag: ""});
                    break;
                }
                i++;
            }
            if (i >= route.actual.length || valueCount > maxcount) {
                route = this.getRoute();
                total += route.actual.length - 1;
                this.route.pop();
            }
        }
        return total;
    };

    Viewer.prototype.cancelAction = function (action) {
        var id;
        switch (action) {
            case 'render':
                id = this.renderTimeout;
                break;
            case 'showTypes':
                id = this.typesTimeout;
                break;
            case 'showIndex':
                id = this.indexTimeout;
                break;
            default :
                break;
        }
        clearTimeout(id);
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