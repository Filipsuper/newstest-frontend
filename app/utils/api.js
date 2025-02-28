import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

axios.defaults.baseURL = API_URL;

console.log("API_URL", API_URL);

export async function fetchArticle() {
    try {
        const response = await axios.get("/data");
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}