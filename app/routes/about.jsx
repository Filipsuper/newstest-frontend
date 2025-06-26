import React from 'react'
export default function About() {
    return (
        <main className="min-h-[80vh] mx-auto max-w-4xl py-8 relative ">
            <div className="absolute top-20 left-4 md:left-2 w-px bg-radial from-border to-90% h-full"></div>
            <h1 className="text-4xl font-bold pl-8 text-text">Hur våra nyhetsbrev fungerar</h1>
            <p className="pl-8 mb-12 text-text-article">
                Detta är just nu en beta-version och byggs av en utvecklare på fritiden. Om sidan uppskattas så sprid gärna ordet!
            </p>
            <span className="text-gray-600 italic text-sm pl-8"> Såhär fungerar det:</span>

            <section className="mb-12 pl-8 relative pr-4">
                <div className="shadow-md absolute left-2 md:-left-0 top-2 w-4 h-4 bg-background border border-border rounded-full text-xs flex flex-row justify-center items-center text-text-muted">1</div>
                <h2 className="text-2xl font-semibold mb-4 text-text">Datainsamling</h2>
                <p className="text-text-muted mb-4">
                    Varje morgon hämtas marknadsdata från nyhetsartiklar, pressmeddelanden, rapporter, kalendrar och index data.
                </p>
            </section>

            <section className="mb-12 pl-8 relative pr-4">
                <div className="shadow-md absolute left-2 md:-left-0 top-2 w-4 h-4 bg-background border border-border rounded-full text-xs flex flex-row justify-center items-center text-text-muted">2</div>
                <h2 className="text-2xl font-semibold mb-4 text-text">Analys</h2>
                <p className="text-text-muted mb-4">
                    Våran algoritm filtrerar och analyserar den insamlade datan för att identifiera de mest relevanta och marknadspåverkande nyheterna. Dessa sammanfattas i en tydlig och koncis text, medan pressmeddelanden presenteras och sammanfattas separat.
                </p>
            </section>

            <section className="mb-12 pl-8 relative pr-4">
                <div className="shadow-md absolute left-2 md:-left-0 top-2 w-4 h-4 bg-background border border-border rounded-full text-xs flex flex-row justify-center items-center text-text-muted">3</div>
                <h2 className="text-2xl font-semibold mb-4 text-text">Ditt nyhetsbrev</h2>
                <p className="text-text-muted mb-4">
                    Resultatet är en sammanfattning som ger dig en snabb överblick av marknadens läge och viktiga händelser, så att du får en uppfattning av marknadsläget.
                </p>
            </section>

            <section className="pl-8 relative pr-2">
                <div className="shadow-md absolute left-2 md:-left-0 top-2 w-4 h-4 bg-background border border-border rounded-full text-xs flex flex-row justify-center items-center text-text-muted">4</div>
                <h2 className="text-2xl font-semibold mb-4 text-text">Kontinuerlig förbättring</h2>
                <p className="text-text-muted mb-4">
                    Morgonbrevet utvecklas löpande. Jag arbetar ständigt med att förbättra datainsamlingen och analysprocessen samt lägga till nya funktioner. Din feedback är ovärderlig för att göra detta nyhetsbrev ännu bättre.
                </p>
                <span className="text-text-muted">Vid funderingar eller feedback, maila mig gärna på: <a href="mailto:filipkarlberg1@gmail.com" className="text-primary underline mt-4">filipkarlberg1@gmail.com</a> eller annars till hans chef (som är mycket mer begåvad): <a href="mailto:axelbrandel@gmail.com" className="text-primary underline mt-4">axelbrandel@gmail.com</a></span>
            </section>

        </main>
    )
}
