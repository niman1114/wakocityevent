import { chromium } from 'playwright';
import fs from 'fs';

async function inspect() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('http://www.wako-sci.or.jp/schedule/');
        await page.waitForTimeout(2000);
        const content = await page.content();
        fs.writeFileSync('debug_sci_schedule.html', content);
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

inspect();
