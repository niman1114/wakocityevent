// 公式ページからイベントの説明文を取得する。
// 優先順位: meta description / og:description → 本文の段落テキスト。
// 取得できない場合は null（詳細ページでは説明文セクションを出さない）。

const MAX_LENGTH = 400;
const MIN_LENGTH = 20;
const TIMEOUT_MS = 10000;

function decodeEntities(text: string): string {
    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function cleanText(text: string): string {
    return decodeEntities(text)
        .replace(/\s+/g, ' ')
        .trim();
}

function stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, ' ');
}

function extractMeta(html: string, key: 'name' | 'property', value: string): string | null {
    // <meta name="description" content="..."> / <meta property="og:description" content="...">
    const pattern = new RegExp(
        `<meta[^>]+${key}=["']${value}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*${key}=["']${value}["']`,
        'i'
    );
    const m = html.match(pattern);
    const raw = m?.[1] ?? m?.[2];
    if (!raw) return null;
    const text = cleanText(raw);
    return text.length >= MIN_LENGTH ? text : null;
}

function extractParagraphs(html: string): string | null {
    const body = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<header[\s\S]*?<\/header>/gi, ' ')
        .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
    const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((m) => cleanText(stripTags(m[1])))
        // 定型の注意書き（JavaScript有効化・Cookie等）を文単位で除去
        .map((t) =>
            t
                .split(/(?<=。)/)
                .filter((s) => !/javascript|cookie|クッキー/i.test(s))
                .join('')
                .trim()
        )
        .filter((t) => t.length >= 30);
    if (paragraphs.length === 0) return null;
    let text = '';
    for (const p of paragraphs) {
        text += (text ? ' ' : '') + p;
        if (text.length >= 120) break;
    }
    return text.length >= MIN_LENGTH ? text : null;
}

export function parseDescription(html: string): string | null {
    const text =
        extractMeta(html, 'name', 'description') ??
        extractMeta(html, 'property', 'og:description') ??
        extractParagraphs(html);
    if (!text) return null;
    return text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) + '…' : text;
}

export interface PageDetails {
    description: string | null;
    imageUrl: string | null; // og:image / twitter:image（表示用に参照するだけ。転載はしない）
}

function extractImage(html: string, baseUrl: string): string | null {
    const raw =
        extractMeta(html, 'property', 'og:image') ??
        extractMeta(html, 'name', 'twitter:image');
    if (!raw) return null;
    try {
        return new URL(raw, baseUrl).href;
    } catch {
        return null;
    }
}

export function parsePageDetails(html: string, baseUrl: string): PageDetails {
    return {
        description: parseDescription(html),
        imageUrl: extractImage(html, baseUrl),
    };
}

export async function fetchPageDetails(url: string): Promise<PageDetails> {
    const empty: PageDetails = { description: null, imageUrl: null };
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml',
            },
            redirect: 'follow',
        });
        clearTimeout(timer);
        if (!res.ok) return empty;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) return empty;
        const html = await res.text();
        return parsePageDetails(html, res.url || url);
    } catch {
        return empty;
    }
}

export async function fetchDescription(url: string): Promise<string | null> {
    return (await fetchPageDetails(url)).description;
}

interface DescribableEvent {
    url: string;
    description?: string | null;
    imageUrl?: string | null;
}

// 全イベントに説明文を付与し、画像がないイベントには og:image で補完する（同一URLは1回だけ取得）。
// 失敗してもイベント自体は残す。
export async function enrichWithDescriptions<T extends DescribableEvent>(
    events: T[],
    concurrency = 4
): Promise<void> {
    const cache = new Map<string, Promise<PageDetails>>();
    const getDetails = (url: string) => {
        if (!cache.has(url)) cache.set(url, fetchPageDetails(url));
        return cache.get(url)!;
    };

    let index = 0;
    let done = 0;
    const workers = Array.from({ length: concurrency }, async () => {
        while (index < events.length) {
            const ev = events[index++];
            const details = await getDetails(ev.url);
            ev.description = details.description;
            if (!ev.imageUrl && details.imageUrl) ev.imageUrl = details.imageUrl;
            done++;
            if (done % 20 === 0) console.log(`Descriptions: ${done}/${events.length}`);
        }
    });
    await Promise.all(workers);
    const withDesc = events.filter((e) => e.description).length;
    const withImage = events.filter((e) => e.imageUrl).length;
    console.log(`Descriptions attached: ${withDesc}/${events.length}, images: ${withImage}/${events.length}`);
}
