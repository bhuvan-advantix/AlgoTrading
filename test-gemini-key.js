
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_KEY = 'AIzaSyCKlsNISHYohKcoF_BA6bSPcVmYeBp5Iqw';

async function testKey() {
    console.log('Testing Gemini Key:', GEMINI_KEY);
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        console.log('Generating content...');
        const result = await model.generateContent("Say 'Hello from Gemini' if you can read this.");
        const response = await result.response;
        const text = response.text();

        console.log('SUCCESS! Response:', text);
    } catch (error) {
        console.error('FAILED:', error.message);
    }
}

testKey();
