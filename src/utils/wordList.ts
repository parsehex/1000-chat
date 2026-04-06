import rawWords from '@/assets/words.txt?raw';

const wordsSet = new Set<string>();

export function initWordList() {
	if (wordsSet.size > 0) return;

	const lines = rawWords.split('\n');
	for (const line of lines) {
		const word = line.trim().toLowerCase();
		if (word) {
			wordsSet.add(word);
			wordsArray.push(word);
		}
	}
	console.log(`Loaded ${wordsSet.size} words.`);
}

export function isValid(word: string): boolean {
	if (wordsSet.size === 0) initWordList();
	// Simple check: lowercase and exact match
	// In a real app we might want to handle plurals or stems, but strict 1k list usually implies strict match or simple variations.
	// We'll strip punctuation for the check but the input word might have them.
	const clean = word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
	if (!clean) return true; // Signs/numbers pass or fail? "1000 chat" -> "1000" is not in list probably.
	// Actually, the list has "1000" as "thousand"?
	// Let's assume strict match against the list for now.
	return wordsSet.has(clean);
}

import { pipeline, env } from '@huggingface/transformers';

// Force usage of remote models since we don't have them locally
env.allowLocalModels = false;
env.useBrowserCache = false;
import { getCachedEmbeddings, saveCachedEmbeddings } from './db';

const wordEmbeddings = new Map<string, number[]>();
const wordsArray: string[] = []; // Keep an array for easier iteration/batching

// Hardcoded model for browser
const BROWSER_MODEL = 'Xenova/all-MiniLM-L6-v2';

export async function initBrowserEmbeddings(
	onProgress?: (count: number, total: number) => void
) {
	if (wordsArray.length === 0) initWordList();

	// Check DB
	const cached = await getCachedEmbeddings(BROWSER_MODEL);
	if (cached) {
		console.log(`Loaded embeddings for ${BROWSER_MODEL} from IndexedDB.`);
		for (const [word, emb] of Object.entries(cached)) {
			wordEmbeddings.set(word, emb);
		}
		if (onProgress) onProgress(wordsArray.length, wordsArray.length);
		return;
	}

	console.log(`Loading model ${BROWSER_MODEL}...`);
	// Initialize pipeline
	const extractor = await pipeline('feature-extraction', BROWSER_MODEL);

	console.log(`Generating embeddings for ${wordsArray.length} words...`);

	const embeddingsToSave: Record<string, number[]> = {};
	let processed = 0;

	// Process one by one or small batches to keep UI responsive
	// Transformers.js is fast, but 1000 items might block a bit.
	// Let's do batches of 10.
	const BATCH_SIZE = 10;

	for (let i = 0; i < wordsArray.length; i += BATCH_SIZE) {
		const batch = wordsArray.slice(i, i + BATCH_SIZE);

		// Run inference
		// pipeline input can be array of strings
		const output = await extractor(batch, { pooling: 'mean', normalize: true });
		// output is a Tensor of shape [batch_size, hidden_size]
		// We need to extract rows.

		// output.data is a Float32Array.
		// output.dims is [n_sentences, embedding_dim]
		const embeddingDim = output.dims ? output.dims[1] : 384;

		for (let j = 0; j < batch.length; j++) {
			if (!embeddingDim) continue;
			const startStr = j * embeddingDim;
			const endStr = startStr + embeddingDim;
			const emb = Array.from(output.data.slice(startStr, endStr)) as number[];

			const word = batch[j];
			if (word) {
				wordEmbeddings.set(word, emb);
				embeddingsToSave[word] = emb;
			}
		}

		processed += batch.length;
		if (onProgress) onProgress(processed, wordsArray.length);

		// Yield to main thread every few batches
		if (i % 50 === 0) await new Promise((r) => setTimeout(r, 0));
	}

	// Save to DB
	await saveCachedEmbeddings(BROWSER_MODEL, embeddingsToSave);
	console.log(`Loaded and saved embeddings for ${wordEmbeddings.size} words.`);
}

export async function getBrowserEmbedding(
	text: string
): Promise<number[] | null> {
	try {
		const extractor = await pipeline('feature-extraction', BROWSER_MODEL);
		const output = await extractor(text, { pooling: 'mean', normalize: true });
		return Array.from(output.data) as number[];
	} catch (e) {
		console.error('Single embedding failed', e);
		return null;
	}
}

export function findClosestWord(targetEmbedding: number[]): string | null {
	if (wordEmbeddings.size === 0) return null;

	let maxSim = -1;
	let bestWord: string | null = null;

	// Cosine similarity
	// Since we normalized in pipeline ({ normalize: true }), we can just do dot product?
	// Yes, if vectors are unit vectors, dot product == cosine similarity.
	// We already normalized the targetEmbedding if it comes from getBrowserEmbedding with normalize: true.
	// But let's be safe and compute full cosine just in case inputs vary.

	const normTarget = magnitude(targetEmbedding);

	for (const [word, emb] of wordEmbeddings) {
		const sim =
			dotProduct(targetEmbedding, emb) / (normTarget * magnitude(emb));
		if (sim > maxSim) {
			maxSim = sim;
			bestWord = word;
		}
	}

	return bestWord;
}

function dotProduct(a: number[], b: number[]): number {
	return a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
}

function magnitude(v: number[]): number {
	return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

// ... existing code ...
export function searchReplacement(_word: string): string | null {
	// Deprecated in favor of direct embedding usage in ChatView
	return null;
}
