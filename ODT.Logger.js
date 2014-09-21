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
     * @param {string} msg
     * @param {Array=} context
     */
    Logger.prototype.log = function (level, msg, context) {
        msg = this.getFormattedTime() + " " + this.name + "::" + msg;
        if (context === undefined) {
            context = [msg];
        } else {
            if (Array.isArray(context)) {
                context.unshift(msg);
            } else {
                context = [msg, context];
            }
        }
        console[level].apply(console, context);
    };

    // <editor-fold comment="shortcut functions">

    /**
     * Log a TRACE level message.
     * @param {string} msg
     * @param {Array=} context
     */
    Logger.prototype.debug = function (msg, context) {
        this.log(Logger.Level.DEBUG, msg, context);
    };

    /**
     * Log a INFO level message.
     * @param {string} msg
     * @param {Array=} context
     */
    Logger.prototype.info = function (msg, context) {
        this.log(Logger.Level.INFO, msg, context);
    };

    /**
     * Log a WARNING level message.
     * @param {string} msg
     * @param {Array=} context
     */
    Logger.prototype.warn = function (msg, context) {
        this.log(Logger.Level.WARN, msg, context);
    };

    /**
     * Log a ERROR level message.
     * @param {string} msg
     * @param {Array=} context
     */
    Logger.prototype.error = function (msg, context) {
        this.log(Logger.Level.ERROR, msg, context);
    };

    // </editor-fold>

    /**
     * Get logger styles for the level.
     * @private
     * @param {Logger.Level} level
     * @return
     */
    Logger.prototype.getStyles = function (level) {
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