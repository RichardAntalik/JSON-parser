/*global $:false, w:false, Parser:false, parser:false, viewer:false, Worker:false, ODT:false*/
var Viewer = (function () {
    "use strict";

    /**
     * @param controls {object}
     * @constructor
     */
    var Viewer = function (controls) {
        var that = this;
        this.logger = new ODT.Logger('Viewer');
        this.timeoutId = [];
        this.timers = {
            render: 1,
            showTypes: 2,
            showIndex: 3,
            unused: 4
        };
        this.controls = controls;
        this.showTypes = controls.showTypesCheckbox.prop("checked");
        this.showIndex = controls.showArrayIndexCheckbox.prop("checked");

        $(document).on('click', controls.collapseButton.selector, function () {
            that.collapseAll();
        });
        $(document).on('click', controls.expandButton.selector, function () {
            that.expandAll();
        });
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

        var worker,
            parserLogger = new ODT.Logger('Parser');

        if (Worker !== undefined) {
            if (worker === undefined) {
                try {
                    worker = new Worker("worker.js");
                } catch (err) {
                    console.error(err.message);
                    this.bindNoWorkerEvents(parserLogger);
                }
            }
            if (worker) {
                this.bindWorkerEvents(worker, parserLogger);
            }
        } else {
            this.bindNoWorkerEvents(parserLogger);
        }
    };
    /**
     * Bind functions to events with no worker support
     */
    Viewer.prototype.bindNoWorkerEvents = function (logger) {
        var that = this,
            jsonImage,
            parser = new Parser(logger);

        $(document).on('click', this.controls.prettifyButton.selector, function () {
            that.controls.inputElement.val(parser.prettify(that.controls.inputElement.val()));
        });

        $(document).on('click', this.controls.minifyButton.selector, function () {
            that.controls.inputElement.val(parser.minify(that.controls.inputElement.val()));
        });

        that.controls.inputElement.bind('input propertychange', function () {
            jsonImage = parser.parseJson(that.controls.inputElement.val());
            that.render(jsonImage, that.controls.renderOutputElement);
            that.jsonImage = jsonImage;
        });

        jsonImage = parser.parseJson(that.controls.inputElement.val());
        this.render(jsonImage, this.controls.renderOutputElement);
        this.jsonImage = jsonImage;

    };
    /**
     * Bind functions to events with worker support
     */
    Viewer.prototype.bindWorkerEvents = function (worker, logger) {
        var that = this,
            msg = {};

        $(document).on('click', this.controls.prettifyButton.selector, function () {
            msg.action = "prettify";
            msg.data = that.controls.inputElement.val();
            worker.postMessage(JSON.stringify(msg));
        });

        $(document).on('click', this.controls.minifyButton.selector, function () {
            msg.action = "minify";
            msg.data = that.controls.inputElement.val();
            worker.postMessage(JSON.stringify(msg));
        });

        that.controls.inputElement.bind('input propertychange', function () {
            msg.action = "parse";
            msg.data = that.controls.inputElement.val();
            worker.postMessage(JSON.stringify(msg));
        });

        worker.onmessage = function (event) {
            msg = JSON.parse(event.data);
            switch (msg.action) {
                case "parse":
                    that.cancelAction(that.timers.render);
                    that.render(msg.data, that.controls.renderOutputElement);
                    that.jsonImage = msg.data;

                    if (!msg.oneshot) {
                        that.progress();
                    }
                    break;
                case "minify":
                    that.controls.inputElement.val(msg.data);
                    if (!msg.oneshot) {
                        that.progress();
                    }
                    break;
                case "prettify":
                    that.controls.inputElement.val(msg.data);
                    if (!msg.oneshot) {
                        that.progress();
                    }
                    break;
                case 'log':
                    logger.debug(msg.data);
                    break;
                case 'group':
                    logger.enter(msg.data);
                    break;
                case 'groupEnd':
                    logger.exit(msg.data);
                    break;
                default:
                    that.progress(msg.action, msg.processed, msg.total);
                    break;
            }
        };

        msg.action = 'log';
        msg.data = this.logger.isEnabledLogging();
        worker.postMessage(JSON.stringify(msg));

        msg.action = "parse";
        msg.data = $('#input').val();
        worker.postMessage(JSON.stringify(msg));
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
        this.logger.debug("Progressbar:", [done, total]);
        this.progressbarAction = action;
        this.progressbar.stop(true, true);
        this.progressbar.css("display", "block");
        this.progressbar.progressbar("value", percent);
    };
    /**
     * Render jsonImage
     * @param jsonImage {object} jsonImage
     * @param rootElement {jQuery} render to this element
     * @param oneshot {boolean} do not set unless route is initialized
     * @param callback {function} done callback
     */
    Viewer.prototype.render = function (jsonImage, rootElement, oneshot, callback) {
        this.logger.enter('render');
        var that = this,
            index = 1,
            interrupt = false;
        this.controls.expandButton.attr("disabled", true);
        if (oneshot === undefined) {
            this.cancelAction(this.timers.render);
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
            callback = function () {
                return undefined;
            };
            oneshot = true;
            this.valueCount = 0;
            this.imageValueCount = this.getValueCount(jsonImage);
            this.route.push({actual: jsonImage, index: index, tag: rootElement});
            this.logger.debug('render start:', this.route[0]);
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
            this.timeoutId[this.timers.render] = setTimeout(function () {
                that.render(jsonImage, "", oneshot, callback);
            }, 5);
        } else {
            this.controls.expandButton.attr("disabled", false);
            callback();
        }
        this.logger.exit();
    };
    /**
     * Renders values of jsonImage
     * @returns {*}
     */
    Viewer.prototype.renderValues = function () {
        this.logger.enter('renderValues');
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
        this.logger.exit();
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
        this.logger.enter('createItemElement');
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
        this.logger.debug('Created', itemElement);
        this.logger.exit();
        return itemElement;
    };
    /**
     * Renders <ul> or <ol> element
     */
    Viewer.prototype.renderList = function () {
        this.logger.enter('renderList');
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
        this.logger.exit();
    };
    /**
     * Create <ul> or <ol> element
     * @param route {object}
     * @returns {jQuery}
     */
    Viewer.prototype.createListElement = function (route) {
        this.logger.enter('createListElement');
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
        this.logger.debug('Created', listElement);
        this.logger.exit();
        return listElement;
    };
    /**
     * Gets last index of Viewer.route[] routing stack
     * @returns
     * actual: reference to jsonImage (sub)object, index: number , tag: (jQuery)
     * before: reference to previous jsonImage (sub)object, indexbefore: number
     */
    Viewer.prototype.getRoute = function () {
        this.logger.enter('getRoute');
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
        this.logger.debug('Route:', route);
        this.logger.exit();
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
            this.logger.debug('isTimeToInterrupt: Interrupting!');
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
        this.logger.enter('renderError');
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
        this.logger.exit();
    };
    /**
     * Gets most top visible element and its offset from top of container defined in Viewer.controls.renderOutputElement
     * @returns {{element: (jQuery), offset: number}}
     */
    Viewer.prototype.getElementInView = function () {
        this.logger.enter('getElementInView');
        var container = this.controls.renderOutputElement,
            elements = container.find(".value"),
            offset = -666,
            index = 0;
        while (offset < -1 && index < elements.length) {
            offset = $(elements[index]).offset().top - container.offset().top;
            index++;
        }
        this.logger.debug('referencing view to:', [elements[index-1], offset]);
        this.logger.exit();
        return {element: $(elements[index-1]), offset: offset};
    };
    /**
     * Scrolls to element view.element and offsets by view.offset
     * @param container {jQuery}
     * @param view {object}
     */
    Viewer.prototype.recoverView = function (container, view) {
        this.logger.enter('recoverView');
        var offset = view.element.offset().top - container.offset().top;
        container.scrollTop(container.scrollTop() + offset - view.offset);
        this.logger.debug('restoring view to:', [view.element[0], offset] );
        this.logger.exit();
    };
    /**
     * Toogles "show" style of elements with "value" style in Viewer.controls.renderOutputElement
     * @param state {boolean} toogle on/off
     */
    Viewer.prototype.showValueTypes = function (state) {
        this.logger.enter('showValueTypes');
        var that = this,
            view = this.getElementInView(),
            container = this.controls.renderOutputElement;
        this.showTypes = state;
        this.cancelAction(this.timers.showTypes);

        this.eachElement(container.find('.value'), this.timers.showTypes, function (element, interrupt, index, total) {
            if (that.showTypes) {
                $(element).addClass("show");
            } else {
                $(element).removeClass("show");
            }
            if (index === total-1 || interrupt) {
                that.recoverView(container, view);
            }
        }, 'Showing value types...');
        this.logger.exit();
    };
    /**
     * @param state {boolean} toogle on/off
     * Toogles list-style css of <ol> elements in Viewer.controls.renderOutputElement
     */
    Viewer.prototype.showArrayIndex = function (state) {
        this.logger.enter('showArrayIndex');
        var that = this,
            container = this.controls.renderOutputElement;
        this.showIndex = state;
        this.cancelAction(this.timers.index);
        this.eachElement(container.find('ol'), this.timers.showIndex, function (element) {
            if (that.showIndex) {
                $(element).css('list-style', 'decimal');
                $(element).attr("start", "0");
            } else {
                $(element).css('list-style', 'none');
            }
        }, 'Showing array indexes...');
        this.logger.exit();
    };
    /**
     * Iterate over elements with timeouts
     * @param elements {jQuery}
     * @param timer
     * @param callback {function(index, element)}
     * @param action {string} text for progressbar
     * @param index {number=} sets by iterating - do not set!
     * @param oneshot {boolean=} sets by iterating - do not set!
     */
    Viewer.prototype.eachElement = function (elements, timer, callback, action, index, oneshot) {
        this.logger.enter('eachElement');
        var that = this,
            interrupt;

        if (!index) {
            index = 0;
            oneshot = true;
        }
        this.timestamp = new Date().getTime();
        while (index <= elements.length && !interrupt) {
            interrupt = this.isTimeToInterrupt();
            callback(elements[index], interrupt, index, elements.length);
            index++;
        }
        if (index < elements.length) {
            this.progress(action, index, elements.length);
            oneshot = false;
            this.timeoutId[action] = setTimeout(function () {
                that.eachElement(elements, timer, callback, action, index, oneshot);
            }, 1);
        } else {
            if (!oneshot) {
                this.progress();
            }
        }
        this.logger.exit();
    };
    /**
     * Collapses JSON tree
     */
    Viewer.prototype.collapseAll = function () {
        this.logger.enter('collapseAll');
        var that = this,
            elements = this.controls.renderOutputElement.find('.expanded');
        this.eachElement(elements, this.timers.unused, function (element) {
            that.toogleList($(element));
        }, 'Collapsing JSON tree...');
        this.logger.exit();
    };
    /**
     * Expands JSON tree
     */
    Viewer.prototype.expandAll = function () {
        this.logger.enter('expandAll');
        var that = this,
            elements;
        this.maxcount = this.controls.renderMaxCount;
        this.controls.renderMaxCount = Infinity;
        this.valueCount = 0;
        this.imageValueCount = 0;
        this.multiroute = [];
        elements = this.controls.renderOutputElement.find('.empty');
        elements.each(function (index, element) {
            var image = that.getRootImage($(element).parent());
            that.multiroute.push({actual: image, index: 1, tag: $(element).parent().find('.list')});
            $(element).removeClass('empty');
            that.toogleList($(element));
            that.imageValueCount += that.getValueCount(image);
        });
        this.route = this.multiroute;
        this.render('', '', true, function () {
            that.controls.renderMaxCount = that.maxcount;
            elements = that.controls.renderOutputElement.find('.collapsed:not(.empty)');
            that.eachElement(elements, that.timers.unused, function (element) {
                that.toogleList($(element));
            }, 'Expanding JSON tree...');
        });
        this.logger.exit();
    };
    /**
     * Toogles expanded/collapsed view in json tree
     * @param toogleBtnElement {jQuery}
     */
    Viewer.prototype.toogleList = function (toogleBtnElement) {
        var image;
        this.logger.enter('toogleList');
        this.logger.debug('Toogling', toogleBtnElement);
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
            image = this.getRootImage(toogleBtnElement.parent());
            this.render(image, toogleBtnElement.parent().find('.list'));
        }
        this.logger.exit();
    };
    /**
     * Gets sub-jsonImage for on-demand rendering of json tree
     * @param itemElement {jQuery}
     * @returns {jsonImage}
     */
    Viewer.prototype.getRootImage = function (itemElement) {
        this.logger.enter('getRootImage');
        var trace = [],
            image;
        //rootElement = itemElement.find('.list');
        while (itemElement.prop("tagName") === 'LI') {
            this.logger.debug('Looking up root element:', itemElement);
            trace.push(itemElement.attr('data-index'));
            itemElement = itemElement.parent().parent();
        }
        image = this.jsonImage.jsonImage;
        while (trace.length) {
            image = image[trace[trace.length - 1]].value;
            this.logger.debug('Looking up image:', [image]);
            trace.pop();
        }
        this.logger.exit();
        return image;
    };
    /**
     * Counts values that needs to be rendered if value count of jsonImage exceeds Viewer.controls.renderMaxCount
     * @param jsonImage
     * @returns {number}
     */
    Viewer.prototype.getValueCount = function (jsonImage) {
        this.logger.enter('getValueCount');
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
        this.logger.debug('Found values:', total);
        this.logger.exit();
        return total;
    };
    /**
     * Cancel running action
     * @param action {string} "render" | "showTypes" | "showIndex"
     */
    Viewer.prototype.cancelAction = function (timerId) {
        this.logger.enter('cancelAction');
        clearTimeout(this.timeoutId[timerId]);
        this.logger.debug('Cleared Timeout ID', this.timeoutId[timerId]);
        this.logger.exit();
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
}());