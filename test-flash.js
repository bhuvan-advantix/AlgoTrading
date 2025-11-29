
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_KEY = 'AIzaSyCKlsNISHYohKcoF_BA6bSPcVmYeBp5Iqw';
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

async function testFlash() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hi");
        console.log("SUCCESS: gemini-1.5-flash works!");
    } catch (e) {
        console.log("FAIL: gemini-1.5-flash error:", e.message);
    }
}

testFlash();
