export const pnlColor = (value) => {
    if (value > 0) {
        return "text-primary";
    } else if (value < 0) {
        return "text-secondary";
    } else {
        return "text-text-muted";
    }
};