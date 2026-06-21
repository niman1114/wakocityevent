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

const SITE_URL = 'https://wakocityevent.vercel.app';

function buildJsonLd(events: Event[]) {
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '和光市のイベント情報',
    url: SITE_URL,
    inLanguage: 'ja',
    description: '和光市周辺の最新イベント情報を毎日自動更新でまとめたポータルサイト。',
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '和光市の今後のイベント',
    itemListElement: events.slice(0, 50).map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: e.title,
        startDate: e.date,
        url: e.url,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        ...(e.imageUrl ? { image: e.imageUrl } : {}),
        location: {
          '@type': 'Place',
          name: e.source || '和光市',
          address: {
            '@type': 'PostalAddress',
            addressLocality: '和光市',
            addressRegion: '埼玉県',
            addressCountry: 'JP',
          },
        },
        organizer: { '@type': 'Organization', name: e.source || '和光市' },
      },
    })),
  };

  return [website, itemList];
}

export default async function Home() {
  const events = await getEvents();
  const jsonLd = buildJsonLd(events);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ClientPage
        events={events}
        intro={
          <div className="text-gray-600 leading-relaxed text-sm sm:text-base space-y-2">
            <p>
              <strong className="text-gray-900">和光市</strong>とその周辺で開催されるイベント情報を、複数の公式サイトから毎日自動で収集してまとめています。
            </p>
            <p>
              和光市駅前の<strong className="font-medium">マルシェ</strong>、サンアゼリアの<strong className="font-medium">コンサート</strong>、和光樹林公園の<strong className="font-medium">屋外イベント</strong>、図書館・公民館の<strong className="font-medium">講座・教室</strong>、<strong className="font-medium">子育て</strong>イベントや<strong className="font-medium">お祭り</strong>まで、ジャンル別・日付順でまとめてチェックできます。
            </p>
          </div>
        }
      />
    </>
  );
}
