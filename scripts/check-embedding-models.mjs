import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fetch from 'node-fetch';

async function listEmbeddingModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (!data.models) {
      console.error('No models found. Response:', JSON.stringify(data, null, 2));
      return;
    }

    const embeddingModels = data.models.filter(m => 
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes('embedContent')
    );

    console.log('Embedding-capable models:');
    embeddingModels.forEach(m => {
      console.log(`- ${m.name} (${m.displayName})`);
    });
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

listEmbeddingModels();
