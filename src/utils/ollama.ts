export interface RequestOptions {
	model: string;
	messages: Message[];
	stream?: boolean;
}

export interface Message {
	role: 'user' | 'assistant' | 'system';
	content: string;
	isHtml?: boolean;
}

export async function checkOllama(): Promise<boolean> {
	try {
		const res = await fetch('/api/tags');
		return res.ok;
	} catch (e) {
		console.error('Ollama check failed', e);
		return false;
	}
}

export async function getTags(): Promise<string[]> {
	try {
		const res = await fetch('/api/tags');
		if (!res.ok) throw new Error('Failed to fetch tags');
		const data = await res.json();
		return data.models.map((m: any) => m.name);
	} catch (e) {
		console.error(e);
		return [];
	}
}

export async function chat(options: RequestOptions): Promise<Message> {
	const res = await fetch('/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...options, stream: false }),
	});

	if (!res.ok) {
		throw new Error(`Ollama API error: ${res.statusText}`);
	}

	const data = await res.json();
	return data.message;
}

export async function getReplacements(
	text: string,
	invalidWords: string[],
	model: string
): Promise<Record<string, string>> {
	if (invalidWords.length === 0) return {};

	const prompt = `
You are an assistant helping to simplify text to the 1000 most common English words.
The user provided the text: "${text}"
The following words are not in the 1000 common words list: ${invalidWords.join(
		', '
	)}

Please provide a common, simple replacement for each of these words that fits the context.
Return ONLY a JSON object mapping the original word to the replacement.
Example: { "exacerbate": "worsen", "utilize": "use" }
`;

	try {
		const res = await chat({
			model,
			messages: [{ role: 'user', content: prompt }],
		});

		// Parse JSON from response
		const jsonMatch = res.content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}
		return {};
	} catch (e) {
		console.error('Failed to get replacements', e);
		return {};
	}
}
