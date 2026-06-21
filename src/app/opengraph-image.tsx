import { ImageResponse } from 'next/og';

export const alt = '和光市のイベント情報 | Wako Events';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TITLE = '和光市のイベント情報';
const SUB1 = '埼玉県和光市';
const SUB2 = 'マルシェ・コンサート・子育て・お祭りを毎日更新';
const DOMAIN = 'wakocityevent.vercel.app';

// 日本語を描画するため、必要な文字だけGoogle Fontsから取得（サブセット）
async function loadGoogleFont(font: string, weight: number, text: string) {
    const url = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const resource = css.match(/src: url\((.+?)\) format\(/);
    if (resource) {
        const res = await fetch(resource[1]);
        if (res.status === 200) return await res.arrayBuffer();
    }
    throw new Error('failed to load font');
}

export default async function OgImage() {
    const allText = TITLE + SUB1 + SUB2 + DOMAIN;
    const [regular, bold] = await Promise.all([
        loadGoogleFont('Noto+Sans+JP', 500, allText),
        loadGoogleFont('Noto+Sans+JP', 800, allText),
    ]);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                    padding: '80px',
                    color: 'white',
                    fontFamily: 'Noto Sans JP',
                }}
            >
                <div style={{ fontSize: 40, fontWeight: 500, opacity: 0.92, marginBottom: 16 }}>{SUB1}</div>
                <div style={{ fontSize: 100, fontWeight: 800, lineHeight: 1.15 }}>{TITLE}</div>
                <div style={{ fontSize: 36, fontWeight: 500, opacity: 0.95, marginTop: 36 }}>{SUB2}</div>
                <div style={{ fontSize: 30, fontWeight: 500, opacity: 0.85, marginTop: 'auto' }}>{DOMAIN}</div>
            </div>
        ),
        {
            ...size,
            fonts: [
                { name: 'Noto Sans JP', data: regular, weight: 500, style: 'normal' },
                { name: 'Noto Sans JP', data: bold, weight: 800, style: 'normal' },
            ],
        }
    );
}
