import React from 'react'

export const metadata = {
    title: "Om oss",
    description: "Så fungerar Omxsums AI-genererade nyhetsbrev: datainsamling, analys och dagliga marknadssummeringar.",
};

export default function About() {
    return (
        <main className="min-h-[80vh] mx-auto max-w-4xl px-4 py-12 relative">
            <div className="absolute top-20 left-4 md:left-2 w-px bg-radial from-border to-90% h-full"></div>
            <h1 className="text-4xl font-serif font-bold pl-8 text-text mb-10">Hur våra nyhetsbrev fungerar</h1>

            <section className="mb-12 pl-8 relative pr-4">
                <div className="absolute left-2 md:-left-0 top-1.5 w-4 h-4 bg-border/60 rounded-full text-xs flex flex-row justify-center items-center text-text-muted">1</div>
                <h2 className="text-xl font-serif font-bold mb-3 text-text">Datainsamling</h2>
                <p className="text-text-muted mb-4">
                    Varje morgon hämtas marknadsdata från nyhetsartiklar, pressmeddelanden, rapporter, kalendrar och index data.
                </p>
            </section>

            <section className="mb-12 pl-8 relative pr-4">
                <div className="absolute left-2 md:-left-0 top-1.5 w-4 h-4 bg-border/60 rounded-full text-xs flex flex-row justify-center items-center text-text-muted">2</div>
                <h2 className="text-xl font-serif font-bold mb-3 text-text">Analys</h2>
                <p className="text-text-muted mb-4">
                    Våran algoritm filtrerar och analyserar den insamlade datan för att identifiera de mest relevanta och marknadspåverkande nyheterna. Dessa sammanfattas i en tydlig och koncis text, medan pressmeddelanden presenteras och sammanfattas separat.
                </p>
            </section>

            <section className="mb-12 pl-8 relative pr-4">
                <div className="absolute left-2 md:-left-0 top-1.5 w-4 h-4 bg-border/60 rounded-full text-xs flex flex-row justify-center items-center text-text-muted">3</div>
                <h2 className="text-xl font-serif font-bold mb-3 text-text">Ditt nyhetsbrev</h2>
                <p className="text-text-muted mb-4">
                    Resultatet är en sammanfattning som ger dig en snabb överblick av marknadens läge och viktiga händelser, så att du får en uppfattning av marknadsläget.
                </p>
            </section>

            <section className="pl-8 relative pr-2">
                <div className="absolute left-2 md:-left-0 top-1.5 w-4 h-4 bg-border/60 rounded-full text-xs flex flex-row justify-center items-center text-text-muted">4</div>
                <h2 className="text-xl font-serif font-bold mb-3 text-text">Kontinuerlig förbättring</h2>
                <p className="text-text-muted mb-4">
                    Jag arbetar ständigt med att förbättra datainsamlingen och analysprocessen samt lägga till nya funktioner. Din feedback är ovärderlig för att göra detta nyhetsbrev ännu bättre. OBS: Ingenting av artiklarna ska ses som rekommendationer
                </p>
                <span className="text-text-muted">Vid funderingar eller feedback, maila mig gärna på: <a href="mailto:filipkarlberg1@gmail.com" className="text-primary underline mt-4">filipkarlberg1@gmail.com</a></span>
            </section>

        </main>
    )
}
