"use client";
// eslint-disable-next-line no-unused-vars
export default function GlobalError({ error, reset }) {
    return (
        <html lang="de">
            <body className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <span className="text-2xl text-white font-bold">!</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Etwas ist schiefgelaufen</h1>
                    <p className="text-slate-400 mb-6">Ein unerwarteter Fehler ist aufgetreten.</p>
                    <button onClick={() => reset()} className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold">
                        Erneut versuchen
                    </button>
                </div>
            </body>
        </html>
    );
}
