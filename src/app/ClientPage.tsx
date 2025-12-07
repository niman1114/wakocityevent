'use client';

import React, { useState, useMemo } from 'react';
import { EventCard } from '@/components/EventCard';
import { getGenres, getGenreIcon, type Event } from '@/lib/genreMapping';
import { useBookmarks } from '@/hooks/useBookmarks';

interface ClientPageProps {
    events: Event[];
}

export default function ClientPage({ events }: ClientPageProps) {
    const [selectedGenre, setSelectedGenre] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showBookmarkedOnly, setShowBookmarkedOnly] = useState<boolean>(false);

    const { bookmarkedUrls, toggleBookmark, isBookmarked } = useBookmarks();

    // Get all available genres
    const allGenres = useMemo(() => getGenres(), []);

    // Count events per genre
    const getGenreCount = (genre: string) => {
        return events.filter(e => e.genre === genre).length;
    };

    // Filter events based on selected genre and search query
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            // Filter by genre
            if (selectedGenre !== 'all' && event.genre !== selectedGenre) return false;

            // Filter by search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchTitle = event.title.toLowerCase().includes(query);
                const matchCategory = event.categories.some(c => c.toLowerCase().includes(query));
                if (!matchTitle && !matchCategory) return false;
            }

            // Filter by bookmarks
            if (showBookmarkedOnly && !isBookmarked(event.url)) return false;

            return true;
        });
    }, [events, selectedGenre, searchQuery, showBookmarkedOnly, bookmarkedUrls]); // Added bookmarkedUrls dependency

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-gray-200">
            {/* Header / Hero Section */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md bg-white/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 cursor-pointer" onClick={() => { setSelectedGenre('all'); setShowBookmarkedOnly(false); }}>
                        和光市のイベント情報
                    </h1>
                    <div className="w-full max-w-md hidden sm:block">
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-100 border-none rounded-full px-5 py-2.5 text-sm focus:ring-2 focus:ring-gray-200 transition-all outline-none"
                        />
                    </div>
                </div>
            </header>

            {/* Mobile Search (visible only on small screens) */}
            <div className="sm:hidden px-4 py-4 bg-white border-b border-gray-100">
                <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-100 border-none rounded-full px-5 py-2.5 text-sm focus:ring-2 focus:ring-gray-200 transition-all outline-none"
                />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* View Toggle (All vs Bookmarks) */}
                <div className="flex justify-center mb-8">
                    <div className="bg-gray-100 p-1 rounded-full inline-flex">
                        <button
                            onClick={() => setShowBookmarkedOnly(false)}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!showBookmarkedOnly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            すべてのイベント
                        </button>
                        <button
                            onClick={() => setShowBookmarkedOnly(true)}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${showBookmarkedOnly ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-pink-600'}`}
                        >
                            <span>行きたい！</span>
                            <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">{bookmarkedUrls.length}</span>
                        </button>
                    </div>
                </div>

                {/* Genre Filter (Only show when not in bookmark mode, or maybe keep it?) */}
                {!showBookmarkedOnly && (
                    <div className="mb-12 overflow-x-auto pb-4 scrollbar-hide">
                        <div className="flex gap-3 min-w-max">
                            <button
                                onClick={() => setSelectedGenre('all')}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${selectedGenre === 'all'
                                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                                    : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                                    }`}
                            >
                                All Events
                            </button>
                            {allGenres.map(genre => {
                                const count = getGenreCount(genre);
                                const icon = getGenreIcon(genre);
                                return (
                                    <button
                                        key={genre}
                                        onClick={() => setSelectedGenre(genre)}
                                        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${selectedGenre === genre
                                            ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                                            : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                                            }`}
                                    >
                                        <span>{icon}</span>
                                        <span>{genre}</span>
                                        <span className={`ml-1 text-xs ${selectedGenre === genre ? 'text-gray-400' : 'text-gray-300'}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Results Count */}
                <div className="mb-8 flex items-end justify-between border-b border-gray-200 pb-4">
                    <h2 className="text-3xl font-light text-gray-900">
                        {showBookmarkedOnly ? 'My List' : (selectedGenre === 'all' ? '今後のイベント' : selectedGenre)}
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">
                        {filteredEvents.length} events found
                    </p>
                </div>

                {/* Event Grid */}
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredEvents.length > 0 ? (
                        filteredEvents.map((event, index) => (
                            <EventCard
                                key={index}
                                event={event}
                                isBookmarked={isBookmarked(event.url)}
                                onToggleBookmark={() => toggleBookmark(event.url)}
                            />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <div className="text-6xl mb-6 opacity-20">
                                {showBookmarkedOnly ? '💖' : '🔍'}
                            </div>
                            <p className="text-xl text-gray-400 font-light">
                                {showBookmarkedOnly
                                    ? 'まだ「行きたい！」イベントがありません。\n気になるイベントのハートマークを押して追加しましょう！'
                                    : 'No events found matching your criteria.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="mt-24 pt-12 border-t border-gray-200 text-center pb-12">
                    <div className="mb-8">
                        <a href="/past" className="text-sm text-gray-500 hover:text-gray-900 transition-colors border-b border-transparent hover:border-gray-300 pb-0.5">
                            過去のイベントを見る
                        </a>
                    </div>
                    <p className="text-gray-400 text-xs tracking-wider uppercase">
                        Data Sources: Wako City / Sun Azalea / Chamber of Commerce / Wa-Kosodate
                    </p>
                    <p className="text-gray-300 text-xs mt-4">
                        Last updated: {new Date().toLocaleDateString('ja-JP')}
                    </p>
                </footer>
            </div>
        </main>
    );
}
