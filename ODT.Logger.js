/*globals console, ODT*/
/*jslint browser:true, white: true, vars: true */

var ODT = ODT || {};
ODT.Logger = (function () {
    "use strict";

    /**
     * Dummy Logger for when used when console is not available or logging is disabled.
     * @constructor
     */
    var DummyLogger = function (name) {
    };
    DummyLogger.prototype.enter = function (msg, context, groupCollapsed) {
    };
    DummyLogger.prototype.exit = function (context) {
    };
    DummyLogger.prototype.log = function (level, msg, context) {
    };
    DummyLogger.prototype.debug = function (msg, context) {
    };
    DummyLogger.prototype.info = function (msg, context) {
    };
    DummyLogger.prototype.warn = function (msg, context) {
    };
    DummyLogger.prototype.error = function (msg, context) {
    };
    DummyLogger.prototype.isEnabledLogging = function () {
        return false;
    };

    /**
     * @constructor
     * @param {string} name
     */
    var Logger = function (name) {
        /** @type {string} */
        this.name = name;
    };

    /**
     * Log levels.
     * @enum {string}
     */
    Logger.Level = {
        DEBUG: 'debug',
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error'
    };

    /**
     * Method called when entering a function.
     * @param {string} msg Name of the function prepended before all following calls.
     * @param {Array=} context
     * @param {boolean=} groupCollapsed
     */
    Logger.prototype.enter = function (msg, context, groupCollapsed) {
        msg = this.getFormattedTime() + " " + this.name + "::" + msg;
        groupCollapsed = groupCollapsed !== undefined ? groupCollapsed : false;
        var method = groupCollapsed ? 'groupCollapsed' : 'group';

        if (context) {
            if (Array.isArray(context)) {
                context.unshift(msg);
            } else {
                context = [msg, context];
            }

            console[method].apply(console, context);
        } else {
            console[method](msg);
        }
    };

    /**
     * Method called when exiting a function.
     * @param {*=} context
     */
    Logger.prototype.exit = function (context) {
        if (context === undefined) {
            this.info('(-)');
        } else {
            this.info('(-)', [context]);
        }
        console.groupEnd();
    };

    /**
     * Logs a message.
     * @param {Logger.Level} level
     * @param {*} args arguments
     */
    Logger.prototype.log = function (level, args) {
        var i,
            msg = args[0],
            context = [];
        for (i = 1; i < args.length; i++) {
            context.push(args[i]);
        }
        msg = this.getFormattedTime() + " " + this.name + "::" + ( msg || ' ');
        context.unshift(msg);
        console[level].apply(console, context);
    };

    // <editor-fold comment="shortcut functions">

    /**
     * Log a TRACE level message.
     @param {...*} message
     */
    Logger.prototype.debug = function (message) {
        this.log(Logger.Level.DEBUG, arguments);
    };

    /**
     @param {...*} message
     */
    Logger.prototype.info = function (message) {
        this.log(Logger.Level.INFO, arguments);
    };

    /**
     * Log a WARNING level message.
     @param {...*} message
     */
    Logger.prototype.warn = function (message) {
        this.log(Logger.Level.WARN, arguments);
    };

    /**
     * Log a ERROR level message.
     @param {...*} message
     */
    Logger.prototype.error = function (message) {
        this.log(Logger.Level.ERROR, arguments);
    };

    // </editor-fold>

    /**
     * Get logger styles for the level.
     * @private
     * @param {Logger.Level} level
     * @return
     */
    Logger.prototype.getStyles = function () {
    };

    /**
     * Get current time in format HH:mm:ss (e.g. 13:11:53)
     * @private
     * @returns {string}
     */
    Logger.prototype.getFormattedTime = function () {
        var currentDate = new Date();
        var minutes = (currentDate.getMinutes() < 10 ? "0" : "") + currentDate.getMinutes();
        var seconds = (currentDate.getSeconds() < 10 ? "0" : "") + currentDate.getSeconds();
        //noinspection UnnecessaryLocalVariableJS
        var formattedTime = currentDate.getHours() + ":" + minutes + ":" + seconds;
        return formattedTime;
    };

    Logger.prototype.isEnabledLogging = function () {
        return true;
    };

    // disable logging if console is not available
    var isEnabledLogging = (console !== undefined && console.log !== undefined && console.group !== undefined && console.groupCollapsed !== undefined && console.groupEnd !== undefined);

    if ($('body').hasClass('env-prod')) {
        if (isEnabledLogging) {
            console.log('ODT.initialize(): Disabling logging.');
        }
        isEnabledLogging = false;
    }

    return isEnabledLogging ? Logger : DummyLogger;
}());