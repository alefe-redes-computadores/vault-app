"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSentry = void 0;
var Sentry = require("@sentry/nextjs");
var react_1 = require("react");
function useSentry() {
    var captureException = (0, react_1.useCallback)(function (error, context) {
        console.error('Erro capturado:', error);
        Sentry.captureException(error, {
            extra: context,
        });
    }, []);
    var captureMessage = (0, react_1.useCallback)(function (message, level) {
        if (level === void 0) { level = 'info'; }
        console.log("[".concat(level, "]"), message);
        Sentry.captureMessage(message, level);
    }, []);
    var setUser = (0, react_1.useCallback)(function (user) {
        Sentry.setUser(user);
    }, []);
    return {
        captureException: captureException,
        captureMessage: captureMessage,
        setUser: setUser,
    };
}
exports.useSentry = useSentry;
