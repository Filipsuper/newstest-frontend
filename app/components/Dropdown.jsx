"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown } from "react-icons/fi";

function flattenOptions(options, groups) {
    if (groups?.length) {
        return groups.flatMap((group) => group.options.map((option) => ({ ...option, group: group.label })));
    }
    return options ?? [];
}

export default function Dropdown({ value, onChange, options, groups, ariaLabel }) {
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const listId = useId();
    const items = useMemo(() => flattenOptions(options, groups), [options, groups]);
    const selectedIndex = Math.max(0, items.findIndex((option) => option.value === value));
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(selectedIndex);
    const [menuPosition, setMenuPosition] = useState(null);
    const selected = items.find((option) => option.value === value) ?? items[0];

    const updateMenuPosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const gap = 5;
        const viewportPadding = 10;
        const roomBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
        const roomAbove = rect.top - gap - viewportPadding;
        const openUpward = roomBelow < 190 && roomAbove > roomBelow;
        const available = Math.max(100, openUpward ? roomAbove : roomBelow);
        setMenuPosition({
            left: rect.left,
            width: rect.width,
            maxHeight: Math.min(230, available),
            ...(openUpward
                ? { bottom: window.innerHeight - rect.top + gap }
                : { top: rect.bottom + gap }),
        });
    }, []);

    useLayoutEffect(() => {
        if (open) updateMenuPosition();
    }, [open, updateMenuPosition]);

    useEffect(() => {
        if (!open) return undefined;
        setActiveIndex(selectedIndex);
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", updateMenuPosition);
        window.addEventListener("scroll", updateMenuPosition, true);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", updateMenuPosition);
            window.removeEventListener("scroll", updateMenuPosition, true);
        };
    }, [open, selectedIndex, updateMenuPosition]);

    const selectAt = (index) => {
        const option = items[index];
        if (!option) return;
        onChange(option.value);
        setOpen(false);
    };

    const handleKeyDown = (event) => {
        if (!items.length) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
                setOpen(true);
                setActiveIndex(selectedIndex);
                return;
            }
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((current) => (current + direction + items.length) % items.length);
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) selectAt(activeIndex);
            else setOpen(true);
            return;
        }
        if (event.key === "Escape") setOpen(false);
    };

    let previousGroup = null;

    return (
        <div className={`omx-dropdown ${open ? "is-open" : ""}`} ref={rootRef}>
            <button
                type="button"
                className="omx-dropdown-trigger"
                ref={triggerRef}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
                onClick={() => setOpen((current) => !current)}
                onKeyDown={handleKeyDown}
            >
                <span>{selected?.label ?? "Välj"}</span>
                <FiChevronDown aria-hidden="true" />
            </button>
            {open && menuPosition && createPortal(
                <div
                    id={listId}
                    ref={menuRef}
                    className="omx-dropdown-menu"
                    role="listbox"
                    aria-label={ariaLabel}
                    style={menuPosition}
                >
                    {items.map((option, index) => {
                        const showGroup = option.group && option.group !== previousGroup;
                        previousGroup = option.group ?? null;
                        const isSelected = option.value === value;
                        return (
                            <div key={`${option.group ?? "option"}-${option.value}`}>
                                {showGroup && <div className="omx-dropdown-group">{option.group}</div>}
                                <button
                                    id={`${listId}-${index}`}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`omx-dropdown-option ${activeIndex === index ? "is-active" : ""}`}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => selectAt(index)}
                                >
                                    <span>{option.label}</span>
                                    {isSelected && <FiCheck aria-hidden="true" />}
                                </button>
                            </div>
                        );
                    })}
                </div>,
                document.body,
            )}
        </div>
    );
}
