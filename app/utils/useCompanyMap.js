"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SUFFIXES = /\s+(ab|abp|publ|group)$/;
const SHARE_CLASS = /\s+(a|b|c|sdb|pref)$/;

const normalize = (value = "") => value.toLowerCase().replace(/\s+/g, " ").trim();

// Build lookup keys for one company: full name, native ticker, and the base
// name without share class ("Volvo B" -> "volvo"). On base-name collisions
// (Volvo A/B) the B share wins, matching what people usually mean.
function buildMap(rows) {
    const map = new Map();

    const set = (key, symbol, preferred) => {
        if (!key) return;
        if (!map.has(key) || preferred) map.set(key, symbol);
    };

    for (const row of rows) {
        if (!row.symbol) continue;
        const isB = /-B\.ST$/.test(row.symbol);
        const name = normalize(row.name);
        const native = normalize(row.nativeSymbol);

        set(name, row.symbol, false);
        set(native, row.symbol, false);

        const base = name.replace(SUFFIXES, "").replace(SHARE_CLASS, "").trim();
        if (base && base !== name) set(base, row.symbol, isB);

        const nativeBase = native.replace(SHARE_CLASS, "").trim();
        if (nativeBase && nativeBase !== native) set(nativeBase, row.symbol, isB);
    }

    return (label) => {
        const key = normalize(label).replace(/[.,:;!?)]+$/, "").replace(/^[(]+/, "");
        if (map.has(key)) return map.get(key);
        // genitive: "Volvos" -> "Volvo"
        if (key.endsWith("s") && map.has(key.slice(0, -1))) return map.get(key.slice(0, -1));
        if (key.endsWith(":s") && map.has(key.slice(0, -2))) return map.get(key.slice(0, -2));
        // "H&M" -> "HM"
        const noAmp = key.replace(/\s*&\s*/g, "");
        if (noAmp !== key && map.has(noAmp)) return map.get(noAmp);
        return null;
    };
}

let cachePromise = null;

async function loadResolver() {
    const res = await fetch(`${API_URL}/feed/companies`);
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error("bad companies payload");
    return buildMap(rows);
}

// Returns a resolve(name) -> symbol function once loaded, null before that.
// Resolves company names in article text to newswire symbols.
export function useCompanyMap() {
    const [resolver, setResolver] = useState(null);

    useEffect(() => {
        let active = true;
        cachePromise ??= loadResolver().catch((e) => {
            cachePromise = null;
            throw e;
        });
        cachePromise.then((r) => active && setResolver(() => r)).catch(() => { });
        return () => { active = false; };
    }, []);

    return resolver;
}
