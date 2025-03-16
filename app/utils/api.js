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

export async function getArticle(id) {
    try {
        const response = await fetch(`${API_URL}/data/${id}`);
        return response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function addEmail(mail) {
    console.log(mail)
    try {
        const res = await fetch(`${API_URL}/mail`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ mail })
        })
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function generateSummary(key, onProgress) {
    return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${API_URL}/tool/generate-summary?api-key=${key}`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'progress') {
                onProgress(data.message);
            } else if (data.type === 'complete') {
                eventSource.close();
                resolve(data.summary);
            } else {
                onProgress(data.message);
                console.log(data)
            }
        };

        eventSource.onerror = (error) => {
            eventSource.close();
            reject(new Error('SSE Error: ' + JSON.stringify(error)));
        };
    });

}