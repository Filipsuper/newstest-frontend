// Reader presentation only. Never change saved dates, claims or source bindings.
const months = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli',
    'augusti', 'september', 'oktober', 'november', 'december'];

function calendarDay(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1) return null;
    return { year, month, day };
}

const fullDay = day => `${day.day} ${months[day.month - 1]} ${day.year}`;

export function storyDateDisplay(value) {
    const day = calendarDay(value);
    return day ? fullDay(day) : value;
}

export function storyPeriodDisplay(period) {
    if (!period?.end) return period?.label || '';
    if (!period.start) return storyDateDisplay(period.end);
    const start = calendarDay(period.start), end = calendarDay(period.end);
    if (!start || !end || period.start > period.end) return `${period.start}–${period.end}`;
    if (period.start === period.end) return fullDay(end);
    if (start.year !== end.year) return `${fullDay(start)}–${fullDay(end)}`;
    if (start.month === end.month) return `${start.day}–${fullDay(end)}`;
    return `${start.day} ${months[start.month - 1]}–${fullDay(end)}`;
}

// Match whole calendar dates/ranges only, not timestamps, URLs or identifiers.
const dateTokens = /https?:\/\/[^\s]+|(?<![\p{L}\p{N}_/-])(\d{4}-\d{2}-\d{2})(?:[ \t]*[–-][ \t]*(\d{4}-\d{2}-\d{2}))?(?![\p{L}\p{N}_/]|\.[\p{L}\p{N}]|[ \t]*[–-][ \t]*\d{4}-\d{2}-\d{2})/gu;

export function storyTextDateDisplay(text) {
    if (typeof text !== 'string') return text;
    return text.replace(dateTokens, (original, start, end) => {
        if (!calendarDay(start) || (end && (!calendarDay(end) || start > end))) return original;
        return end ? storyPeriodDisplay({ start, end }) : storyDateDisplay(start);
    });
}

export function storyParagraphDateDisplay(paragraph) {
    // An original excerpt is a quotation, not editorially reformatted prose.
    return paragraph.kind === 'source_excerpt' ? paragraph.text : storyTextDateDisplay(paragraph.text);
}
