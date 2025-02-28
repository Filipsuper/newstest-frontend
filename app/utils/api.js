const API_URL = import.meta.env.VITE_API_URL;

export async function fetchArticle() {
    try {
        const response = await fetch(`${API_URL}/data`);
        return response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}