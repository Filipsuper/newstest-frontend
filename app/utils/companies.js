// Shared, session-cached company list from the backend (name, nativeSymbol, symbol)
const API_URL = process.env.NEXT_PUBLIC_API_URL;

let companiesPromise = null;

export function getCompanies() {
    if (!companiesPromise) {
        companiesPromise = fetch(`${API_URL}/feed/companies`)
            .then((res) => res.json())
            .then((rows) => (Array.isArray(rows) ? rows : []))
            .catch(() => {
                companiesPromise = null;
                return [];
            });
    }
    return companiesPromise;
}
