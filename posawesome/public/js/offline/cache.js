import { db, persist } from './core.js';

// Memory cache object
export const memory = {
	offline_invoices: [],
	offline_customers: [],
	offline_payments: [],
	pos_last_sync_totals: { pending: 0, synced: 0, drafted: 0 },
	uom_cache: {},
	offers_cache: [],
	customer_balance_cache: {},
	local_stock_cache: {},
	stock_cache_ready: false,
	items_storage: [],
	customer_storage: [],
	pos_opening_storage: null,
	opening_dialog_storage: null,
	sales_persons_storage: [],
	price_list_cache: {},
	item_details_cache: {},
	manual_offline: false,
};

// Initialize memory from IndexedDB
(async () => {
	try {
		for (const key of Object.keys(memory)) {
			const stored = await db.table("keyval").get(key);
			if (stored && stored.value !== undefined) {
				memory[key] = stored.value;
				continue;
			}
			if (typeof localStorage !== "undefined") {
				const ls = localStorage.getItem(`posa_${key}`);
				if (ls) {
					try {
						memory[key] = JSON.parse(ls);
						continue;
					} catch (err) {
						console.error("Failed to parse localStorage for", key, err);
					}
				}
			}
		}
	} catch (e) {
		console.error("Failed to initialize memory from DB", e);
	}
})();

// Reset cached invoices and customers after syncing
export function resetOfflineState() {
	memory.offline_invoices = [];
	memory.offline_customers = [];
	memory.offline_payments = [];
	memory.pos_last_sync_totals = { pending: 0, synced: 0, drafted: 0 };

	persist("offline_invoices", memory.offline_invoices);
	persist("offline_customers", memory.offline_customers);
	persist("offline_payments", memory.offline_payments);
	persist("pos_last_sync_totals", memory.pos_last_sync_totals);
}

// --- Generic getters and setters for cached data ----------------------------
export function getItemsStorage() {
	return memory.items_storage || [];
}

export function setItemsStorage(items) {
	try {
		memory.items_storage = JSON.parse(JSON.stringify(items));
	} catch (e) {
		console.error("Failed to serialize items for storage", e);
		memory.items_storage = [];
	}
	persist("items_storage", memory.items_storage);
}

export function getCustomerStorage() {
	return memory.customer_storage || [];
}

export function setCustomerStorage(customers) {
	memory.customer_storage = customers;
	persist("customer_storage", memory.customer_storage);
}

export function getSalesPersonsStorage() {
	return memory.sales_persons_storage || [];
}

export function setSalesPersonsStorage(data) {
	try {
		memory.sales_persons_storage = JSON.parse(JSON.stringify(data));
		persist("sales_persons_storage", memory.sales_persons_storage);
	} catch (e) {
		console.error("Failed to set sales persons storage", e);
	}
}

export function getOpeningStorage() {
	return memory.pos_opening_storage || null;
}

export function setOpeningStorage(data) {
	try {
		memory.pos_opening_storage = JSON.parse(JSON.stringify(data));
		persist("pos_opening_storage", memory.pos_opening_storage);
	} catch (e) {
		console.error("Failed to set opening storage", e);
	}
}

export function clearOpeningStorage() {
	try {
		memory.pos_opening_storage = null;
		persist("pos_opening_storage", memory.pos_opening_storage);
	} catch (e) {
		console.error("Failed to clear opening storage", e);
	}
}

export function getOpeningDialogStorage() {
	return memory.opening_dialog_storage || null;
}

export function setOpeningDialogStorage(data) {
	try {
		memory.opening_dialog_storage = JSON.parse(JSON.stringify(data));
		persist("opening_dialog_storage", memory.opening_dialog_storage);
	} catch (e) {
		console.error("Failed to set opening dialog storage", e);
	}
}

export function setLastSyncTotals(totals) {
	memory.pos_last_sync_totals = totals;
	persist("pos_last_sync_totals", memory.pos_last_sync_totals);
}

export function getLastSyncTotals() {
	return memory.pos_last_sync_totals;
}

export function isManualOffline() {
	return memory.manual_offline || false;
}

export function setManualOffline(state) {
	memory.manual_offline = !!state;
	persist("manual_offline", memory.manual_offline);
}

export function toggleManualOffline() {
	setManualOffline(!memory.manual_offline);
}

export async function clearAllCache() {
	try {
		if (db.isOpen()) {
			await db.close();
		}
		await Dexie.delete('posawesome_offline');
		await db.open();
	} catch (e) {
		console.error('Failed to clear IndexedDB cache', e);
	}

	if (typeof localStorage !== 'undefined') {
		Object.keys(localStorage).forEach((key) => {
			if (key.startsWith('posa_')) {
				localStorage.removeItem(key);
			}
		});
	}

	memory.offline_invoices = [];
	memory.offline_customers = [];
	memory.offline_payments = [];
	memory.pos_last_sync_totals = { pending: 0, synced: 0, drafted: 0 };
	memory.uom_cache = {};
	memory.offers_cache = [];
	memory.customer_balance_cache = {};
	memory.local_stock_cache = {};
	memory.stock_cache_ready = false;
	memory.items_storage = [];
	memory.customer_storage = [];
	memory.pos_opening_storage = null;
	memory.opening_dialog_storage = null;
	memory.sales_persons_storage = [];
	memory.price_list_cache = {};
	memory.item_details_cache = {};
	memory.manual_offline = false;
}

/**
 * Estimates the current cache usage size in bytes and percentage
 * @returns {Promise<Object>} Object containing total, localStorage, and indexedDB sizes in bytes, and usage percentage
 */
export async function getCacheUsageEstimate() {
  try {
    // Calculate localStorage size
    let localStorageSize = 0;
    if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('posa_')) {
          const value = localStorage.getItem(key) || '';
          localStorageSize += (key.length + value.length) * 2; // UTF-16 characters are 2 bytes each
        }
      }
    }

    // Estimate IndexedDB size
    let indexedDBSize = 0;
    try {
      if (db.isOpen()) {
        const allItems = await db.table("keyval").toArray();
        indexedDBSize = allItems.reduce((size, item) => {
          const itemSize = JSON.stringify(item).length * 2; // UTF-16 characters are 2 bytes each
          return size + itemSize;
        }, 0);
      }
    } catch (e) {
      console.error('Failed to calculate IndexedDB size', e);
    }

    const totalSize = localStorageSize + indexedDBSize;
    const maxSize = 10 * 1024 * 1024; // Assume 10MB as max size
    const usagePercentage = Math.min(100, Math.round((totalSize / maxSize) * 100));

    return {
      total: totalSize,
      localStorage: localStorageSize,
      indexedDB: indexedDBSize,
      percentage: usagePercentage
    };
  } catch (e) {
    console.error('Failed to estimate cache usage', e);
    return {
      total: 0,
      localStorage: 0,
      indexedDB: 0,
      percentage: 0
    };
  }
}