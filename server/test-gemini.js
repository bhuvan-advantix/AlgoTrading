import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyDDmsSvwFfqN36Cz4vvw_uOwOzvYOKnXis';
const genAI = new GoogleGenerativeAI(API_KEY);

async function testGeneration() {
    try {
        console.log('Testing generation with gemini-2.0-flash...');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent('Hello');
        console.log('Success! Response:', result.response.text());
    } catch (error) {
        console.error('Failed with gemini-2.0-flash:', error.message);
    }
}

testGeneration();
