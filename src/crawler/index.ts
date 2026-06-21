import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://www.city.wako.lg.jp';
const START_URL = 'https://www.city.wako.lg.jp/event_calendar.html';
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'events.json');

interface Event {
    title: string;
    url: string;
    date: string; // YYYY-MM-DD
    categories: string[];
    source: string;
    imageUrl?: string | null;
}

async function crawl() {
    console.log('Starting crawler...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        const allEvents: Event[] = [];

        // --- 和光市公式 イベントカレンダー ---
        try {
        await page.goto(START_URL);
        console.log(`Navigated to ${START_URL}`);

        // Crawl 3 months
        for (let i = 0; i < 3; i++) {
            // Wait for table to be visible
            await page.waitForSelector('#calendar_table');

            // Get current year and month from caption
            const caption = await page.textContent('#calendar_table caption');
            console.log(`Processing: ${caption}`);

            if (!caption) continue;

            const ymMatch = caption.match(/(\d+)年(\d+)月/);
            if (!ymMatch) {
                console.error('Could not parse year/month from caption');
                continue;
            }

            const year = parseInt(ymMatch[1]);
            const month = parseInt(ymMatch[2]);

            // Get all rows
            const rows = await page.$$('tr');

            for (const row of rows) {
                // Skip hidden rows or template rows
                const isVisible = await row.isVisible();
                if (!isVisible) continue;

                const dayElem = await row.$('th .em');
                if (!dayElem) continue;

                const dayText = await dayElem.textContent();
                if (!dayText) continue;
                const day = parseInt(dayText);

                const listItems = await row.$$('td ul li');

                for (const li of listItems) {
                    const linkElem = await li.$('a');
                    if (!linkElem) continue;

                    const title = await linkElem.textContent();
                    const href = await linkElem.getAttribute('href');

                    if (!title || !href) continue;

                    const categories: string[] = [];
                    const catSpans = await li.$$('span.ecate');
                    for (const span of catSpans) {
                        const catText = await span.textContent();
                        if (catText) categories.push(catText);
                    }

                    // Format date YYYY-MM-DD
                    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

                    allEvents.push({
                        title: title.trim(),
                        url: href.startsWith('http') ? href : BASE_URL + href,
                        date: dateStr,
                        categories: categories,
                        source: '和光市公式'
                    });
                }
            }

            // Go to next month if not the last iteration
            if (i < 2) {
                console.log('Clicking next month...');
                await page.click('.draw_next_calendar');
                // Wait for caption to change or a short delay
                // Simple wait for now, better to wait for specific change
                await page.waitForTimeout(2000);
            }
        }

        console.log(`Found ${allEvents.length} events from Wako City.`);
        } catch (e) {
            console.error('Error crawling Wako City calendar:', e);
        }

        // --- Crawl Sun Azalea ---
        console.log('Starting Sun Azalea crawler...');
        try {
            await page.goto('https://www.sunazalea.or.jp/event/');
            console.log('Navigated to Sun Azalea event page');

            // Wait for content
            await page.waitForSelector('ul.index li.record');

            const azaleaEvents = await page.$$eval('ul.index li.record', (elements) => {
                return elements.map(el => {
                    const linkElem = el.querySelector('a');
                    if (!linkElem) return null;

                    const titleElem = el.querySelector('p.ttl .ttl_txt');
                    const title = titleElem ? titleElem.textContent?.trim() : '';

                    const dateAttr = el.getAttribute('data-date'); // Format: YYYYMMDD
                    let dateStr = '';
                    if (dateAttr && dateAttr.length === 8) {
                        dateStr = `${dateAttr.substring(0, 4)}-${dateAttr.substring(4, 6)}-${dateAttr.substring(6, 8)}`;
                    }

                    const hallElem = el.querySelector('p.hall .event_hall');
                    const hall = hallElem ? hallElem.textContent?.trim() : '';

                    const imgElem = el.querySelector('p.flyer img');
                    const imgUrl = imgElem ? imgElem.getAttribute('src') : null;

                    const href = linkElem.getAttribute('href');

                    if (!title || !dateStr || !href) return null;

                    return {
                        title: title,
                        url: href,
                        date: dateStr,
                        categories: hall ? [hall] : [],
                        source: 'サンアゼリア',
                        imageUrl: imgUrl
                    };
                }).filter(e => e !== null);
            });

            console.log(`Found ${azaleaEvents.length} events from Sun Azalea.`);
            allEvents.push(...azaleaEvents);

        } catch (error) {
            console.error('Error crawling Sun Azalea:', error);
        }

        // --- 和光市商工会 (Chamber of Commerce) ---
        try {
            console.log('Crawling Wako City Chamber of Commerce...');
            await page.goto('http://www.wako-sci.or.jp/', { waitUntil: 'domcontentloaded' });

            const sciEvents = await page.evaluate(() => {
                const events: any[] = [];
                // The first box4 usually contains Topics
                const topicsBox = document.querySelector('.box4');
                if (!topicsBox) return events;

                const items = topicsBox.querySelectorAll('ul li');
                items.forEach(item => {
                    const text = item.textContent?.trim() || '';
                    // Format: YYYY/MM/DD　Title
                    const match = text.match(/^(\d{4}\/\d{1,2}\/\d{1,2})[\s　]+(.+)$/);
                    const linkElem = item.querySelector('a');
                    const href = linkElem ? linkElem.getAttribute('href') : null;

                    if (match && href) {
                        const dateStr = match[1]; // YYYY/MM/DD
                        const title = match[2];

                        // Convert date to YYYY年M月D日 format to match others if needed, 
                        // or keep as is. The current UI handles strings.
                        // Let's normalize to YYYY年M月D日 for consistency if possible, 
                        // but the current EventCard just displays the string.
                        // Let's keep it simple for now.

                        events.push({
                            title: title,
                            url: href,
                            date: dateStr,
                            categories: ['商工会'],
                            source: '和光市商工会',
                            imageUrl: null // No image in the list
                        });
                    }
                });
                return events;
            });
            allEvents.push(...sciEvents);
        } catch (e) {
            console.error('Error crawling Chamber of Commerce:', e);
        }

        // --- Wa-Kosodate 25th Anniversary ---
        try {
            console.log('Crawling Wa-Kosodate 25th Anniversary...');
            const targetUrl = 'https://wa-kosodate.com/25syuunen';
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

            // Since the page is unstructured, we'll extract the full text and use regex
            const content = await page.textContent('body');
            if (content) {
                // Regex to find date like "12月14日"
                // Looking for patterns like "12月14日日曜日" or similar
                const dateMatch = content.match(/(\d{1,2})月(\d{1,2})日/);

                // Regex to find title - assuming it's near the top or a specific phrase
                // Based on inspection: "クリスマスこどもフェス" seems to be the title
                // Let's look for "クリスマスこどもフェス" specifically or try to grab the first significant text
                // For now, let's hardcode the title extraction if we find the specific event, 
                // or try to be more generic if possible. 
                // Given the user request is specifically for this link which seems to be a single event page:

                let title = "クリスマスこどもフェス"; // Default/Fallback
                if (content.includes("クリスマスこどもフェス")) {
                    title = "クリスマスこどもフェス";
                } else {
                    // Fallback: try to get the first h1 or h2
                    const h1 = await page.textContent('h1');
                    if (h1) title = h1.trim();
                }

                if (dateMatch) {
                    const month = dateMatch[1].padStart(2, '0');
                    const day = dateMatch[2].padStart(2, '0');
                    const currentYear = new Date().getFullYear();

                    const dateStr = `${currentYear}-${month}-${day}`;

                    // Extract image
                    let imageUrl: string | null = null;
                    const images = await page.$$eval('img', imgs => imgs.map(img => img.getAttribute('src')));
                    const userImage = images.find(src => src && src.includes('userData') && src.includes('original.jpg'));
                    if (userImage) {
                        imageUrl = userImage.startsWith('//') ? `https:${userImage}` : userImage;
                    }

                    allEvents.push({
                        title: title,
                        url: targetUrl,
                        date: dateStr,
                        categories: ['子育て', 'イベント'],
                        source: '和光子育てネットワーク',
                        imageUrl: imageUrl
                    });
                    console.log(`Found event: ${title} on ${dateStr} with image: ${imageUrl}`);
                }
            }

        } catch (e) {
            console.error('Error crawling Wa-Kosodate:', e);
        }

        // --- 和光樹林公園 (Wako Jurin Park / Seibu Green) ---
        try {
            console.log('Crawling Wako Jurin Park...');
            await page.goto('https://www.seibu-green.co.jp/wako-jurin/event/', { waitUntil: 'domcontentloaded' });

            const jurinEvents = await page.evaluate(() => {
                const events: any[] = [];
                const now = new Date();
                const currentYear = now.getFullYear();
                const seen = new Set<string>();

                const anchors = Array.from(document.querySelectorAll('a[href*="/wako-jurin/event/"]'));
                anchors.forEach((a) => {
                    const rawHref = a.getAttribute('href') || '';
                    // 詳細ページ (/event/数字.html) のみ対象。ナビの /event/ は除外
                    if (!/\/wako-jurin\/event\/\d+\.html/.test(rawHref)) return;

                    const title = (a.textContent || '').trim();
                    if (!title) return;

                    const container = a.closest('li') || a.closest('article') || a.parentElement;
                    const text = container ? (container.textContent || '') : '';

                    // 「開催日：7月25日」のような表記から月日を取得
                    const m = text.match(/(\d{1,2})月(\d{1,2})日/);
                    if (!m) return;
                    const month = m[1].padStart(2, '0');
                    const day = m[2].padStart(2, '0');

                    // 年の推定: 当年で組んで60日以上過去なら翌年扱い
                    let year = currentYear;
                    let d = new Date(`${year}-${month}-${day}T00:00:00`);
                    if (d.getTime() < now.getTime() - 60 * 24 * 3600 * 1000) {
                        year = currentYear + 1;
                    }
                    const dateStr = `${year}-${month}-${day}`;

                    const fullUrl = rawHref.startsWith('http') ? rawHref : 'https://www.seibu-green.co.jp' + rawHref;
                    if (seen.has(fullUrl)) return;
                    seen.add(fullUrl);

                    const img = container ? container.querySelector('img') : null;
                    let imageUrl: string | null = img ? img.getAttribute('src') : null;
                    if (imageUrl && imageUrl.startsWith('/')) imageUrl = 'https://www.seibu-green.co.jp' + imageUrl;

                    events.push({
                        title,
                        url: fullUrl,
                        date: dateStr,
                        categories: ['公園', '屋外'],
                        source: '和光樹林公園',
                        imageUrl
                    });
                });
                return events;
            });

            console.log(`Found ${jurinEvents.length} events from Wako Jurin Park.`);
            allEvents.push(...jurinEvents);
        } catch (e) {
            console.error('Error crawling Wako Jurin Park:', e);
        }

        // --- 和光市図書館 (Wako City Library) ---
        try {
            console.log('Crawling Wako City Library...');
            await page.goto('https://www.wakolib.jp/eventnews/', { waitUntil: 'domcontentloaded' });

            const libEvents = await page.evaluate(() => {
                const events: any[] = [];
                const now = new Date();
                const currentYear = now.getFullYear();
                const seen = new Set<string>();

                // カテゴリ/ナビのリンク（除外対象）
                const excludeText = new Set(['本館', '分館', '本館・分館', 'おとな', 'こども', 'おやこ', '次の20件', 'イベント']);
                const excludeFile = new Set(['honkan.html', 'bunkan.html', 'otona.html', 'kodomo.html', 'family.html']);

                const anchors = Array.from(document.querySelectorAll('a[href*="/eventnews/"]'));
                anchors.forEach((a) => {
                    const rawHref = a.getAttribute('href') || '';
                    // /eventnews/xxx.html の記事ページのみ
                    const fileMatch = rawHref.match(/\/eventnews\/([^/]+\.html)$/);
                    if (!fileMatch) return;
                    if (excludeFile.has(fileMatch[1])) return;

                    const title = (a.textContent || '').trim();
                    if (!title || excludeText.has(title) || title.length < 5) return;

                    const container = a.closest('li') || a.closest('dd') || a.closest('article') || a.parentElement;
                    const text = container ? (container.textContent || '') : title;

                    // 日付の優先順位: タイトル/本文中の「M/D」or「M月D日」→ 掲載日「YYYY年M月D日」
                    let year = currentYear;
                    let month = '';
                    let day = '';

                    const slash = title.match(/(\d{1,2})\/(\d{1,2})/) || text.match(/(\d{1,2})\/(\d{1,2})/);
                    const jp = title.match(/(\d{1,2})月(\d{1,2})日/) || text.match(/(\d{1,2})月(\d{1,2})日/);
                    const posted = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);

                    if (slash) {
                        month = slash[1].padStart(2, '0');
                        day = slash[2].padStart(2, '0');
                        let d = new Date(`${year}-${month}-${day}T00:00:00`);
                        if (d.getTime() < now.getTime() - 60 * 24 * 3600 * 1000) year = currentYear + 1;
                    } else if (jp) {
                        month = jp[1].padStart(2, '0');
                        day = jp[2].padStart(2, '0');
                        let d = new Date(`${year}-${month}-${day}T00:00:00`);
                        if (d.getTime() < now.getTime() - 60 * 24 * 3600 * 1000) year = currentYear + 1;
                    } else if (posted) {
                        year = parseInt(posted[1]);
                        month = posted[2].padStart(2, '0');
                        day = posted[3].padStart(2, '0');
                    } else {
                        return;
                    }

                    const dateStr = `${year}-${month}-${day}`;
                    const fullUrl = rawHref.startsWith('http') ? rawHref : 'https://www.wakolib.jp' + rawHref;
                    if (seen.has(fullUrl)) return;
                    seen.add(fullUrl);

                    events.push({
                        title,
                        url: fullUrl,
                        date: dateStr,
                        categories: ['図書館'],
                        source: '和光市図書館',
                        imageUrl: null
                    });
                });
                return events;
            });

            console.log(`Found ${libEvents.length} events from Wako City Library.`);
            allEvents.push(...libEvents);
        } catch (e) {
            console.error('Error crawling Wako City Library:', e);
        }

        // --- 号外NET 朝霞・和光 (地域ニュース / 駅前・突発イベントの受け皿) ---
        try {
            console.log('Crawling Goguynet (Asaka-Wako)...');
            await page.goto('https://asaka-wako.goguynet.jp/category/cat_event/', { waitUntil: 'domcontentloaded' });

            const goguyEvents = await page.evaluate(() => {
                const events: any[] = [];
                const now = new Date();
                const currentYear = now.getFullYear();
                const seen = new Set<string>();

                const anchors = Array.from(document.querySelectorAll('a[href*="goguynet.jp/20"]'));
                anchors.forEach((a) => {
                    const href = (a as HTMLAnchorElement).href || a.getAttribute('href') || '';
                    // 記事URL: .../YYYY/MM/DD/slug/
                    const um = href.match(/asaka-wako\.goguynet\.jp\/(\d{4})\/(\d{2})\/(\d{2})\//);
                    if (!um) return;

                    // タイトル整形: 改行/タブ除去 → 掲載日時以降を切り落とし → alt語除去
                    let title = (a.textContent || '').replace(/[\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
                    title = title.replace(/\s*20\d\d\/\d{1,2}\/\d{1,2}[\s\S]*$/, '').trim();
                    title = title.replace(/^(イベント|求人)\s*/, '').replace(/イベント$/, '').trim();
                    if (!title || title.length < 6) return;
                    // 和光市関連のみ（朝霞単独は除外）
                    if (!title.includes('和光')) return;

                    // 開催日: タイトル中の「M月D日」が必須（非イベント記事を除外）
                    const m = title.match(/(\d{1,2})月(\d{1,2})日/);
                    if (!m) return;
                    const month = m[1].padStart(2, '0');
                    const day = m[2].padStart(2, '0');

                    // 年は掲載日(URL)を基準に推定。イベント月が掲載月より大きく前なら翌年
                    const postYear = parseInt(um[1]);
                    const postMonth = parseInt(um[2]);
                    let year = postYear;
                    if (parseInt(m[1]) < postMonth - 6) year = postYear + 1;
                    const dateStr = `${year}-${month}-${day}`;

                    const fullUrl = href.startsWith('http') ? href : 'https://asaka-wako.goguynet.jp' + href;
                    if (seen.has(fullUrl)) return;
                    seen.add(fullUrl);

                    const container = a.closest('li') || a.closest('article') || a.parentElement;
                    const img = container ? container.querySelector('img') : null;
                    let imageUrl: string | null = img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null;

                    events.push({
                        title,
                        url: fullUrl,
                        date: dateStr,
                        categories: ['地域ニュース'],
                        source: '号外NET',
                        imageUrl: imageUrl || null
                    });
                });
                return events;
            });

            console.log(`Found ${goguyEvents.length} events from Goguynet.`);
            allEvents.push(...goguyEvents);
        } catch (e) {
            console.error('Error crawling Goguynet:', e);
        }

        // --- 和光市 商工イベント (駅前マルシェ等・市公式) ---
        try {
            console.log('Crawling Wako City Shoko events...');
            await page.goto('https://www.city.wako.lg.jp/jigyosha/1012711/1012741/index.html', { waitUntil: 'domcontentloaded' });

            const shokoLinks = await page.evaluate(() => {
                const out: { url: string; title: string }[] = [];
                const seen = new Set<string>();
                const anchors = Array.from(document.querySelectorAll('a[href*="/jigyosha/1012711/1012741/"]'));
                anchors.forEach((a) => {
                    const href = (a as HTMLAnchorElement).href || '';
                    if (!/\/jigyosha\/1012711\/1012741\/\d+\.html/.test(href)) return;
                    if (seen.has(href)) return;
                    seen.add(href);
                    out.push({ url: href, title: (a.textContent || '').trim() });
                });
                return out;
            });

            let shokoCount = 0;
            for (const link of shokoLinks.slice(0, 15)) {
                try {
                    await page.goto(link.url, { waitUntil: 'domcontentloaded' });
                    const info = await page.evaluate(() => {
                        const bodyText = document.body.textContent || '';
                        const dm = bodyText.match(/開催日[\s\S]{0,40}?(\d{4})年(\d{1,2})月(\d{1,2})日/);
                        const main = document.querySelector('#HONBUN') || document.body;
                        const im = main.querySelector('img[src*="/_page_/"]') as HTMLImageElement | null;
                        return {
                            dm: dm ? [dm[1], dm[2], dm[3]] : null,
                            img: im ? im.getAttribute('src') : null
                        };
                    });
                    if (!info.dm) continue;
                    const dateStr = `${info.dm[0]}-${info.dm[1].padStart(2, '0')}-${info.dm[2].padStart(2, '0')}`;
                    const title = link.title.replace(/^【終了しました】/, '').trim();
                    let imageUrl: string | null = info.img;
                    if (imageUrl && imageUrl.startsWith('/')) imageUrl = 'https://www.city.wako.lg.jp' + imageUrl;
                    allEvents.push({
                        title,
                        url: link.url,
                        date: dateStr,
                        categories: ['祭り・催し', '駅前'],
                        source: '和光市（商工イベント）',
                        imageUrl: imageUrl || null
                    });
                    shokoCount++;
                } catch (e) {
                    // 個別ページ失敗はスキップ
                }
            }
            console.log(`Found ${shokoCount} events from Wako City Shoko.`);
        } catch (e) {
            console.error('Error crawling Wako City Shoko events:', e);
        }

        // --- わぴあ (和光市広沢複合施設) ※JS描画のためベストエフォート ---
        try {
            console.log('Crawling Wapia...');
            await page.goto('https://wapia.jp/event/', { waitUntil: 'networkidle' });
            await page.waitForTimeout(2500);

            const wapiaEvents = await page.evaluate(() => {
                const events: any[] = [];
                const now = new Date();
                const currentYear = now.getFullYear();
                const seen = new Set<string>();

                // WP Show Posts のカード単位で取得
                const containers = Array.from(document.querySelectorAll('.wp-show-posts-single'));
                containers.forEach((c) => {
                    const titleLink = (c.querySelector('.wp-show-posts-entry-title a')
                        || Array.from(c.querySelectorAll('a')).find(x => (x.textContent || '').trim().length > 4)) as HTMLAnchorElement | undefined | null;
                    if (!titleLink) return;

                    const title = (titleLink.textContent || '').replace(/\s+/g, ' ').trim();
                    if (!title || title.length < 4) return;

                    const rawHref = titleLink.href || titleLink.getAttribute('href') || '';
                    if (!rawHref) return;

                    // 開催日: タイトル中の「M月D日」
                    const m = title.match(/(\d{1,2})月(\d{1,2})日/);
                    if (!m) return;
                    const month = m[1].padStart(2, '0');
                    const day = m[2].padStart(2, '0');

                    // 年は掲載日(time要素)を基準に推定
                    const timeEl = c.querySelector('time');
                    const pm = (timeEl ? (timeEl.textContent || '') : '').match(/(\d{4})年(\d{1,2})月/);
                    let year = pm ? parseInt(pm[1]) : currentYear;
                    const postMonth = pm ? parseInt(pm[2]) : (now.getMonth() + 1);
                    if (parseInt(m[1]) < postMonth - 6) year = year + 1;
                    const dateStr = `${year}-${month}-${day}`;

                    const fullUrl = new URL(rawHref, location.href).href;
                    if (seen.has(fullUrl)) return;
                    seen.add(fullUrl);

                    const img = c.querySelector('img');
                    let imageUrl: string | null = img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null;
                    if (imageUrl) imageUrl = new URL(imageUrl, location.href).href;

                    events.push({
                        title,
                        url: fullUrl,
                        date: dateStr,
                        categories: ['わぴあ', '屋内'],
                        source: 'わぴあ',
                        imageUrl: imageUrl || null
                    });
                });
                return events;
            });

            console.log(`Found ${wapiaEvents.length} events from Wapia.`);
            allEvents.push(...wapiaEvents);
        } catch (e) {
            console.error('Error crawling Wapia:', e);
        }

        // 重複イベントの名寄せ（同一日付＋正規化タイトル。複数ソースに跨る重複を除去）
        const normalizeTitle = (t: string) => t
            .replace(/[\s　]/g, '')                 // 空白除去
            .replace(/[（(][^）)]*[）)]/g, '')        // （金）（金曜日）等の括弧を除去
            .replace(/\d{1,2}\/\d{1,2}/g, '')        // 6/26 等
            .replace(/\d{1,2}月\d{1,2}日/g, '')      // 6月26日 等
            .replace(/[「」『』""!！。、,，・~〜\-]/g, '') // 記号類（【】は施設区別のため残す）
            .toLowerCase();
        const dedupSeen = new Set<string>();
        const deduped: Event[] = [];
        for (const ev of allEvents) {
            const key = `${ev.date}|${normalizeTitle(ev.title)}`;
            if (dedupSeen.has(key)) continue;
            dedupSeen.add(key);
            deduped.push(ev);
        }
        const removed = allEvents.length - deduped.length;
        allEvents.length = 0;
        allEvents.push(...deduped);
        console.log(`Deduplicated: removed ${removed} duplicate(s), ${allEvents.length} remain.`);

        // Sort all events by date
        allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        console.log(`Total events found: ${allEvents.length}`);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allEvents, null, 2));
        console.log(`Saved to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Error during crawling:', error);
    } finally {
        await browser.close();
    }
}

crawl().catch((e) => {
    // 想定外エラーでもジョブ全体は失敗させない（その日の更新が飛ぶのを防ぐ）
    console.error('Crawler finished with an unexpected error:', e);
});
