import Dexie from "dexie";

// --- Dexie initialization ---------------------------------------------------
export const db = new Dexie("posawesome_offline");
db.version(1).stores({ keyval: "&key" });

let persistWorker = null;

if (typeof Worker !== "undefined") {
	try {
                // Load the worker without a query string so the service worker
                // can serve the cached version when offline.
                const workerUrl = "/assets/posawesome/js/posapp/workers/itemWorker.js";
                persistWorker = new Worker(workerUrl, { type: "classic" });
	} catch (e) {
		console.error("Failed to init persist worker", e);
		persistWorker = null;
	}
}


// Persist queue for batching operations
const persistQueue = {};
let persistTimeout = null;

export function addToPersistQueue(key, value) {
	persistQueue[key] = value;
	
	if (!persistTimeout) {
		persistTimeout = setTimeout(flushPersistQueue, 100);
	}
}

function flushPersistQueue() {
	const keys = Object.keys(persistQueue);
	if (keys.length) {
		keys.forEach(key => {
			persist(key, persistQueue[key]);
			delete persistQueue[key];
		});
	}
	persistTimeout = null;
}

export function persist(key, value) {
        if (persistWorker) {
                let cleanValue = value;
                try {
                        cleanValue = JSON.parse(JSON.stringify(value));
                } catch (e) {
                        console.error("Failed to serialize", key, e);
                }
                try {
                        persistWorker.postMessage({ type: "persist", key, value: cleanValue });
                } catch (e) {
                        console.error(`Failed to postMessage for ${key}`, e);
                }
                return;
        }

        db.table("keyval")
                .put({ key, value })
                .catch((e) => console.error(`Failed to persist ${key}`, e));

        if (typeof localStorage !== "undefined" && key !== "price_list_cache") {
                try {
                        localStorage.setItem(`posa_${key}`, JSON.stringify(value));
                } catch (err) {
                        console.error("Failed to persist", key, "to localStorage", err);
                }
	}
}

export const initPromise = new Promise((resolve) => {
	const init = async () => {
		try {
			await db.open();
			// Initialization will be handled by the cache.js module
			resolve();
		} catch (e) {
			console.error("Failed to initialize offline DB", e);
			resolve(); // Resolve anyway to prevent blocking
		}
	};

	if (typeof requestIdleCallback === "function") {
		requestIdleCallback(init);
	} else {
		setTimeout(init, 0);
	}
});
