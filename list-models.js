
import fetch from 'node-fetch';

const GEMINI_KEY = 'AIzaSyCKlsNISHYohKcoF_BA6bSPcVmYeBp5Iqw';

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(m.name.replace('models/', ''));
                }
            });
        } else {
            console.log("ERROR:", JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listModels();
