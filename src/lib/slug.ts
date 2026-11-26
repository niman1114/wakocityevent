import type { Event } from './genreMapping';

// FNV-1a 32bit hash (pure JS, works on both server and client)
function fnv1a(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

// Stable per-event slug: YYYY-MM-DD-<hash of official url>
export function eventSlug(event: Pick<Event, 'date' | 'url'>): string {
    const date = event.date.replace(/\//g, '-');
    return `${date}-${fnv1a(event.url)}`;
}
