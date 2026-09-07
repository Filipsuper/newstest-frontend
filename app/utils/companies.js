// Shared, session-cached company list from the backend (name, nativeSymbol, symbol)
const API_URL = process.env.NEXT_PUBLIC_API_URL;

let companiesPromise = null;

export function getCompanies() {
    if (!companiesPromise) {
        companiesPromise = fetch(`${API_URL}/feed/companies`)
            .then((res) => { if (!res.ok) throw new Error("Company list unavailable"); return res.json(); })
            .then((rows) => {
                if (!Array.isArray(rows) || !rows.length) { companiesPromise = null; return []; }
                return rows;
            })
            .catch(() => {
                companiesPromise = null;
                return [];
            });
    }
    return companiesPromise;
}
