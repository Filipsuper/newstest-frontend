export const pnlColor = (value) => {
    if (value > 0) {
        return "text-green-500";
    } else if (value < 0) {
        return "text-red-500";
    } else {
        return "text-gray-500";
    }
};