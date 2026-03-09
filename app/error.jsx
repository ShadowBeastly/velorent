"use client";

export default function GlobalError({ error, reset }) {
    return (
        <html lang="de">
            <body className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
                <div className="text-center">
                    <p className="text-6xl font-bold text-red-500 mb-4">500</p>
                    <h1 className="text-2xl font-semibold mb-2">Etwas ist schiefgelaufen</h1>
                    <p className="text-slate-400 mb-8 text-sm max-w-sm">{error?.message || "Ein unerwarteter Fehler ist aufgetreten."}</p>
                    <button onClick={() => reset()} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        Erneut versuchen
                    </button>
                </div>
            </body>
        </html>
    );
}
