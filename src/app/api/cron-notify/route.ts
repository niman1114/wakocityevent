import { NextRequest, NextResponse } from 'next/server';
import {
    pushConfigured,
    getRedis,
    getSeenSlugs,
    setSeenSlugs,
    sendToAll,
} from '@/lib/push';
import { eventSlug } from '@/lib/slug';
import type { Event } from '@/lib/genreMapping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EVENTS_URL =
    'https://raw.githubusercontent.com/niman1114/wakocityevent/main/data/events.json';

// Daily job (Vercel Cron): compare the latest events.json with the slugs seen
// last time, and send ONE summary push for newly added upcoming events.
// First run only initializes the seen set (no notification), so existing
// subscribers are not flooded with the whole catalogue.
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.get('authorization');
        if (auth !== `Bearer ${secret}`) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
    }
    if (!pushConfigured()) {
        return NextResponse.json({ error: 'push not configured' }, { status: 503 });
    }

    const res = await fetch(EVENTS_URL, { cache: 'no-store' });
    if (!res.ok) {
        return NextResponse.json({ error: 'events fetch failed' }, { status: 502 });
    }
    const events: Event[] = await res.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = events.filter((e) => new Date(e.date) >= today);
    const slugs = upcoming.map((e) => eventSlug(e));

    const redis = getRedis();
    const seen = await getSeenSlugs(redis);

    if (seen === null) {
        await setSeenSlugs(redis, slugs);
        return NextResponse.json({ ok: true, initialized: true, count: slugs.length });
    }

    const seenSet = new Set(seen);
    const newEvents = upcoming.filter((e) => !seenSet.has(eventSlug(e)));

    // Keep the seen set current either way (drops past events automatically)
    await setSeenSlugs(redis, slugs);

    if (newEvents.length === 0) {
        return NextResponse.json({ ok: true, newEvents: 0 });
    }

    const first = newEvents[0];
    const body =
        newEvents.length === 1
            ? `${first.date.replace(/-/g, '/')} ${first.title}`
            : `${first.date.replace(/-/g, '/')} ${first.title} ほか${newEvents.length - 1}件`;

    const result = await sendToAll(redis, {
        title: `新着イベントが${newEvents.length}件あります`,
        body,
        url: newEvents.length === 1 ? `/events/${eventSlug(first)}` : '/',
    });

    return NextResponse.json({ ok: true, newEvents: newEvents.length, ...result });
}
