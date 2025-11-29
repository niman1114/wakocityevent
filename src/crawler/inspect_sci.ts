import { chromium } from 'playwright';
import fs from 'fs';

async function inspect() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('http://www.wako-sci.or.jp/');
        await page.waitForTimeout(2000);
        const content = await page.content();
        fs.writeFileSync('debug_sci.html', content);

        // Check for event links
        const links = await page.$$eval('a', as => as.map(a => ({ href: a.href, text: a.innerText })));
        console.log('Links found:', links.filter(l => l.text.includes('イベント') || l.href.includes('event')));

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

inspect();
