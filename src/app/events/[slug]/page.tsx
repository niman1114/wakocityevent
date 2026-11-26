import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllEvents, getEventBySlug, eventSlug, validImageUrl } from '@/lib/events';
import { getGenreIcon, type Event } from '@/lib/genreMapping';

const SITE_URL = 'https://wakocityevent.vercel.app';

export function generateStaticParams() {
    return getAllEvents().map((event) => ({ slug: eventSlug(event) }));
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });
}

function buildDescription(event: Event): string {
    const parts = [
        `${formatDate(event.date)}に和光市周辺で開催されるイベント「${event.title}」の情報です。`,
        event.genre ? `ジャンル: ${event.genre}。` : '',
        event.source ? `情報提供: ${event.source}。` : '',
        '和光市のイベント情報ポータルが毎日自動更新でお届けします。',
    ];
    return parts.join('');
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const event = getEventBySlug(slug);
    if (!event) return {};
    const description = buildDescription(event);
    return {
        title: event.title,
        description,
        alternates: { canonical: `/events/${slug}` },
        openGraph: {
            title: event.title,
            description,
            url: `${SITE_URL}/events/${slug}`,
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: event.title,
            description,
        },
    };
}

function buildJsonLd(event: Event, slug: string) {
    const image = validImageUrl(event.imageUrl);
    return {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        startDate: event.date.replace(/\//g, '-'),
        url: event.url,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        ...(image ? { image } : {}),
        location: {
            '@type': 'Place',
            name: event.source || '和光市',
            address: {
                '@type': 'PostalAddress',
                addressLocality: '和光市',
                addressRegion: '埼玉県',
                addressCountry: 'JP',
            },
        },
        organizer: { '@type': 'Organization', name: event.source || '和光市' },
        mainEntityOfPage: `${SITE_URL}/events/${slug}`,
    };
}

export default async function EventDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const event = getEventBySlug(slug);
    if (!event) notFound();

    const image = validImageUrl(event.imageUrl);
    const jsonLd = buildJsonLd(event, slug);

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 h-20 flex items-center">
                    <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900">
                        和光市のイベント情報
                    </Link>
                </div>
            </header>

            <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                <p className="text-sm text-gray-500 mb-6">
                    <Link href="/" className="hover:text-gray-900 underline underline-offset-4">
                        イベント一覧に戻る
                    </Link>
                </p>

                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {formatDate(event.date)}
                </p>
                <h1 className="text-3xl font-bold leading-snug text-gray-900 mb-6">
                    {event.title}
                </h1>

                {image ? (
                    <img
                        src={image}
                        alt={event.title}
                        className="w-full rounded-2xl mb-8 object-cover"
                    />
                ) : (
                    <div className="w-full aspect-[16/9] rounded-2xl mb-8 flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-emerald-50">
                        <span className="text-6xl opacity-50">{getGenreIcon(event.genre || 'その他')}</span>
                    </div>
                )}

                <dl className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 mb-8">
                    <div>
                        <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">開催日</dt>
                        <dd className="text-base text-gray-900">{formatDate(event.date)}</dd>
                    </div>
                    {event.genre && (
                        <div>
                            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">ジャンル</dt>
                            <dd className="text-base text-gray-900">
                                {getGenreIcon(event.genre)} {event.genre}
                            </dd>
                        </div>
                    )}
                    {event.categories.length > 0 && (
                        <div>
                            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">カテゴリ</dt>
                            <dd className="flex flex-wrap gap-1">
                                {event.categories.map((category, index) => (
                                    <span
                                        key={index}
                                        className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded"
                                    >
                                        {category}
                                    </span>
                                ))}
                            </dd>
                        </div>
                    )}
                    {event.source && (
                        <div>
                            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">情報提供</dt>
                            <dd className="text-base text-gray-900">{event.source}</dd>
                        </div>
                    )}
                </dl>

                <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-gray-900 text-white font-semibold py-4 rounded-full hover:bg-gray-700 transition-colors"
                >
                    公式サイトで詳細を見る
                </a>
                <p className="text-xs text-gray-400 text-center mt-3">
                    申し込み方法・会場・料金などの最新情報は公式サイトでご確認ください。
                </p>
            </article>

            <footer className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 text-center">
                <p className="text-gray-400 text-xs tracking-wider">
                    データ提供元: 和光市公式 / サンアゼリア / 和光市商工会 / 和光樹林公園 / 和光市図書館 / わぴあ / 号外NET 朝霞・和光 / 和光子育てネットワーク
                </p>
            </footer>
        </main>
    );
}
