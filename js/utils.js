// utils.js - 通用工具函数
export function debounce(func, wait, options = {}) {
    let timeoutId = null;
    let lastArgs = null;
    let lastThis = null;
    let maxWait = options.maxWait;
    let lastCallTime = 0;
    let lastInvokeTime = 0;

    function invokeFunc() {
        const args = lastArgs;
        const thisArg = lastThis;
        lastArgs = lastThis = null;
        lastInvokeTime = Date.now();
        return func.apply(thisArg, args);
    }

    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        return (lastCallTime === 0) ||
               (timeSinceLastCall >= wait) ||
               (maxWait !== undefined && timeSinceLastInvoke >= maxWait);
    }

    function trailingEdge() {
        timeoutId = null;
        if (lastArgs) {
            return invokeFunc();
        }
        lastArgs = lastThis = null;
        return null;
    }

    function cancel() {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        lastArgs = lastThis = null;
        lastCallTime = lastInvokeTime = 0;
    }

    function flush() {
        return timeoutId === null ? null : trailingEdge();
    }

    function debounced(...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);
        lastArgs = args;
        lastThis = this;
        lastCallTime = time;

        if (isInvoking) {
            if (timeoutId === null) {
                return invokeFunc();
            }
            if (maxWait !== undefined) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(trailingEdge, wait);
                return invokeFunc();
            }
        }
        if (timeoutId === null) {
            timeoutId = setTimeout(trailingEdge, wait);
        }
        return undefined;
    }

    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
}

export function delay(ms) {
    if (typeof ms !== 'number' || ms < 0) {
        throw new Error('Delay time must be a positive number');
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function InvB(v) {
    if (typeof v !== 'number' || v < -128 || v > 127) {
        throw new Error('Input must be an 8-bit signed integer (-128 to 127)');
    }
    return v < 0 ? v + 256 : v;
}

export function doubleByte2Short(byteH, byteL) {
    if (!Number.isInteger(byteH) || !Number.isInteger(byteL) ||
        byteH < 0 || byteH > 255 || byteL < 0 || byteL > 255) {
        throw new Error('Bytes must be integers between 0 and 255');
    }
    return (byteH << 8) | byteL;
}
