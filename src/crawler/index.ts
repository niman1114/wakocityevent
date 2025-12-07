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
        await page.goto(START_URL);
        console.log(`Navigated to ${START_URL}`);

        const allEvents: Event[] = [];

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

crawl();
