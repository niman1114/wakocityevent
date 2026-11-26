import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: '和光市のイベント情報',
        short_name: '和光イベント',
        description:
            '和光市・和光樹林公園・サンアゼリア・図書館など、和光市周辺の最新イベント情報を毎日自動更新でまとめたポータルサイト。',
        start_url: '/',
        display: 'standalone',
        background_color: '#f9fafb',
        theme_color: '#111827',
        lang: 'ja',
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
            },
        ],
    };
}
