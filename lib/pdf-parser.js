import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set worker path manually for Node.js environment (must be file:// URL on Windows)
if (typeof window === 'undefined') {
  const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
}

let cachedTexts = null;

export async function extractTextFromPDF(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument(data);
  const pdfDocument = await loadingTask.promise;

  let text = '';
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .filter((item) => 'str' in item)
      .map((item) => item.str)
      .join(' ');
    text += pageText + '\n';
  }
  return text;
}

export async function loadAllWhitepapers(whitepapersDir) {
  if (cachedTexts) {
    return Array.from(cachedTexts.entries()).map(([filename, text]) => ({ filename, text }));
  }

  const results = [];
  cachedTexts = new Map();

  try {
    const files = fs.readdirSync(whitepapersDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    for (const file of pdfFiles) {
      const filePath = path.join(whitepapersDir, file);
      try {
        const text = await extractTextFromPDF(filePath);
        results.push({ filename: file, text });
        cachedTexts.set(file, text);
      } catch (err) {
        console.error(`Error parsing PDF ${file}:`, err);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${whitepapersDir}:`, err);
  }

  return results;
}
