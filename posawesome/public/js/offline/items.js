import { memory } from './cache.js';
import { persist } from './core.js';

export function saveItemUOMs(itemCode, uoms) {
	try {
		const cache = memory.uom_cache;
		// Clone to avoid persisting reactive objects which cause
		// DataCloneError when stored in IndexedDB
		const cleanUoms = JSON.parse(JSON.stringify(uoms));
		cache[itemCode] = cleanUoms;
		memory.uom_cache = cache;
		persist("uom_cache", memory.uom_cache);
	} catch (e) {
		console.error("Failed to cache UOMs", e);
	}
}

export function getItemUOMs(itemCode) {
	try {
		const cache = memory.uom_cache || {};
		return cache[itemCode] || [];
	} catch (e) {
		return [];
	}
}

export function saveOffers(offers) {
	try {
		memory.offers_cache = offers;
		persist("offers_cache", memory.offers_cache);
	} catch (e) {
		console.error("Failed to cache offers", e);
	}
}

export function getCachedOffers() {
	try {
		return memory.offers_cache || [];
	} catch (e) {
		return [];
	}
}

// Price list items caching functions
export function savePriceListItems(priceList, items) {
        try {
                const cache = memory.price_list_cache || {};

                // Clone the items to strip Vue's reactive proxies which cannot
                // be structured cloned when sent to a worker.
                let cleanItems;
                try {
                        cleanItems = JSON.parse(JSON.stringify(items));
                } catch (err) {
                        console.error("Failed to serialize price list items", err);
                        cleanItems = [];
                }

                cache[priceList] = {
                        items: cleanItems,
                        timestamp: Date.now(),
                };
                memory.price_list_cache = cache;
                persist("price_list_cache", memory.price_list_cache);
        } catch (e) {
                console.error("Failed to cache price list items", e);
        }
}

export function getCachedPriceListItems(priceList) {
	try {
		const cache = memory.price_list_cache || {};
		const cachedData = cache[priceList];
		if (cachedData) {
			const isValid = Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000;
			return isValid ? cachedData.items : null;
		}
		return null;
	} catch (e) {
		console.error("Failed to get cached price list items", e);
		return null;
	}
}

export function clearPriceListCache() {
	try {
		memory.price_list_cache = {};
		persist("price_list_cache", memory.price_list_cache);
	} catch (e) {
		console.error("Failed to clear price list cache", e);
	}
}

// Item details caching functions
export function saveItemDetailsCache(profileName, priceList, items) {
        try {
                const cache = memory.item_details_cache || {};
                const profileCache = cache[profileName] || {};
                const priceCache = profileCache[priceList] || {};

                let cleanItems;
                try {
                        cleanItems = JSON.parse(JSON.stringify(items));
                } catch (err) {
                        console.error("Failed to serialize item details", err);
                        cleanItems = [];
                }

                cleanItems.forEach((item) => {
                        priceCache[item.item_code] = {
                                data: item,
                                timestamp: Date.now(),
                        };
                });
                profileCache[priceList] = priceCache;
                cache[profileName] = profileCache;
                memory.item_details_cache = cache;
                persist("item_details_cache", memory.item_details_cache);
        } catch (e) {
                console.error("Failed to cache item details", e);
        }
}

export function getCachedItemDetails(profileName, priceList, itemCodes, ttl = 15 * 60 * 1000) {
	try {
		const cache = memory.item_details_cache || {};
		const priceCache = cache[profileName]?.[priceList] || {};
		const now = Date.now();
		const cached = [];
		const missing = [];
		itemCodes.forEach((code) => {
			const entry = priceCache[code];
			if (entry && now - entry.timestamp < ttl) {
				cached.push(entry.data);
			} else {
				missing.push(code);
			}
		});
		return { cached, missing };
	} catch (e) {
		console.error("Failed to get cached item details", e);
		return { cached: [], missing: itemCodes };
	}
}