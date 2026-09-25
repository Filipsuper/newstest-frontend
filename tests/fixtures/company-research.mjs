// Fictional local-only data; never consumed by production routes.
export function researchFixtures(symbol, now = Date.now()) {
  const day = ago => new Date(now - ago * 86400_000).toISOString().slice(0, 10);
  const transactions = Array.from({ length: 18 }, (_, i) => ({
    txId: `fictional-trade-${i}`, person: ['Anna Andersson', 'Erik Lindberg', 'Nordens Investeringsbolag'][i % 3], position: i % 3 ? 'Styrelseledamot' : 'VD',
    direction: i % 4 ? 'acquisition' : 'disposal', value: (5000 + i * 100) * 124.5, currency: 'SEK', volume: 5000 + i * 100,
    price: 124.5, unit: 'Quantity', instrumentType: 'Aktie', transactionDate: day(i * 8), url: 'https://example.test/fictional-insider',
  }));
  const windowStats = days => {
    const rows = transactions.filter(row => row.transactionDate >= day(days));
    const boughtValue = rows.filter(row => row.direction === 'acquisition').reduce((sum, row) => sum + row.value, 0);
    const soldValue = rows.filter(row => row.direction === 'disposal').reduce((sum, row) => sum + row.value, 0);
    return { days, transactions: rows.length, boughtValue, soldValue, netValue: boughtValue - soldValue,
      buyers: new Set(rows.filter(row => row.direction === 'acquisition').map(row => row.person)).size,
      sellers: new Set(rows.filter(row => row.direction === 'disposal').map(row => row.person)).size };
  };
  return {
    calendar: { events: [{ type: 'earnings', date: day(-21), fiscalPeriod: '2026-Q3' }, { type: 'capital_market_day', date: day(-38) }, { type: 'ex_dividend', date: day(-60) }, { type: 'dividend', date: day(-65) }] },
    insiders: { symbol, available: true, status: 'available', transactions, summary: { last90Days: windowStats(90), last365Days: windowStats(365) },
      personHoldings: [{ person: 'Anna Andersson', role: 'VD', shares: 120000, estimatedShares: 125000, flowCount: 1, fiscalYear: 2025 }],
      ownership: { available: true, ownersAsOf: '2025-12-31', fiscalYear: 2025,
        largestOwners: [{ name: 'Nordens Investeringsbolag', capitalPct: 31.2, votesPct: 42.5, shares: 3120000 }, { name: 'Familjen Andersson', capitalPct: 18.4, votesPct: 20.1, shares: 1840000 }, { name: 'Fiktiva Fonder', capitalPct: 9.6, votesPct: 6.2 }, { name: 'Långsiktiga Pension', capitalPct: 6.2 }, { name: 'Anna Andersson', capitalPct: 1.2 }],
        source: { attachmentUrl: 'https://example.test/fictional-report.pdf', issuer: 'Norden Industri' } } },
    shorts: { symbol, available: true, status: 'available', aggregate: { pct: 3.82, positionDate: day(1) },
      series: Array.from({ length: 25 }, (_, i) => ({ date: day((24 - i) * 12 + 1), pct: i === 24 ? 2.3 : Math.round((1.7 + Math.sin(i / 3) * .8 + i * .03) * 100) / 100 })),
      positions: [{ holder: 'Fiktiva Capital', pct: 1.42, positionDate: day(1) }, { holder: 'Exempel Asset Management', pct: .88, positionDate: day(7) }],
    },
  };
}
