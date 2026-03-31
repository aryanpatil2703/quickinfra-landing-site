import { loadAllWhitepapers } from './pdf-parser';
import path from 'path';
import fs from 'fs';
import { POSTS } from '@/app/blogs/data';

/**
 * Splits document text into manageable chunks.
 */
export function splitTextIntoChunks(text, source, chunkSize = 1000) {
  // Split on paragraph boundaries
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunkText = '';

  for (const paragraph of paragraphs) {
    if ((currentChunkText.length + paragraph.length) > chunkSize && currentChunkText.length > 0) {
      chunks.push({ text: currentChunkText.trim(), source });
      currentChunkText = paragraph;
    } else {
      currentChunkText += (currentChunkText ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunkText.trim().length > 0) {
    chunks.push({ text: currentChunkText.trim(), source });
  }

  return chunks;
}

/**
 * Recursively loads all .txt files from a directory.
 * Returns array of { filename, text, category }.
 */
function loadAllDocs(dirPath) {
  const results = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        results.push(...loadAllDocs(fullPath));
      } else if (entry.name.toLowerCase().endsWith('.txt')) {
        try {
          const text = fs.readFileSync(fullPath, 'utf-8');
          // Use the parent folder name as category context
          const category = path.basename(path.dirname(fullPath));
          results.push({ filename: entry.name, text, category });
        } catch (err) {
          console.error(`Error reading doc ${fullPath}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading docs directory ${dirPath}:`, err);
  }

  return results;
}

// In-memory cache for loaded document chunks
let allChunksCache = null;

/**
 * Extracts key terms from a search query for naive matching.
 */
export function extractKeywords(query) {
  const stopWords = new Set([
    'the', 'is', 'in', 'it', 'a', 'to', 'and', 'of', 'for', 'with', 'on', 'as', 'at', 'by', 
    'this', 'that', 'are', 'can', 'be', 'how', 'what', 'why', 'do', 'does', 'did', 'about'
  ]);
  const words = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  return words.filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Finds the most relevant chunks in the documents for a given query.
 */
export async function getRelevantContext(query, maxChunks = 4) {
  if (!allChunksCache) {
    allChunksCache = [];

    // 1. Load Whitepapers (PDFs)
    const whitepapersDir = path.join(process.cwd(), 'public', 'whitepapers');
    const documents = await loadAllWhitepapers(whitepapersDir);
    for (const doc of documents) {
      allChunksCache.push(...splitTextIntoChunks(doc.text, `Whitepaper: ${doc.filename}`));
    }
    
    // 2. Load Blog Data
    for (const post of POSTS) {
      const fullText = `${post.title}\n\n${post.excerpt}\n\n${post.content}`;
      allChunksCache.push(...splitTextIntoChunks(fullText, `Blog: ${post.title}`));
    }

    // 3. Load Platform Docs (txt files from public/Docs)
    const docsDir = path.join(process.cwd(), 'public', 'Docs');
    const docFiles = loadAllDocs(docsDir);
    for (const doc of docFiles) {
      const sourceName = doc.filename.replace('.txt', '').replace(/_/g, ' ');
      allChunksCache.push(...splitTextIntoChunks(doc.text, `Docs/${doc.category}: ${sourceName}`));
    }

    console.log(`[Retrieval] Loaded ${allChunksCache.length} total chunks (Whitepapers + Blogs + Docs)`);
  }

  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];
  
  const scoredChunks = allChunksCache.map(chunk => {
    let score = 0;
    const chunkLower = chunk.text.toLowerCase();
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const matches = chunkLower.match(regex);
      if (matches) {
        score += matches.length; 
      }
    }
    return { chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);

  const topMatches = scoredChunks.filter(sc => sc.score > 0).slice(0, maxChunks);
  
  return topMatches.map(sc => sc.chunk);
}
