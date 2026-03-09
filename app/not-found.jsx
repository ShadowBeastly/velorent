import Link from "next/link";
export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="text-8xl font-bold text-orange-500 mb-4">404</div>
                <h1 className="text-2xl font-bold text-white mb-2">Seite nicht gefunden</h1>
                <p className="text-slate-400 mb-6">Die angeforderte Seite existiert nicht.</p>
                <Link href="/" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold inline-block">
                    Zur Startseite
                </Link>
            </div>
        </div>
    );
}
