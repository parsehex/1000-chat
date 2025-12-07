import rawWords from '@/assets/words.txt?raw';

const wordsSet = new Set<string>();

export function initWordList() {
	if (wordsSet.size > 0) return;

	const lines = rawWords.split('\n');
	for (const line of lines) {
		const word = line.trim().toLowerCase();
		if (word) {
			wordsSet.add(word);
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

export function searchReplacement(_word: string): string | null {
	// Placeholder for embeddings search
	return null;
}
