import Link from "next/link";

export default function NotFound() {
    return (
        <main className="pt-16 p-4 container mx-auto text-text min-h-[60vh]">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="mb-4">Sidan kunde inte hittas.</p>
            <Link href="/" className="text-primary underline">Tillbaka till startsidan</Link>
        </main>
    );
}
