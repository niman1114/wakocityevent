import { MetadataRoute } from 'next';
import { getAllEvents, eventSlug } from '@/lib/events';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://wakocityevent.vercel.app';
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/past`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.8,
        },
    ];

    const eventPages: MetadataRoute.Sitemap = getAllEvents().map((event) => ({
        url: `${baseUrl}/events/${eventSlug(event)}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    return [...staticPages, ...eventPages];
}
