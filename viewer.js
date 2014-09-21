/*global $:false, w:false, Parser:false, parser:false, viewer:false, Worker:false */
//TODO: element walker, find fn

var Viewer = function () {
    "use strict";
    /**
     * @constructor
     *
     */
    var Viewer = function (controls) {

        var that = this;
        this.controls = controls;
        this.showTypes = controls.showTypesCheckbox.prop("checked");
        this.showIndex = controls.showArrayIndexCheckbox.prop("checked");

        $(document).on('click', controls.showTypesCheckbox.selector, function () {
            that.showValueTypes($(this).prop("checked"));
        });
        $(document).on('click', controls.showArrayIndexCheckbox.selector, function () {
            that.showArrayIndex($(this).prop("checked"));
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
        this.startWorker();
    };
    /**
     * Initialize worker if available
     */
    Viewer.prototype.startWorker = function () {

        if (typeof Worker !== "undefined") {
            if (typeof w === "undefined") {
                try {
                    w = new Worker("worker.js");
                } catch (err) {
                    console.error(err.message);
                    this.bindNoWorkerEvents();
                }
            }
            if (w) {
                this.bindWorkerEvents();
            }
        } else {
            this.bindNoWorkerEvents();
        }
    };
    /**
     * Bind functions to events without worker support
     */
    Viewer.prototype.bindNoWorkerEvents = function () {
        var that = this;
        parser = new Parser({enableLogs: this.controls.enableLogs});

        $(document).on('click', this.controls.prettifyButton.selector, function () {
            that.controls.inputElement.val(parser.prettify(that.controls.inputElement.val()));
        });

        $(document).on('click', this.controls.minifyButton.selector, function () {
            that.controls.inputElement.val(parser.minify(that.controls.inputElement.val()));
        });

        that.controls.inputElement.bind('input propertychange', function () {
            var jsonImage = parser.parseJson(that.controls.inputElement.val());
            that.render(jsonImage, that.controls.renderOutputElement);
            that.jsonImage = jsonImage;
        });

        var jsonImage = parser.parseJson(that.controls.inputElement.val());
        this.render(jsonImage, this.controls.renderOutputElement);
        this.jsonImage = jsonImage;

    };
    /**
     * Bind functions to events with worker support
     */
    Viewer.prototype.bindWorkerEvents = function () {
        var that = this,
            msg = {};

        $(document).on('click', this.controls.prettifyButton.selector, function () {
            var msg = {};
            msg.action = "prettify";
            msg.data = that.controls.inputElement.val();
            w.postMessage(JSON.stringify(msg));
        });

        $(document).on('click', this.controls.minifyButton.selector, function () {
            var msg = {};
            msg.action = "minify";
            msg.data = that.controls.inputElement.val();
            w.postMessage(JSON.stringify(msg));
        });

        that.controls.inputElement.bind('input propertychange', function () {
            var msg = {};
            msg.action = "parse";
            msg.data = that.controls.inputElement.val();
            w.postMessage(JSON.stringify(msg));
        });

        w.onmessage = function (event) {
            msg = JSON.parse(event.data);
            switch (msg.action) {
                case "parse":
                    that.cancelAction('render');
                    that.render(msg.data, that.controls.renderOutputElement);
                    that.jsonImage = msg.data;

                    if (!msg.oneshot) {
                        viewer.progress();
                    }
                    break;
                case "minify":
                    that.controls.inputElement.val(msg.data);
                    if (!msg.oneshot) {
                        viewer.progress();
                    }
                    break;
                case "prettify":
                    that.controls.inputElement.val(msg.data);
                    if (!msg.oneshot) {
                        viewer.progress();
                    }
                    break;
                case 'log':
                    parserLogger.debug(msg.data);
                    break;
                case 'group':
                    parserLogger.enter(msg.data);
                    break;
                case 'groupEnd':
                    parserLogger.exit(msg.data);
                    break;
                default:
                    viewer.progress(msg.action, msg.processed, msg.total);
                    break;
            }
        };

        msg.action = "log";
        msg.data = this.controls.enableLogs;
        w.postMessage(JSON.stringify(msg));

        msg.action = "parse";
        msg.data = $('#input').val();
        w.postMessage(JSON.stringify(msg));
    };
    /**
     * Progress handler
     * @param action {string}
     * @param done {number}
     * @param total {number}
     */
    Viewer.prototype.progress = function (action, done, total) {
        var percent;
        if (!action) {
            percent = 100;
        } else {
            percent = Math.round((done / total) * 100);
        }
        viewerLogger.debug("Progressbar:", [done, total]);

        this.progressbarAction = action;
        this.progressbar.stop(true, true);
        this.progressbar.css("display", "block");
        this.progressbar.progressbar("value", percent);
    };
    /**
     * Render jsonImage
     * @param jsonImage {object} jsonImage
     * @param rootElement {jQuery} render to this element
     * @param oneshot {boolean} do not set! when unset, function initialize variables for first run
     */
    Viewer.prototype.render = function (jsonImage, rootElement, oneshot) {
        viewerLogger.enter('render');

        var that = this,
            index = 1,
            interrupt = false;
        if (typeof oneshot === "undefined") {
            this.cancelAction('render');
            this.route = [];

            if (this.typeOf(jsonImage) === 'object') {
                this.controls.renderOutputElement.html('');
                if (this.controls.errorOutput[0]) {
                    this.controls.errorOutput.html('');
                }
                if (!jsonImage.isValid) {
                    this.renderError(jsonImage);
                }
                jsonImage = jsonImage.jsonImage;
                index = 0;
            }
            oneshot = true;
            this.valueCount = 0;
            this.imageValueCount = this.getValueCount(jsonImage);
            this.route.push({actual: jsonImage, index: index, tag: rootElement});
            viewerLogger.debug('render start:', this.route[0]);
        }

        this.timestamp = new Date().getTime();

        while (this.route.length && !interrupt) {
            this.renderList();
            interrupt = this.renderValues();
        }

        if (!oneshot) {
            this.progress("Rendering...", this.valueCount, this.imageValueCount);
        }
        if (this.route.length) {
            oneshot = false;
            this.renderTimeout = setTimeout(function () {
                that.render(jsonImage, "", oneshot);
            }, 5);
        }
        viewerLogger.exit();
    };
    /**
     * Renders values of jsonImage
     * @returns {*}
     */
    Viewer.prototype.renderValues = function () {
        viewerLogger.enter('renderValues');
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
        viewerLogger.exit();
        return interrupt;
    };
    /**
     * Creates <li> element
     * @param name {string}
     * @param value {*}
     * @param index {number} position in jsonImage. HTML attribute data-index will contain this value
     * @returns {jQuery}
     */
    Viewer.prototype.createItemElement = function (name, value, index) {
        viewerLogger.enter('createItemElement');
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
        viewerLogger.debug('Created', itemElement);
        viewerLogger.exit();
        return itemElement;
    };
    /**
     * Renders <ul> or <ol> element
     */
    Viewer.prototype.renderList = function () {
        viewerLogger.enter('renderList');
        var listElement,
            route = this.getRoute();


        if (route.index === 0) {
            this.route[this.route.length - 1].index++;

            listElement = this.createListElement(route);
            this.route[this.route.length - 1].tag = listElement;

            if (route.indexbefore < route.before.length) {
                route.tag.append(',');
            }
            if (this.valueCount > this.controls.renderMaxCount) {
                this.route.pop();
            }
        }
        viewerLogger.exit();
    };
    /**
     * Create <ul> or <ol> element
     * @param route {object}
     * @returns {jQuery}
     */
    Viewer.prototype.createListElement = function (route) {
        viewerLogger.enter('createListElement');
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
        route.tag.append('<span class="count">' + elementStrings.count + '</span>');
        route.tag.append(listElement);
        route.tag.append('<span class=" ' + route.type + ' end">' + elementStrings.close + '</span>');
        if (this.showIndex && route.type === "array") {
            listElement.css('list-style', 'decimal');
        }
        if (this.showTypes) {
            valueElement.addClass('show');
        }

        if (this.valueCount > this.controls.renderMaxCount) {
            this.toogleList(valueElement);
            valueElement.addClass('empty');
        }
        viewerLogger.debug('Created', listElement);
        viewerLogger.exit();
        return listElement;
    };
    /**
     * Gets last index of Viewer.route[] routing stack
     * @returns
     * actual: reference to jsonImage (sub)object, index: number , tag: (jQuery)
     * before: reference to previous jsonImage (sub)object, indexbefore: number
     */
    Viewer.prototype.getRoute = function () {
        viewerLogger.enter('getRoute');
        var actual,
            index,
            before,
            indexbefore,
            route;

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
        route = {
            type: actual[0],
            actual: actual,
            index: index,
            tag: this.route[this.route.length - 1].tag,
            before: before,
            indexbefore: indexbefore
        };

        viewerLogger.debug('Route:', route);
        viewerLogger.exit();
        return route;
    };
    /**
     * When function that needs to be interrupted after some time starts, it must set Viewer.timestamp to value provided
     * by Date().getTime() function. If value in timestamp variable differs by defined value returns true. otherwise
     * returns false.
     * @param force {boolean} use to force interrupt
     * @returns {boolean}
     */
    Viewer.prototype.isTimeToInterrupt = function (force) {
        var timenow = new Date().getTime(),
            time = 50;

        if (timenow > this.timestamp + time || force) {
            viewerLogger.debug('isTimeToInterrupt: Interrupting!');
            this.timestamp = timenow;
            return true;
        }
        return false;
    };
    /**
     * Renders error messages to HTML element or calls a function defined in Viewer.controls.errorOutput
     * @param jsonImage {object}
     */
    Viewer.prototype.renderError = function (jsonImage) {
        viewerLogger.enter('renderError');
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
        viewerLogger.exit();
    };
    /**
     * Gets most top visible element and its offset from top of container defined in Viewer.controls.renderOutputElement
     * @returns {{element: (jQuery), offset: number}}
     */
    Viewer.prototype.getElementInView = function () {
        viewerLogger.enter('getElementInView');
        var container = this.controls.renderOutputElement,
            elements = container.find("*"),
            offset = -666,
            index = 0;
        while (offset < -1) {
            offset = $(elements[index]).offset().top - container.offset().top;
            index++;
        }
        viewerLogger.debug('referencing view to:', elements[index]);
        viewerLogger.exit();
//        viewerLogger.debug($(elements[index]).selector);
        return {element: $(elements[index]), offset: offset};
    };
    /**
     * Scrolls to element view.element and offsets by view.offset
     * @param container {jQuery}
     * @param view {object}
     */
    Viewer.prototype.recoverView = function (container, view) {
        viewerLogger.enter('recoverView');
        var offset = view.element.offset().top - container.offset().top;
        container.scrollTop(container.scrollTop() + offset - view.offset);
        viewerLogger.debug('restoring view to:', view.element[0]);
        viewerLogger.exit();
    };
    /**
     * toogles "show" style of elements with "value" style in Viewer.controls.renderOutputElement
     * @param state {boolean} toogle on/off
     * @param index {number} do not set!
     * @param view {object} do not set!
     * @param oneshot do not set!
     */
    Viewer.prototype.showValueTypes = function (state, index, view, oneshot) {
        viewerLogger.enter('showValueTypes');
        var container = this.controls.renderOutputElement,
            elements = container.find(".value"),
            that = this;

        if (!index) {
            this.cancelAction('showTypes');
            index = 0;
            oneshot = true;
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
                that.showValueTypes(state, index, view, oneshot);
            }, 1);
        } else {
            if (!oneshot) {
                this.progress();
            }
        }
        viewerLogger.exit();
    };
    /**
     * toogles list-style css of <ol> elements in Viewer.controls.renderOutputElement
     * @param state {boolean} toogle on/off
     * @param index {number} do not set!
     * @param view {object} do not set!
     * @param oneshot do not set!
     */
    Viewer.prototype.showArrayIndex = function (state, index, view, oneshot) {
        viewerLogger.enter('showArrayIndex');
        var container = this.controls.renderOutputElement,
            elements = container.find("ol"),
            that = this;
        if (!index) {
            this.cancelAction('showIndex');
            index = 0;
            oneshot = true;
            view = this.getElementInView();
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
        this.recoverView(container, view);
        if (index <= elements.length) {
            this.progress("Showing array indexes...", index, elements.length);
            this.indexTimeout = setTimeout(function () {
                that.showArrayIndex(state, index, view, oneshot);
            }, 1);
        } else {
            if (!oneshot) {
                this.progress();
            }
        }
        viewerLogger.exit();
    };
    /**
     * Toogles expanded/collapsed view in json tree
     * @param toogleBtnElement {jQuery}
     */
    Viewer.prototype.toogleList = function (toogleBtnElement) {
        viewerLogger.enter('toogleList');
        viewerLogger.debug('Toogling', toogleBtnElement);
        if (toogleBtnElement.hasClass("expanded")) {
            toogleBtnElement.removeClass("expanded");
            toogleBtnElement.addClass("collapsed");
            toogleBtnElement.parent().find(".list").first().css("display", "none");
            toogleBtnElement.parent().find(".count").first().css("display", "inline");
        } else {
            toogleBtnElement.addClass("expanded");
            toogleBtnElement.removeClass("collapsed");
            toogleBtnElement.parent().find(".list").first().css("display", "block");
            toogleBtnElement.parent().find(".count").first().css("display", "none");
        }
        if (toogleBtnElement.hasClass("empty")) {
            toogleBtnElement.removeClass('empty');
            this.renderToEmptyList(toogleBtnElement.parent());
        }
        viewerLogger.exit();
    };
    /**
     * On-demand rendering of json tree
     * @param itemElement {jQuery}
     */
    Viewer.prototype.renderToEmptyList = function (itemElement) {
        viewerLogger.enter('renderToEmptyList');
        var trace = [],
            image,
            rootElement = itemElement.find('.list');
        while (itemElement.prop("tagName") === 'LI') {
            viewerLogger.debug('Looking up root:', itemElement);
            trace.push(itemElement.attr('data-index'));
            itemElement = itemElement.parent().parent();
        }
        image = this.jsonImage.jsonImage;
        while (trace.length) {
            image = image[trace[trace.length - 1]].value;
            viewerLogger.debug('Looking up image:', [image]);
            trace.pop();
        }
        this.render(image, rootElement);
        viewerLogger.exit();
    };
    /**
     * Counts values that needs to be rendered if value count of jsonImage exceeds Viewer.controls.renderMaxCount
     * @param jsonImage
     * @returns {number}
     */
    Viewer.prototype.getValueCount = function (jsonImage) {
        viewerLogger.enter('getValueCount');
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
            while (i < route.actual.length && valueCount <= this.controls.renderMaxCount) {
                valueCount++;
                value = route.actual[i].value;
                if (this.typeOf(value) === 'array') {
                    this.route[this.route.length - 1].index = i + 1;
                    this.route.push({actual: value, index: 1, tag: ""});
                    break;
                }
                i++;
            }
            if (i >= route.actual.length || valueCount > this.controls.renderMaxCount) {
                route = this.getRoute();
                total += route.actual.length - 1;
                this.route.pop();
            }
        }
        viewerLogger.debug('Found values:', total);
        viewerLogger.exit();
        return total;
    };
    /**
     * Cancel running action
     * @param action {string} "render" | "showTypes" | "showIndex"
     */
    Viewer.prototype.cancelAction = function (action) {
        viewerLogger.enter('cancelAction');
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
        viewerLogger.debug('Cleared Timeout ID', id);
        viewerLogger.exit();
    };
    /**
     * Gets type of variable
     * @param value
     * @returns {string} "array" for arrays "null" for null
     */
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