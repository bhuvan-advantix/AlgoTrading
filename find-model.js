
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_KEY = 'AIzaSyCKlsNISHYohKcoF_BA6bSPcVmYeBp5Iqw';
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const models = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
    "gemini-pro"
];

async function findWorkingModel() {
    for (const modelName of models) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            await model.generateContent("Hi");
            console.log(`✅ FOUND WORKING MODEL: ${modelName}`);
            return;
        } catch (e) {
            console.log(`❌ ${modelName} failed`);
        }
    }
    console.log("No working models found in list.");
}

findWorkingModel();
