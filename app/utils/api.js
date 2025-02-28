import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;


export async function fetchArticle() {
    try {
        const response = await axios.get(`${API_URL}/data`);
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}