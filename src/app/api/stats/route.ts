import { NextRequest, NextResponse } from 'next/server';
import { pushConfigured, getRedis, getSubscriptions, getSeenSlugs } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin-only stats (Bearer CRON_SECRET): subscriber count etc.
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!pushConfigured()) {
        return NextResponse.json({ error: 'push not configured' }, { status: 503 });
    }
    const redis = getRedis();
    const subs = await getSubscriptions(redis);
    const seen = await getSeenSlugs(redis);
    return NextResponse.json({
        subscribers: subs.length,
        seenEvents: seen ? seen.length : null,
        seenInitialized: seen !== null,
    });
}
