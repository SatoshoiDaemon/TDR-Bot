export declare class TimerManager {
    private static timeouts;
    private static intervals;
    static setTimeout(callback: (...args: any[]) => void, ms?: number, ...args: any[]): NodeJS.Timeout;
    static clearTimeout(timeout: NodeJS.Timeout): void;
    static setInterval(callback: (...args: any[]) => void, ms?: number, ...args: any[]): NodeJS.Timeout;
    static clearInterval(interval: NodeJS.Timeout): void;
    static cleanup(): void;
}
