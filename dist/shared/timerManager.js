export class TimerManager {
    static timeouts = new Set();
    static intervals = new Set();
    static setTimeout(callback, ms, ...args) {
        const timeout = setTimeout(() => {
            this.timeouts.delete(timeout);
            callback(...args);
        }, ms);
        this.timeouts.add(timeout);
        return timeout;
    }
    static clearTimeout(timeout) {
        clearTimeout(timeout);
        this.timeouts.delete(timeout);
    }
    static setInterval(callback, ms, ...args) {
        const interval = setInterval(callback, ms, ...args);
        this.intervals.add(interval);
        return interval;
    }
    static clearInterval(interval) {
        clearInterval(interval);
        this.intervals.delete(interval);
    }
    static cleanup() {
        for (const timeout of this.timeouts) {
            clearTimeout(timeout);
        }
        this.timeouts.clear();
        for (const interval of this.intervals) {
            clearInterval(interval);
        }
        this.intervals.clear();
    }
}
//# sourceMappingURL=timerManager.js.map