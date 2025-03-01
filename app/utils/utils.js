export const pnlColor = (value) => {
    if (value > 0) {
        return "text-emerald-500";
    } else if (value < 0) {
        return "text-amber-500";
    } else {
        return "text-gray-500";
    }
};