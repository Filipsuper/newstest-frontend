import React from 'react'
export default function About() {
    return (
        <main className="min-h-[80vh] mx-auto max-w-4xl py-8 relative ">
            <div className="absolute top-20 left-4 md:left-2 w-px bg-radial from-border to-90% h-full"></div>
            <h1 className="text-4xl font-bold pl-8 text-text">Morgonbrevet</h1>
            <p className="pl-8 mb-12 text-text-article">
                Få en daglig sammanfattning av Stockholmsbörsens senaste nyheter, företagsmeddelanden och marknadshändelser – allt för att ge dig en snabb och insiktsfull start på dagen.
            </p>
            <span className="text-gray-600 italic text-sm pl-8"> Såhär fungerar det:</span>

            <section className="mb-12 pl-8 relative pr-4">
                <div className="shadow-md absolute left-2 md:-left-0 top-2 w-4 h-4 bg-background border border-border rounded-full text-xs flex flex-row justify-center items-center text-text-muted">1</div>
                <h2 className="text-2xl font-semibold mb-4 text-text">Datainsamling</h2>
                <p className="text-text-muted mb-4">
                    Varje morgon hämtas marknadsdata från över 60 nyhetsartiklar, 100+ pressmeddelanden samt andra viktiga källor, inklusive rapporter och pre-market data.
                </p>
            </section>

            <section className="mb-12 pl-8 relative pr-4">
                <div className="shadow-md absolute left-2 md:-left-0 top-2 w-4 h-4 bg-background border border-border rounded-full text-xs flex flex-row justify-center items-center text-text-muted">2</div>
                <h2 className="text-2xl font-semibold mb-4 text-text">Avancerad analys</h2>
                <p className="text-text-muted mb-4">
                    En specialutvecklad algoritm filtrerar och analyserar den insamlade datan för att identifiera de mest relevanta och marknadspåverkande nyheterna. Dessa sammanfattas i en tydlig och koncis text, medan pressmeddelanden presenteras och sammanfattas separat.
                </p>
            </section>

            <section className="mb-12 pl-8 relative pr-4">
                <div className="shadow-md absolute left-2 md:-left-0 top-2 w-4 h-4 bg-background border border-border rounded-full text-xs flex flex-row justify-center items-center text-text-muted">3</div>
                <h2 className="text-2xl font-semibold mb-4 text-text">Ditt morgonbrev</h2>
                <p className="text-text-muted mb-4">
                    Resultatet är en effektiv sammanfattning som ger dig en snabb överblick av marknadens läge och viktiga händelser – så att du kan fatta välgrundade beslut redan från morgonen.
                </p>
            </section>

            <section className="pl-8 relative pr-2">
                <div className="shadow-md absolute left-2 md:-left-0 top-2 w-4 h-4 bg-background border border-border rounded-full text-xs flex flex-row justify-center items-center text-text-muted">4</div>
                <h2 className="text-2xl font-semibold mb-4 text-text">Kontinuerlig förbättring</h2>
                <p className="text-text-muted">
                    Morgonbrevet utvecklas och optimeras löpande för att säkerställa högsta möjliga kvalitet och relevans. Jag arbetar ständigt med att förbättra datainsamlingen och analysprocessen för att skapa den bästa möjliga upplevelsen för dig.
                </p>
            </section>
        </main>
    )
}
