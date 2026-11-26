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

type Status =
    | 'loading'
    | 'off'
    | 'on'
    | 'denied'
    | 'ios-needs-install' // iPhone/iPad: ホーム画面に追加しないと通知が使えない
    | 'unsupported';

function detectStatus(): Status {
    if (!VAPID_PUBLIC_KEY) return 'unsupported';
    const ua = navigator.userAgent;
    const isIOS =
        /iPhone|iPad|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isIOS && !isStandalone) return 'ios-needs-install';
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    return 'off'; // 購読状態は非同期で確認して更新する
}

export const PushSubscribe: React.FC = () => {
    const [status, setStatus] = useState<Status>('loading');
    const [busy, setBusy] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const initial = detectStatus();
        setStatus(initial);
        if (initial !== 'off' && initial !== 'denied') return;
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

    if (status === 'loading') return null;

    return (
        <div className="mb-8">
            <div className="flex flex-col items-center gap-2">
                {status === 'on' ? (
                    <button
                        onClick={unsubscribe}
                        disabled={busy}
                        className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 bg-white px-5 py-2.5 rounded-full transition-all"
                    >
                        🔔 新着イベントの通知を受け取り中（タップで解除）
                    </button>
                ) : status === 'off' ? (
                    <button
                        onClick={subscribe}
                        disabled={busy}
                        className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 px-5 py-2.5 rounded-full shadow-sm transition-all"
                    >
                        🔔 新着イベントを通知で受け取る
                    </button>
                ) : status === 'ios-needs-install' ? (
                    <div className="text-center bg-white border border-gray-200 rounded-2xl px-6 py-5 max-w-md">
                        <p className="text-sm font-semibold text-gray-900 mb-2">
                            🔔 新着イベントの通知を受け取るには
                        </p>
                        <ol className="text-sm text-gray-600 text-left space-y-1.5 list-decimal list-inside">
                            <li>このページを Safari で開く</li>
                            <li>共有ボタン（□に↑）をタップ</li>
                            <li>「ホーム画面に追加」を選ぶ</li>
                            <li>ホーム画面のアイコンから開くと、ここに通知ボタンが出ます</li>
                        </ol>
                        <p className="text-xs text-gray-400 mt-3">iPhone / iPad（iOS 16.4以降）ではこの手順が必要です</p>
                    </div>
                ) : status === 'denied' ? (
                    <p className="text-xs text-gray-400 text-center max-w-md">
                        通知がブロックされています。ブラウザの設定からこのサイトの通知を許可すると、新着イベントのお知らせを受け取れます。
                    </p>
                ) : (
                    <p className="text-xs text-gray-400 text-center max-w-md">
                        お使いのブラウザでは通知機能が使えません。PCやAndroidの Chrome、iPhoneの Safari（ホーム画面に追加）でご利用いただけます。
                    </p>
                )}

                <button
                    onClick={() => setShowHelp((v) => !v)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
                >
                    通知について
                </button>
            </div>

            {showHelp && (
                <div className="mt-4 max-w-md mx-auto bg-white border border-gray-100 rounded-2xl px-6 py-5 text-sm text-gray-600 space-y-3 shadow-sm">
                    <p>
                        <strong className="text-gray-900">どんな通知？</strong>
                        <br />
                        新しいイベントが追加されたら、翌朝にまとめて1回だけお知らせします。イベントごとの通知は送りません。
                    </p>
                    <p>
                        <strong className="text-gray-900">受け取り方</strong>
                        <br />
                        PC・Android：このページの「通知で受け取る」ボタンを押して許可するだけです。
                        <br />
                        iPhone・iPad：Safariの共有メニューから「ホーム画面に追加」し、追加したアイコンから開いてボタンを押してください（iOS 16.4以降）。
                    </p>
                    <p>
                        <strong className="text-gray-900">止め方</strong>
                        <br />
                        このページのボタン（受け取り中と表示されます）をタップすればいつでも解除できます。ブラウザや端末の通知設定からオフにすることもできます。
                    </p>
                    <p>
                        <strong className="text-gray-900">個人情報について</strong>
                        <br />
                        通知の配信に必要な宛先情報だけを保存します。名前やメールアドレスなどの個人情報は集めません。
                    </p>
                </div>
            )}
        </div>
    );
};
