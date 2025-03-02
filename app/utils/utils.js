export const pnlColor = (value) => {
    if (value > 0) {
        return "text-primary";
    } else if (value < 0) {
        return "text-secondary";
    } else {
        return "text-text-muted";
    }
};

export const importanceColor = (importance) => {
    if (importance > 9) {
        return "text-red-500";
    } else if (importance > 7) {
        return "text-yellow-500";
    } else if (importance > 5) {
        return "text-green-500";
    } else if (importance > 3) {
        return "text-blue-500";
    } else if (importance > 1) {
        return "text-purple-500";
    } else {
        return "text-gray-500";
    }
};