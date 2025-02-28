import axios from "axios";
import { configDotenv } from "dotenv";
configDotenv();

const API_URL = process.env.API_URL;

axios.defaults.baseURL = API_URL;

export async function fetchArticle() {
    try {
        const response = await axios.get("/data");
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}