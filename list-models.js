const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Load env
try {
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, ...values] = line.split('=');
            if (key && values.length > 0) {
                process.env[key.trim()] = values.join('=').trim().replace(/(^"|"$)/g, '');
            }
        });
    }
} catch (e) {
    console.error("Error loading .env.local", e);
}

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API KEY found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        // There isn't a direct helper in the high-level SDK for listing models easily in all versions, 
        // but we can try to hit the REST endpoint or use the model manager if exposed.
        // Actually, the node SDK does not have a simple listModels on genAI instance directly documentation wise easily accessible in this context without scanning types.
        // let's try a simple fetch to the API endpoint which is standard.

        // Fallback: simple fetch to v1beta list endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("--- Available Models ---");
        if (data.models) {
            data.models.forEach(m => {
                if (m.name.includes("flash") || m.name.includes("gemini")) {
                    console.log(m.name, m.supportedGenerationMethods);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }
    } catch (e) {
        console.error(e);
    }
}

listModels();
