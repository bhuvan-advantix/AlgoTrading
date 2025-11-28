const axios = require('axios');

// Set the base URL for the server
const BASE_URL = 'http://localhost:5000/api';

/**
 * Helper to test a single API endpoint.
 * @param {string} name - Test name
 * @param {string} url - Endpoint URL
 * @param {string} method - HTTP method ('GET' or 'POST')
 * @param {object} data - POST data
 */
async function runTest(name, url, method = 'GET', data = {}) {
    console.log(`\n--- Running Test: ${name} (${url}) ---`);
    try {
        const config = {
            method: method,
            url: `${BASE_URL}${url}`,
            data: data,
            timeout: 15000
        };

        const response = await axios(config);
        
        if (response.data.success) {
            console.log(`✅ SUCCESS: ${name} returned data.`);
            if (response.data.data) {
                // Display a snippet of the returned data
                const dataSnippet = JSON.stringify(response.data.data).substring(0, 150) + '...';
                console.log(`   Provider: ${response.data.provider || 'N/A'}`);
                console.log(`   Data Snippet: ${dataSnippet}`);
            } else if (response.data.order) {
                console.log(`   Trade Attempt Response: ${JSON.stringify(response.data.order)}`);
            }
        } else {
            console.log(`❌ FAILURE: ${name} reported an issue.`);
            console.log('   Error:', response.data.error || 'Unknown error');
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ CRITICAL ERROR: Server not running. Please start server.js first.');
        } else if (error.response) {
            console.log(`❌ HTTP Error (${error.response.status}): ${error.response.statusText}`);
            console.log('   Details:', error.response.data || 'No response data.');
        } else {
            console.log(`❌ ERROR: ${error.message}`);
        }
    }
}

async function main() {
    await runTest('Global & Indian News Feed', '/news');
    await runTest('Indian Live Data (TCS)', '/liveData/india?symbol=TCS');
    await runTest('Global Live Data (AAPL)', '/liveData/global?symbol=AAPL');

    // --- Trading Test ---
    console.log('\n=================================================');
    console.log('⚠ WARNING: Testing Trade Functionality');
    console.log('This test will likely fail unless you have logged into Zerodha/Kite and saved a valid access_token.txt.');
    console.log('=================================================');
    
    await runTest('Place Trade Order (Mock)', '/autoTrade', 'POST', {
        symbol: 'RELIANCE', 
        action: 'BUY', 
        quantity: 1,
        price: 0 // Market Order
    });

    console.log('\n--- Testing Complete ---');
}

main();
