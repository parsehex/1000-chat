const DB_NAME = '1000ChatDB';
const DB_VERSION = 1;
const STORE_NAME = 'embeddings';

export async function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'model' });
			}
		};
	});
}

export async function getCachedEmbeddings(
	model: string
): Promise<Record<string, number[]> | null> {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], 'readonly');
			const store = transaction.objectStore(STORE_NAME);
			const request = store.get(model);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				resolve(request.result ? request.result.data : null);
			};
		});
	} catch (e) {
		console.error('Failed to get from DB', e);
		return null;
	}
}

export async function saveCachedEmbeddings(
	model: string,
	embeddings: Record<string, number[]>
): Promise<void> {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], 'readwrite');
			const store = transaction.objectStore(STORE_NAME);
			const request = store.put({ model, data: embeddings });

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	} catch (e) {
		console.error('Failed to save to DB', e);
	}
}
