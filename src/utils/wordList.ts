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

import { getEmbeddings } from './ollama';

import { getCachedEmbeddings, saveCachedEmbeddings } from './db';

const wordEmbeddings = new Map<string, number[]>();
const wordsArray: string[] = []; // Keep an array for easier iteration/batching

export async function initWordEmbeddings(
	model: string,
	onProgress?: (count: number, total: number) => void
) {
	if (wordsArray.length === 0) initWordList();

	// Check if already loaded in memory for this model?
	// The current implementation is simple global state.
	// If switching models, we should probably clear the map or check if it matches.
	// For now, let's assume we clear it if the model is deemed "new" (but we don't track which model generated current loaded data).
	// To be safe, let's clear it if we are calling init again.
	wordEmbeddings.clear();

	// Check DB
	const cached = await getCachedEmbeddings(model);
	if (cached) {
		console.log(`Loaded embeddings for ${model} from IndexedDB.`);
		for (const [word, emb] of Object.entries(cached)) {
			wordEmbeddings.set(word, emb);
		}
		if (onProgress) onProgress(wordsArray.length, wordsArray.length);
		return;
	}

	console.log(`Generating embeddings for ${model}...`);
	const BATCH_SIZE = 100;
	let processed = 0;
	// Temporary object to store for DB save
	const embeddingsToSave: Record<string, number[]> = {};

	for (let i = 0; i < wordsArray.length; i += BATCH_SIZE) {
		const batch = wordsArray.slice(i, i + BATCH_SIZE);
		try {
			const embeddings = await getEmbeddings(batch, model);
			if (embeddings.length !== batch.length) {
				console.error(
					'Mismatch in embedding count',
					batch.length,
					embeddings.length
				);
				continue;
			}
			batch.forEach((word, idx) => {
				const emb = embeddings[idx];
				if (emb) {
					wordEmbeddings.set(word, emb);
					embeddingsToSave[word] = emb;
				}
			});
		} catch (e) {
			console.error('Failed to load embeddings for batch', i, e);
		}
		processed += batch.length;
		if (onProgress) onProgress(processed, wordsArray.length);
	}

	// Save to DB
	await saveCachedEmbeddings(model, embeddingsToSave);
	console.log(`Loaded and saved embeddings for ${wordEmbeddings.size} words.`);
}

export function findClosestWord(targetEmbedding: number[]): string | null {
	if (wordEmbeddings.size === 0) return null;

	let maxSim = -1;
	let bestWord: string | null = null;

	// Cosine similarity
	// sim = (A . B) / (|A| * |B|)
	// We assume Ollama embeddings might not be normalized, so we normalize.

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
