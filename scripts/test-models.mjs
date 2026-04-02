import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listAllModels() {
  try {
    // There is no listModels on genAI in the latest SDK version I think? 
    // Wait, let's check the SDK docs.
    // Actually, I'll just try to embed a small string with several common model names.
    const models = ['text-embedding-004', 'embedding-001', 'models/text-embedding-004', 'models/embedding-001'];
    
    for (const modelName of models) {
      try {
        console.log(`Testing model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.embedContent('test');
        console.log(`Success! ${modelName} works. Dimensions: ${result.embedding.values.length}`);
      } catch (err) {
        console.log(`Failed: ${modelName}. Error: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Error in test script:', err);
  }
}

listAllModels();
