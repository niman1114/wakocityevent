import { NextRequest, NextResponse } from 'next/server';
import {
    pushConfigured,
    getRedis,
    saveSubscription,
    removeSubscription,
    type StoredSubscription,
} from '@/lib/push';

export const runtime = 'nodejs';

function isValidSubscription(value: unknown): value is StoredSubscription {
    if (typeof value !== 'object' || value === null) return false;
    const sub = value as Record<string, unknown>;
    if (typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://')) return false;
    const keys = sub.keys as Record<string, unknown> | undefined;
    if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return false;
    return true;
}

export async function POST(req: NextRequest) {
    if (!pushConfigured()) {
        return NextResponse.json({ error: 'push not configured' }, { status: 503 });
    }
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400 });
    }
    if (!isValidSubscription(body)) {
        return NextResponse.json({ error: 'invalid subscription' }, { status: 400 });
    }
    const redis = getRedis();
    await saveSubscription(redis, {
        endpoint: body.endpoint,
        keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
    if (!pushConfigured()) {
        return NextResponse.json({ error: 'push not configured' }, { status: 503 });
    }
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400 });
    }
    const endpoint = (body as Record<string, unknown>)?.endpoint;
    if (typeof endpoint !== 'string') {
        return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
    }
    const redis = getRedis();
    await removeSubscription(redis, endpoint);
    return NextResponse.json({ ok: true });
}
