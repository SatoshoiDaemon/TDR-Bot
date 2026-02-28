/**
 * Converte strings de tempo humano (1d, 12h, 30m, 10s) para milissegundos
 */
export function parseHumanTime(timeStr) {
    const regex = /^(\d+)([dhms])$/;
    const match = timeStr.toLowerCase().match(regex);
    if (!match)
        return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
        case 's': return value * 1000;
        default: return 0;
    }
}
/**
 * Converte milissegundos para uma string legível
 */
export function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const parts = [];
    if (days > 0)
        parts.push(`${days}d`);
    if (hours > 0)
        parts.push(`${hours}h`);
    if (minutes > 0)
        parts.push(`${minutes}m`);
    if (seconds > 0)
        parts.push(`${seconds}s`);
    return parts.join(' ') || '0s';
}
//# sourceMappingURL=timeUtils.js.map