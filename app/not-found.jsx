import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
            <div className="text-center">
                <p className="text-6xl font-bold text-blue-500 mb-4">404</p>
                <h1 className="text-2xl font-semibold mb-2">Seite nicht gefunden</h1>
                <p className="text-slate-400 mb-8">Diese Seite existiert nicht oder wurde verschoben.</p>
                <Link href="/" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    Zur Startseite
                </Link>
            </div>
        </div>
    );
}
