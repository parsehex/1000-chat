import ollama from 'ollama/browser';

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
		// Just try to list models to see if it's up
		await ollama.list();
		return true;
	} catch (e) {
		console.error('Ollama check failed', e);
		return false;
	}
}

export async function getTags(): Promise<string[]> {
	try {
		const res = await ollama.list();
		return res.models.map((m) => m.name);
	} catch (e) {
		console.error(e);
		return [];
	}
}

export async function chat(options: RequestOptions): Promise<Message> {
	const response = await ollama.chat({
		model: options.model,
		messages: options.messages.map((m) => ({
			role: m.role,
			content: m.content,
		})),
		stream: false,
	});

	return {
		role: response.message.role as 'user' | 'assistant' | 'system',
		content: response.message.content,
	};
}

export async function getEmbeddings(
	texts: string[],
	model: string
): Promise<number[][]> {
	try {
		// ollama.embed supports batching
		const response = await ollama.embed({
			model: 'embeddinggemma:latest', // hardcode for now
			input: texts,
		});
		return response.embeddings;
	} catch (e) {
		console.error('Failed to get embeddings', e);
		throw e;
	}
}
