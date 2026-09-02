"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiSearch } from "react-icons/fi";
import { getCompanies } from "../utils/companies";

const POPULAR_SYMBOLS = [
    "INVE-B.ST",
    "VOLV-B.ST",
    "SAAB-B.ST",
    "ATCO-A.ST",
    "ERIC-B.ST",
];

const normalize = (value = "") => value.toLowerCase().trim();

export default function StockSearch({
    placeholder = "Sök aktie…",
    label = "Sök efter bolag eller ticker",
    onSelect,
    dropUp = false,
    autoFocus = false,
    showSuggestions = false,
    prominent = false,
    initialCompanies,
    className = "",
    fieldClassName = "border border-border px-3",
}) {
    const [query, setQuery] = useState("");
    const [companies, setCompanies] = useState(() => initialCompanies ?? []);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const wrapperRef = useRef(null);
    const router = useRouter();
    const id = useId().replaceAll(":", "");
    const listId = `stock-search-${id}`;

    useEffect(() => {
        if (initialCompanies?.length) {
            setCompanies(initialCompanies);
            return;
        }
        getCompanies().then(setCompanies);
    }, [initialCompanies]);

    useEffect(() => {
        const handleClick = (event) => {
            if (!wrapperRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const q = normalize(query);
    const results = useMemo(() => {
        if (q.length < 1) {
            if (!showSuggestions) return [];
            const companyBySymbol = new Map(companies.map((row) => [row.symbol, row]));
            return POPULAR_SYMBOLS.map((symbol) => companyBySymbol.get(symbol)).filter(Boolean);
        }

        return companies
            .filter((row) =>
                normalize(row.name).includes(q) ||
                normalize(row.nativeSymbol).startsWith(q) ||
                normalize(row.symbol).startsWith(q)
            )
            .sort((left, right) => {
                const leftNamePrefix = normalize(left.name).startsWith(q) ? 0 : 1;
                const rightNamePrefix = normalize(right.name).startsWith(q) ? 0 : 1;
                return leftNamePrefix - rightNamePrefix || left.name.localeCompare(right.name, "sv");
            })
            .slice(0, 8);
    }, [companies, q, showSuggestions]);

    const select = (row) => {
        setQuery("");
        setOpen(false);
        if (onSelect) onSelect(row);
        else router.push(`/aktie/${encodeURIComponent(row.symbol)}`);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            setOpen(false);
            return;
        }
        if (results.length === 0) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, results.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            select(results[activeIndex] ?? results[0]);
        }
    };

    const showPanel = open && (results.length > 0 || q.length > 0);

    return (
        <div
            ref={wrapperRef}
            className={`stock-search ${prominent ? "stock-search--prominent" : ""} ${className}`}
        >
            {prominent && <label htmlFor={`${listId}-input`}>{label}</label>}
            <div className={`stock-search__field ${fieldClassName}`}>
                <FiSearch aria-hidden="true" />
                <input
                    id={`${listId}-input`}
                    value={query}
                    autoFocus={autoFocus}
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={showPanel}
                    aria-controls={listId}
                    aria-activedescendant={showPanel && results[activeIndex]
                        ? `${listId}-${results[activeIndex].symbol}`
                        : undefined}
                    aria-label={prominent ? undefined : label}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                        setActiveIndex(0);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                />
                <span className="stock-search__hint" aria-hidden="true">Sök</span>
            </div>

            {showPanel && (
                <div className={`stock-search__results ${dropUp ? "stock-search__results--up" : ""}`}>
                    <div id={listId} role="listbox" aria-label={q ? "Sökresultat" : "Populära aktier"}>
                        {!q && results.length > 0 && (
                            <p className="stock-search__results-title">Populära aktier</p>
                        )}
                        {results.map((row, index) => (
                            <button
                                id={`${listId}-${row.symbol}`}
                                key={row.symbol}
                                type="button"
                                role="option"
                                aria-selected={index === activeIndex}
                                onClick={() => select(row)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={index === activeIndex ? "is-active" : ""}
                            >
                                <span>
                                    <strong>{row.name}</strong>
                                    <small>{row.nativeSymbol ?? row.symbol}</small>
                                </span>
                                <FiArrowRight aria-hidden="true" />
                            </button>
                        ))}
                        {q && results.length === 0 && (
                            <p className="stock-search__empty">Ingen aktie matchar “{query.trim()}”.</p>
                        )}
                    </div>
                    {showSuggestions && (
                        <Link href="/aktier" onClick={() => setOpen(false)} className="stock-search__all-link">
                            Bläddra bland alla aktier <FiArrowRight aria-hidden="true" />
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
