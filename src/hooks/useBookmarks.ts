import { useState, useEffect } from 'react';

export function useBookmarks() {
    const [bookmarkedUrls, setBookmarkedUrls] = useState<string[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('bookmarkedEvents');
        if (stored) {
            setBookmarkedUrls(JSON.parse(stored));
        }
    }, []);

    const toggleBookmark = (url: string) => {
        setBookmarkedUrls(prev => {
            const newBookmarks = prev.includes(url)
                ? prev.filter(b => b !== url)
                : [...prev, url];
            localStorage.setItem('bookmarkedEvents', JSON.stringify(newBookmarks));
            return newBookmarks;
        });
    };

    const isBookmarked = (url: string) => bookmarkedUrls.includes(url);

    return { bookmarkedUrls, toggleBookmark, isBookmarked };
}
