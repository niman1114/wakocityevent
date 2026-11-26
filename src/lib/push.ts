import { Redis } from '@upstash/redis';
import { setVapidDetails, sendNotification } from 'web-push';

// Server-side Web Push helpers. All secrets come from environment variables:
// - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (subscription storage)
// - NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT

const SUBS_KEY = 'wako:push-subscriptions';
const SEEN_KEY = 'wako:seen-event-slugs';

export interface StoredSubscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}

// Vercel KV (Upstash) auto-creates KV_REST_API_*; a direct Upstash integration
// creates UPSTASH_REDIS_REST_*. Accept either naming.
function redisUrl(): string | undefined {
    return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
}

function redisToken(): string | undefined {
    return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
}

export function pushConfigured(): boolean {
    return Boolean(
        redisUrl() &&
            redisToken() &&
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
            process.env.VAPID_PRIVATE_KEY
    );
}

export function getRedis(): Redis {
    return new Redis({
        url: redisUrl()!,
        token: redisToken()!,
    });
}

function ensureVapid() {
    setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@wakocityevent.vercel.app',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
    );
}

export async function getSubscriptions(redis: Redis): Promise<StoredSubscription[]> {
    const all = await redis.hgetall<Record<string, StoredSubscription>>(SUBS_KEY);
    if (!all) return [];
    return Object.values(all).filter(
        (s) => s && typeof s.endpoint === 'string' && s.keys?.p256dh && s.keys?.auth
    );
}

export async function saveSubscription(redis: Redis, sub: StoredSubscription): Promise<void> {
    // Field = endpoint (unique per browser/device), value = subscription JSON
    await redis.hset(SUBS_KEY, { [sub.endpoint]: sub });
}

export async function removeSubscription(redis: Redis, endpoint: string): Promise<void> {
    await redis.hdel(SUBS_KEY, endpoint);
}

export async function getSeenSlugs(redis: Redis): Promise<string[] | null> {
    const seen = await redis.get<string[]>(SEEN_KEY);
    return Array.isArray(seen) ? seen : null;
}

export async function setSeenSlugs(redis: Redis, slugs: string[]): Promise<void> {
    await redis.set(SEEN_KEY, slugs);
}

export interface PushPayload {
    title: string;
    body: string;
    url: string;
}

// Send one notification to every subscriber. Expired subscriptions (404/410) are removed.
export async function sendToAll(
    redis: Redis,
    payload: PushPayload
): Promise<{ sent: number; removed: number }> {
    ensureVapid();
    const subs = await getSubscriptions(redis);
    let sent = 0;
    let removed = 0;
    const body = JSON.stringify(payload);
    await Promise.all(
        subs.map(async (sub) => {
            try {
                await sendNotification(sub, body);
                sent++;
            } catch (err: unknown) {
                const status = (err as { statusCode?: number })?.statusCode;
                if (status === 404 || status === 410) {
                    await removeSubscription(redis, sub.endpoint);
                    removed++;
                } else {
                    console.error('Push send failed:', status, err);
                }
            }
        })
    );
    return { sent, removed };
}
