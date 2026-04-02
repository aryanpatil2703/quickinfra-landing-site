import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function checkModels() {
  try {
    const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`)
      .then(r => r.json());
    
    console.log('Available models:', JSON.stringify(models, null, 2));
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

checkModels();
