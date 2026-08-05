"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import { getCompanies } from "../utils/companies";

const normalize = (value = "") => value.toLowerCase().trim();

export default function StockSearch({ placeholder = "Sök aktie…", onSelect }) {
    const [query, setQuery] = useState("");
    const [companies, setCompanies] = useState([]);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const wrapperRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        getCompanies().then(setCompanies);
    }, []);

    useEffect(() => {
        const handleClick = (e) => {
            if (!wrapperRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const q = normalize(query);
    const results = q.length < 1 ? [] : companies
        .filter((row) =>
            normalize(row.name).includes(q) ||
            normalize(row.nativeSymbol).startsWith(q) ||
            normalize(row.symbol).startsWith(q)
        )
        .sort((a, b) => {
            // prefix matches on the name first
            const aPrefix = normalize(a.name).startsWith(q) ? 0 : 1;
            const bPrefix = normalize(b.name).startsWith(q) ? 0 : 1;
            return aPrefix - bPrefix || a.name.localeCompare(b.name);
        })
        .slice(0, 8);

    const select = (row) => {
        setQuery("");
        setOpen(false);
        if (onSelect) onSelect(row);
        else router.push(`/aktie/${encodeURIComponent(row.symbol)}`);
    };

    const handleKeyDown = (e) => {
        if (results.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            select(results[activeIndex] ?? results[0]);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-md font-sans">
            <div className="flex flex-row items-center gap-2 border border-border bg-foreground px-3">
                <FiSearch className="text-text-muted shrink-0" />
                <input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        setActiveIndex(0);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full py-2 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
                />
            </div>
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-foreground rounded-b-xl shadow-xl">
                    {results.map((row, idx) => (
                        <button
                            key={row.symbol}
                            onClick={() => select(row)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`w-full flex flex-row justify-between items-center px-3 py-2 text-left cursor-pointer ${idx === activeIndex ? "bg-background" : ""}`}
                        >
                            <span className="text-sm text-text">{row.name}</span>
                            <span className="text-xs text-text-muted">{row.nativeSymbol ?? row.symbol}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
