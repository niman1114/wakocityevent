'use client';

import React, { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

type Status = 'unsupported' | 'loading' | 'off' | 'on' | 'denied';

export const PushSubscribe: React.FC = () => {
    const [status, setStatus] = useState<Status>('loading');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            setStatus('unsupported');
            return;
        }
        if (Notification.permission === 'denied') {
            setStatus('denied');
            return;
        }
        navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub) => setStatus(sub ? 'on' : 'off'))
            .catch(() => setStatus('unsupported'));
    }, []);

    const subscribe = async () => {
        if (!VAPID_PUBLIC_KEY) return;
        setBusy(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setStatus(permission === 'denied' ? 'denied' : 'off');
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
            });
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sub.toJSON()),
            });
            if (!res.ok) throw new Error('subscribe failed');
            setStatus('on');
        } catch (err) {
            console.error(err);
            setStatus('off');
            alert('通知の登録に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setBusy(false);
        }
    };

    const unsubscribe = async () => {
        setBusy(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await fetch('/api/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                });
                await sub.unsubscribe();
            }
            setStatus('off');
        } catch (err) {
            console.error(err);
            setStatus('on');
        } finally {
            setBusy(false);
        }
    };

    if (status === 'unsupported' || status === 'loading') return null;

    return (
        <div className="flex justify-center mb-8">
            {status === 'denied' ? (
                <p className="text-xs text-gray-400">
                    通知がブロックされています。ブラウザの設定からこのサイトの通知を許可すると、新着イベントのお知らせを受け取れます。
                </p>
            ) : status === 'on' ? (
                <button
                    onClick={unsubscribe}
                    disabled={busy}
                    className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 bg-white px-5 py-2.5 rounded-full transition-all"
                >
                    🔔 新着イベントの通知を受け取り中（タップで解除）
                </button>
            ) : (
                <button
                    onClick={subscribe}
                    disabled={busy}
                    className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 px-5 py-2.5 rounded-full shadow-sm transition-all"
                >
                    🔔 新着イベントを通知で受け取る
                </button>
            )}
        </div>
    );
};
