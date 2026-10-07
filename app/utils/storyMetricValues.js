// Typed values for reader facts. Ranges remain ranges and cannot become a line
// point or a scalar midpoint. Roles/conditions are still independently reviewed.
const finite = value => typeof value === 'number' && Number.isFinite(value);
const year = value => Number.isInteger(value) && value >= 1900 && value <= 2200;
const isoDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export function validStoryMetricValue(metric) {
    if (!metric || typeof metric !== 'object') return false;
    const { value, unit, currency } = metric;
    if (['money', 'money_per_share'].includes(unit)) return finite(value) && typeof currency === 'string' && /^[A-Z]{3}$/.test(currency);
    if (currency != null) return false;
    if (unit === 'date') return isoDate(value);
    if (unit === 'year') return year(value);
    if (['percent_range', 'year_range'].includes(unit)) {
        const valid = unit === 'year_range' ? year : finite;
        return value !== null && typeof value === 'object' && !Array.isArray(value)
            && Object.keys(value).length === 2 && Object.hasOwn(value, 'lower') && Object.hasOwn(value, 'upper')
            && valid(value.lower) && valid(value.upper) && value.lower <= value.upper;
    }
    return ['percent', 'shares', 'months', 'units', 'trading_days', 'MWp', 'GWp'].includes(unit) && finite(value);
}

const number = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 });
const dateDisplay = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export function storyMetricDisplay(metric) {
    if (!validStoryMetricValue(metric)) return '—';
    const { value, unit, currency } = metric;
    if (unit === 'date') return dateDisplay.format(new Date(value));
    if (unit === 'year') return String(value);
    if (unit === 'year_range') return `${value.lower}–${value.upper}`;
    if (unit === 'percent_range') return `${number.format(value.lower)}–${number.format(value.upper)} %`;
    const suffix = { percent: ' %', months: ' månader', trading_days: ' handelsdagar', MWp: ' MWp', GWp: ' GWp' }[unit] || '';
    return `${number.format(value)}${currency ? ` ${currency}${unit === 'money_per_share' ? ' / aktie' : ''}` : suffix}`;
}
