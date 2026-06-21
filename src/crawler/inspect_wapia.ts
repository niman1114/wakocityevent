import { chromium } from 'playwright';

// わぴあ(wapia.jp/event) のDOM構造調査用スクリプト
// 実行: npx tsx src/crawler/inspect_wapia.ts
async function inspect() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('https://wapia.jp/event/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        const result = await page.evaluate(() => {
            const lines: string[] = [];

            // 1) ページ全体のリンク数とevent関連リンク
            const allAnchors = Array.from(document.querySelectorAll('a'));
            lines.push(`総リンク数: ${allAnchors.length}`);

            const eventAnchors = allAnchors.filter(a => /event/.test(a.getAttribute('href') || ''));
            lines.push(`event を含むリンク数: ${eventAnchors.length}`);
            lines.push('--- event リンク（最大20件: href | text | 親タグ.class） ---');
            eventAnchors.slice(0, 20).forEach(a => {
                const href = a.getAttribute('href') || '';
                const text = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
                const p = a.parentElement;
                const pInfo = p ? `${p.tagName.toLowerCase()}.${(p.className || '').toString().split(' ').join('.')}` : '';
                lines.push(`${href} | ${text} | ${pInfo}`);
            });

            // 2) 「M月D日」を含む要素のタグ/class（イベント行の特定用）
            lines.push('--- 「月..日」を含む要素（最大15件: タグ.class | text先頭40字） ---');
            const all = Array.from(document.querySelectorAll('body *'));
            let cnt = 0;
            for (const el of all) {
                const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('');
                if (/\d{1,2}月\d{1,2}日/.test(own)) {
                    const cls = (el.className || '').toString().split(' ').filter(Boolean).join('.');
                    lines.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} | ${own.replace(/\s+/g, ' ').trim().slice(0, 40)}`);
                    if (++cnt >= 15) break;
                }
            }

            // 3) 主要なリスト/カードらしき要素
            lines.push('--- 候補コンテナのclass出現回数 ---');
            const classCount: Record<string, number> = {};
            document.querySelectorAll('li, article, .card, [class*="event"], [class*="list"], [class*="item"]').forEach(el => {
                const cls = (el.className || '').toString().trim();
                if (cls) classCount[cls] = (classCount[cls] || 0) + 1;
            });
            Object.entries(classCount).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([cls, n]) => {
                lines.push(`(${n}) ${cls}`);
            });

            return lines.join('\n');
        });

        console.log(result);
    } catch (e) {
        console.error('inspect error:', e);
    } finally {
        await browser.close();
    }
}

inspect();
