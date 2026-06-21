import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import ClientPage from '../ClientPage';
import { assignGenresToEvents, type Event } from '@/lib/genreMapping';

export const metadata: Metadata = {
    title: '過去のイベント',
    description: '和光市周辺で過去に開催されたイベントの記録一覧。',
    alternates: { canonical: '/past' },
};

async function getPastEvents(): Promise<Event[]> {
    const filePath = path.join(process.cwd(), 'data', 'events.json');
    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const events: Event[] = JSON.parse(fileContents);

        // Get today's date at 00:00:00
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter for past events
        const pastEvents = events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate < today;
        });

        // Sort by date descending (newest past event first)
        const sortedEvents = pastEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        // Assign genres to events
        return assignGenresToEvents(sortedEvents);
    } catch (error) {
        console.error('Error reading events file:', error);
        return [];
    }
}

export default async function PastEventsPage() {
    const events = await getPastEvents();
    return (
        <div>
            <div className="bg-amber-50 border-b border-amber-100 p-4 text-center text-amber-800 text-sm">
                過去のイベントを表示しています
            </div>
            <ClientPage events={events} />
        </div>
    );
}
