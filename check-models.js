
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

const GEMINI_KEY = 'AIzaSyCKlsNISHYohKcoF_BA6bSPcVmYeBp5Iqw';
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

async function checkModels() {
    console.log('Checking available models for API Key...');

    // 1. Try a simple generation with 'gemini-1.5-flash' (current standard)
    try {
        console.log("\n--- Testing 'gemini-1.5-flash' ---");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Test");
        console.log("✅ gemini-1.5-flash IS WORKING. Response:", result.response.text());
    } catch (e) {
        console.log("❌ gemini-1.5-flash failed:", e.message.split('[')[0]); // Log brief error
    }

    // 2. Try 'gemini-pro' (older standard)
    try {
        console.log("\n--- Testing 'gemini-pro' ---");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Test");
        console.log("✅ gemini-pro IS WORKING. Response:", result.response.text());
    } catch (e) {
        console.log("❌ gemini-pro failed:", e.message.split('[')[0]);
    }

    // 3. List all models via REST API to see what IS available
    console.log("\n--- Listing All Available Models (REST API) ---");
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            const generateModels = data.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"));
            console.log(`Found ${generateModels.length} models that support content generation:`);
            generateModels.forEach(m => console.log(`- ${m.name.replace('models/', '')}`));
        } else {
            console.log("Could not list models. Response:", JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error listing models:', error.message);
    }
}

checkModels();
