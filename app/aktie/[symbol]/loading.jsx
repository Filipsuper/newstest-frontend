// Shown while the server fetches the overview. Mirrors the real layout so the
// page does not jump when the data lands.
const Block = ({ width, height, radius }) => (
    <span className="company-skeleton-block" style={{ width, height, borderRadius: radius }} />
);

export default function Loading() {
    return (
        <main className="company-page company-skeleton" aria-busy="true" aria-label="Laddar bolagssidan">
            <section className="company-chart-section">
                <div className="company-skeleton-row">
                    <Block width={74} height={13} />
                    <Block width={96} height={13} />
                    <Block width={168} height={13} />
                </div>

                <div className="company-skeleton-quote">
                    <Block width={210} height={44} radius={8} />
                    <Block width={128} height={16} />
                </div>

                <div className="company-skeleton-controls">
                    <div className="company-skeleton-ranges">
                        {[0, 1, 2, 3].map((index) => (
                            <span key={index} className="company-skeleton-range">
                                <Block width={44} height={11} />
                                <Block width={54} height={14} />
                            </span>
                        ))}
                    </div>
                    <div className="company-skeleton-actions">
                        <Block width={40} height={34} radius={7} />
                        <Block width={40} height={34} radius={7} />
                    </div>
                </div>

                <Block height="var(--company-skeleton-chart-height)" radius={10} />
            </section>

            <div className="company-tabs company-skeleton-tabs">
                {[68, 92, 66, 82, 148, 78].map((width, index) => (
                    <Block key={index} width={width} height={14} />
                ))}
            </div>

            <div className="company-overview-layout">
                <div className="company-main-column">
                    <section className="company-section">
                        <Block width={128} height={11} />
                        <div className="company-skeleton-title"><Block width="min(420px, 70%)" height={34} radius={8} /></div>
                        <div className="company-skeleton-lines">
                            {["100%", "97%", "99%", "94%", "62%"].map((width, index) => (
                                <Block key={index} width={width} height={13} />
                            ))}
                        </div>
                        <div className="company-skeleton-facts">
                            {[0, 1, 2, 3].map((index) => (
                                <span key={index}>
                                    <Block width={92} height={12} />
                                    <Block width={140} height={12} />
                                </span>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="company-context-column">
                    <section className="company-context-section">
                        <Block width={104} height={11} />
                        <div className="company-skeleton-title"><Block width="60%" height={28} radius={8} /></div>
                        <div className="company-skeleton-news">
                            {[0, 1, 2].map((index) => (
                                <span key={index}>
                                    <Block width={78} height={10} />
                                    <Block width="100%" height={14} />
                                    <Block width="72%" height={14} />
                                </span>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </main>
    );
}
