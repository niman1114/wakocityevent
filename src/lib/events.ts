import fs from 'fs';
import path from 'path';
import { assignGenresToEvents, type Event } from './genreMapping';
import { eventSlug } from './slug';

export { eventSlug };

// Load all events (past and future) from data/events.json, with genres assigned.
export function getAllEvents(): Event[] {
    const filePath = path.join(process.cwd(), 'data', 'events.json');
    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const events: Event[] = JSON.parse(fileContents);
        return assignGenresToEvents(events);
    } catch (error) {
        console.error('Error reading events file:', error);
        return [];
    }
}

export function getEventBySlug(slug: string): Event | undefined {
    return getAllEvents().find((event) => eventSlug(event) === slug);
}

// Only treat real http(s) URLs as images (data may contain null).
export function validImageUrl(imageUrl?: string | null): string | null {
    if (imageUrl && /^https?:\/\//.test(imageUrl)) return imageUrl;
    return null;
}
