import React from 'react';

interface EventProps {
    event: {
        title: string;
        url: string;
        date: string;
        categories: string[];
        source: string;
        imageUrl?: string | null;
    };
    isBookmarked: boolean;
    onToggleBookmark: () => void;
}

export const EventCard: React.FC<EventProps> = ({ event, isBookmarked, onToggleBookmark }) => {
    // Format date to Japanese format
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const shareData = {
            title: event.title,
            text: `${event.title} - ${formatDate(event.date)}`,
            url: event.url,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(`${event.title} ${event.url}`);
            alert('URLをコピーしました！');
        }
    };

    const handleBookmarkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleBookmark();
    };

    return (
        <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white rounded-xl overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1 h-full flex flex-col relative"
        >
            {/* Image Section */}
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                    src={event.imageUrl || ''}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute top-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wider">
                        {event.source}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 flex gap-2">
                    <button
                        onClick={handleShare}
                        className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-gray-600 hover:text-indigo-600 hover:bg-white shadow-sm transition-all duration-200"
                        title="シェアする"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                    <button
                        onClick={handleBookmarkClick}
                        className={`p-2 rounded-full backdrop-blur-sm shadow-sm transition-all duration-200 ${isBookmarked
                                ? 'bg-pink-50 text-pink-500 hover:bg-pink-100'
                                : 'bg-white/90 text-gray-400 hover:text-pink-500 hover:bg-white'
                            }`}
                        title="行きたい！"
                    >
                        <svg className={`w-4 h-4 ${isBookmarked ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-grow flex flex-col">
                <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        {formatDate(event.date)}
                    </p>
                    <h3 className="text-lg font-bold text-gray-900 leading-snug group-hover:text-gray-600 transition-colors line-clamp-2">
                        {event.title}
                    </h3>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                    <div className="flex flex-wrap gap-1">
                        {event.categories.slice(0, 2).map((category, index) => (
                            <span
                                key={index}
                                className="text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded"
                            >
                                {category}
                            </span>
                        ))}
                        {event.categories.length > 2 && (
                            <span className="text-[10px] text-gray-400 px-1 py-1">
                                +{event.categories.length - 2}
                            </span>
                        )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 transition-colors duration-300">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </div>
                </div>
            </div>
        </a>
    );
};
