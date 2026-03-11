export class TimerManager {
    private static timeouts: Set<NodeJS.Timeout> = new Set();
    private static intervals: Set<NodeJS.Timeout> = new Set();

    public static setTimeout(callback: (...args: any[]) => void, ms?: number, ...args: any[]): NodeJS.Timeout {
        const timeout = setTimeout(() => {
            this.timeouts.delete(timeout);
            callback(...args);
        }, ms);
        this.timeouts.add(timeout);
        return timeout;
    }

    public static clearTimeout(timeout: NodeJS.Timeout): void {
        clearTimeout(timeout);
        this.timeouts.delete(timeout);
    }

    public static setInterval(callback: (...args: any[]) => void, ms?: number, ...args: any[]): NodeJS.Timeout {
        const interval = setInterval(callback, ms, ...args);
        this.intervals.add(interval);
        return interval;
    }

    public static clearInterval(interval: NodeJS.Timeout): void {
        clearInterval(interval);
        this.intervals.delete(interval);
    }

    public static cleanup(): void {
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
