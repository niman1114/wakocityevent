import fs from 'fs';
import path from 'path';
import ClientPage from './ClientPage';
import { assignGenresToEvents, type Event } from '@/lib/genreMapping';

async function getEvents(): Promise<Event[]> {
  const filePath = path.join(process.cwd(), 'data', 'events.json');
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const events: Event[] = JSON.parse(fileContents);

    // Get today's date at 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter out past events
    const futureEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= today;
    });

    // Sort by date
    const sortedEvents = futureEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Assign genres to events
    return assignGenresToEvents(sortedEvents);
  } catch (error) {
    console.error('Error reading events file:', error);
    return [];
  }
}

export default async function Home() {
  const events = await getEvents();
  return <ClientPage events={events} />;
}
