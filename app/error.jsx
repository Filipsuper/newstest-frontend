"use client";

export default function Error({ error, reset }) {
    return (
        <main className="pt-16 p-4 container mx-auto text-text min-h-[60vh]">
            <h1 className="text-4xl font-bold mb-4">Oops!</h1>
            <p className="mb-4">Ett oväntat fel inträffade.</p>
            <button className="primary-btn" onClick={() => reset()}>
                Försök igen
            </button>
        </main>
    );
}
