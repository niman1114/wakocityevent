// カテゴリをユーザーフレンドリーなジャンルにマッピング
export const GENRE_MAPPING = {
    'レジャー・娯楽': {
        keywords: ['祭り', '催し', 'コンサート', '観賞', '見る', '聴く', 'フェスティバル', '演奏会', 'ライブ', 'ショー', '映画', 'シアター'],
        icon: '🎉',
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1000'
    },
    '学び・教室': {
        keywords: ['講座', '教室', '学ぶ', '聞く', 'セミナー', '講演', '大学', '研究'],
        icon: '📚',
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=1000'
    },
    '体験・参加': {
        keywords: ['体験', 'つくる', '参加', 'ワークショップ', 'フォトセッション', '作り'],
        icon: '✨',
        image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=1000'
    },
    '子ども・子育て': {
        keywords: ['子ども', '子育て', 'あかちゃん', '絵本', 'おはなし', 'ファミリー', '親子'],
        icon: '👶',
        image: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&q=80&w=1000'
    },
    '健康・スポーツ': {
        keywords: ['健康', 'スポーツ', '体操', '福祉', '相談', 'ヘルス', '卓球', 'リフレッシュ'],
        icon: '💪',
        image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=1000'
    },
    '文化・芸術': {
        keywords: ['展示', 'アート', 'ギャラリー', 'オペラ', 'ピアノ', 'フルート', '吹奏楽', '音楽', '歌', '美術'],
        icon: '🎨',
        image: 'https://images.unsplash.com/photo-1518998053901-5348d3969104?auto=format&fit=crop&q=80&w=1000'
    },
    'その他': {
        keywords: ['その他', '会議', '鑑定'],
        icon: '📌',
        image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=1000'
    }
};

export interface Event {
    title: string;
    url: string;
    date: string;
    categories: string[];
    source: string;
    genre?: string; // 追加: マッピングされたジャンル
    imageUrl?: string | null; // 追加: 画像URL
}

// イベントにジャンルを割り当てる関数
export function assignGenre(event: Event): Event {
    const titleAndCategories = `${event.title} ${event.categories.join(' ')}`.toLowerCase();
    let genre = 'その他';

    // 各ジャンルのキーワードをチェック
    for (const [g, config] of Object.entries(GENRE_MAPPING)) {
        for (const keyword of config.keywords) {
            if (titleAndCategories.includes(keyword.toLowerCase())) {
                genre = g;
                break;
            }
        }
        if (genre !== 'その他') break;
    }

    // 画像がない場合はジャンルのデフォルト画像を設定
    const imageUrl = event.imageUrl || GENRE_MAPPING[genre as keyof typeof GENRE_MAPPING]?.image || GENRE_MAPPING['その他'].image;

    return { ...event, genre, imageUrl };
}

// イベント配列にジャンルを割り当てる
export function assignGenresToEvents(events: Event[]): Event[] {
    return events.map(assignGenre);
}

// ジャンル一覧を取得
export function getGenres(): string[] {
    return Object.keys(GENRE_MAPPING);
}

// ジャンルのアイコンを取得
export function getGenreIcon(genre: string): string {
    return GENRE_MAPPING[genre as keyof typeof GENRE_MAPPING]?.icon || '📌';
}
