<template>
  <div :style="responsiveStyles">
    <v-card :class="['selection mx-auto my-0 py-0 mt-3 dynamic-card', isDarkTheme ? '' : 'bg-grey-lighten-5']"
      :style="{ height: responsiveStyles['--container-height'], maxHeight: responsiveStyles['--container-height'], backgroundColor: isDarkTheme ? '#121212' : '' }">
      <v-progress-linear :active="loading" :indeterminate="loading" absolute location="top"
        color="info"></v-progress-linear>
      <v-overlay :model-value="loading" class="align-center justify-center" absolute>
        <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
      </v-overlay>
      <!-- Add dynamic-padding wrapper like Invoice component -->
      <div class="dynamic-padding">
        <v-row class="items">
          <v-col class="pb-0">
            <v-text-field density="compact" clearable autofocus variant="solo" color="primary"
              :label="frappe._('Search Items')" hint="Search by item code, serial number, batch no or barcode"
              hide-details v-model="debounce_search" @keydown.esc="esc_event" 
              @keydown.enter="handleBarcodeSearch()" 
              @click:clear="clearSearch" prepend-inner-icon="mdi-magnify" @focus="handleItemSearchFocus"
              ref="debounce_search">
              <!-- Add camera scan button if enabled -->
              <template v-slot:append-inner v-if="pos_profile.posa_enable_camera_scanning">
                <v-btn icon="mdi-camera" size="small" color="primary" variant="text" @click="startCameraScanning"
                  :title="__('Scan with Camera')">
                </v-btn>
              </template>
            </v-text-field>

          </v-col>
          <v-col cols="3" class="pb-0" v-if="pos_profile.posa_input_qty">
            <v-text-field density="compact" variant="solo" color="primary" :label="frappe._('QTY')" hide-details
              v-model="debounce_qty" type="text" @keydown.enter="enter_event" @keydown.esc="esc_event"
              @focus="clearQty"></v-text-field>
          </v-col>
          <v-col cols="2" class="pb-0" v-if="pos_profile.posa_new_line">
            <v-checkbox v-model="new_line" color="accent" value="true" label="NLine" density="default"
              hide-details></v-checkbox>
          </v-col>
          <v-col cols="12" class="dynamic-margin-xs">
            <div class="settings-container">
              <v-btn density="compact" variant="text" color="primary" prepend-icon="mdi-cog-outline"
                @click="toggleItemSettings" class="settings-btn">
                {{ __('Settings') }}
              </v-btn>

              <v-dialog v-model="show_item_settings" max-width="400px">
                <v-card>
                  <v-card-title class="text-h6 pa-4 d-flex align-center">
                    <span>{{ __('Item Selector Settings') }}</span>
                    <v-spacer></v-spacer>
                    <v-btn icon="mdi-close" variant="text" density="compact" @click="show_item_settings = false"></v-btn>
                  </v-card-title>
                  <v-divider></v-divider>
                  <v-card-text class="pa-4">
                    <v-switch v-model="temp_hide_qty_decimals" :label="__('Hide quantity decimals')" hide-details
                      density="compact" color="primary" class="mb-2"></v-switch>
                    <v-switch v-model="temp_hide_zero_rate_items" :label="__('Hide zero rated items')" hide-details
                      density="compact" color="primary"></v-switch>
                  </v-card-text>
                  <v-card-actions class="pa-4 pt-0">
                    <v-btn color="error" variant="text" @click="cancelItemSettings">{{ __('Cancel') }}</v-btn>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" variant="tonal" @click="applyItemSettings">{{ __('Apply') }}</v-btn>
                  </v-card-actions>
                </v-card>
              </v-dialog>
            </div>
          </v-col>
          <v-col cols="12" class="pt-0 mt-0">
            <div fluid class="items-grid dynamic-scroll" ref="itemsContainer" v-if="items_view == 'card'"
              :style="{ maxHeight: 'calc(' + responsiveStyles['--container-height'] + ' - 80px)' }">
              <v-card v-for="item in filtered_items" :key="item.item_code" hover class="dynamic-item-card"
                @click="add_item(item)">
                <v-img :src="item.image ||
                        '/assets/posawesome/js/posapp/components/pos/placeholder-image.png'
                        " class="text-white align-end" gradient="to bottom, rgba(0,0,0,0), rgba(0,0,0,0.4)"
                        height="100px">
                  <v-card-text class="text-caption px-1 pb-0 truncate">{{ item.item_name }}</v-card-text>
                </v-img>
                <v-card-text class="text--primary pa-1">
                  <div class="text-caption text-primary truncate">
                    {{ currencySymbol(item.original_currency || pos_profile.currency) || "" }}
                    {{ format_currency(item.base_price_list_rate || item.rate,
                      item.original_currency || pos_profile.currency,
                      ratePrecision(item.base_price_list_rate || item.rate)) }}
                  </div>
                  <div v-if="pos_profile.posa_allow_multi_currency && selected_currency !== pos_profile.currency"
                    class="text-caption text-success truncate">
                    {{ currencySymbol(selected_currency) || "" }}
                    {{ format_currency(item.rate, selected_currency,
                      ratePrecision(item.rate)) }}
                  </div>
                  <div class="text-caption golden--text truncate">
                    {{ format_number(item.actual_qty, hide_qty_decimals ? 0 : 4) || 0 }}
                    {{ item.stock_uom || "" }}
                  </div>
                </v-card-text>
              </v-card>
            </div>
            <div v-else>
              <v-data-table-virtual :headers="headers" :items="filtered_items" class="sleek-data-table overflow-y-auto"
                :style="{ maxHeight: 'calc(' + responsiveStyles['--container-height'] + ' - 80px)' }"
                item-key="item_code" @click:row="click_item_row">

                <template v-slot:item.rate="{ item }">
                  <div>
                    <div class="text-primary">{{ currencySymbol(item.original_currency || pos_profile.currency) }}
                      {{ format_currency(item.base_price_list_rate || item.rate,
                        item.original_currency || pos_profile.currency,
                        ratePrecision(item.base_price_list_rate || item.rate)) }}</div>
                    <div v-if="pos_profile.posa_allow_multi_currency && selected_currency !== pos_profile.currency"
                      class="text-success">
                      {{ currencySymbol(selected_currency) }}
                      {{ format_currency(item.rate, selected_currency,
                        ratePrecision(item.rate)) }}
                    </div>
                  </div>
                </template>
                <template v-slot:item.actual_qty="{ item }">
                  <span class="golden--text">{{ format_number(item.actual_qty, hide_qty_decimals ? 0 : 4) }}</span>
                </template>
              </v-data-table-virtual>
            </div>
          </v-col>
        </v-row>
      </div>
    </v-card>
    <v-card class="cards mb-0 mt-3 dynamic-padding">
      <v-row no-gutters align="center" justify="center" class="dynamic-spacing-sm">
        <v-col cols="12" class="mb-2">
          <v-select :items="items_group" :label="frappe._('Items Group')" density="compact" variant="solo" hide-details
            v-model="item_group"></v-select>
        </v-col>
        <v-col cols="12" class="mb-2" v-if="pos_profile.posa_enable_price_list_dropdown">
          <v-text-field density="compact" variant="solo" color="primary" :label="frappe._('Price List')" hide-details
            :model-value="active_price_list" readonly></v-text-field>
        </v-col>
        <v-col cols="3" class="dynamic-margin-xs">
          <v-btn-toggle v-model="items_view" color="primary" group density="compact" rounded>
            <v-btn size="small" value="list">{{ __("List") }}</v-btn>
            <v-btn size="small" value="card">{{ __("Card") }}</v-btn>
          </v-btn-toggle>
        </v-col>
        <v-col cols="5" class="dynamic-margin-xs">
          <v-btn
            size="small"
            block
            color="warning"
            variant="text"
            @click="show_offers"
            class="action-btn-consistent"
          >
            {{ offersCount }} {{ __("Offers") }}
          </v-btn>
        </v-col>
        <v-col cols="4" class="dynamic-margin-xs">
          <v-btn size="small" block color="primary" variant="text" @click="show_coupons"
            class="action-btn-consistent">{{
              couponsCount }} {{
              __("Coupons")
            }}</v-btn>
        </v-col>
        
      </v-row>
    </v-card>

    <!-- Camera Scanner Component -->
    <CameraScanner v-if="pos_profile.posa_enable_camera_scanning" ref="cameraScanner"
      :scan-type="pos_profile.posa_camera_scan_type || 'Both'" @barcode-scanned="onBarcodeScanned" />
  </div>
</template>

<script type="module">

import format from "../../format";
import _ from "lodash";
import CameraScanner from './CameraScanner.vue';
import { saveItemUOMs, getItemUOMs, getLocalStock, isOffline, initializeStockCache, getItemsStorage, setItemsStorage, getLocalStockCache, setLocalStockCache, initPromise, getCachedPriceListItems, savePriceListItems, updateLocalStockCache, isStockCacheReady, getCachedItemDetails, saveItemDetailsCache } from '../../../offline/index.js';
import { responsiveMixin } from '../../mixins/responsive.js';

export default {
  mixins: [format, responsiveMixin],
  components: {
    CameraScanner,
  },
  data: () => ({
    pos_profile: "",
    flags: {},
    items_view: "list",
    item_group: "ALL",
    loading: false,
    items_group: ["ALL"],
    items: [],
    search: "",
    first_search: "",
    search_backup: "",
    // Limit the displayed items to avoid overly large lists
    itemsPerPage: 50,
    offersCount: 0,
    appliedOffersCount: 0,
    couponsCount: 0,
    appliedCouponsCount: 0,
    customer_price_list: null,
    customer: null,
    new_line: false,
    qty: 1,
    refresh_interval: null,
    currentRequest: null,
    abortController: null,
    itemDetailsRetryCount: 0,
    itemDetailsRetryTimeout: null,
    items_loaded: false,
    selected_currency: "",
    exchange_rate: 1,
    prePopulateInProgress: false,
    itemWorker: null,
    items_request_token: 0,
    show_item_settings: false,
    hide_qty_decimals: false,
    temp_hide_qty_decimals: false,
    hide_zero_rate_items: false,
    temp_hide_zero_rate_items: false,
  }),

  watch: {
    customer: _.debounce(function () {
      if (this.pos_profile.posa_force_reload_items) {
        if (this.pos_profile.posa_smart_reload_mode) {
          // When limit search is enabled there may be no items yet.
          // Fallback to full reload if nothing is loaded
          if (!this.items_loaded || !this.filtered_items.length) {
            this.items_loaded = false;
            this.get_items(true);
          } else {
            // Only refresh prices for visible items when smart reload is enabled
            this.$nextTick(() => this.refreshPricesForVisibleItems());
          }
        } else {
          // Fall back to full reload
          this.items_loaded = false;
          this.get_items(true);
        }
        return;
      }
      // When the customer changes, avoid reloading all items.
      // Simply refresh prices for visible items only
      if (this.items_loaded && this.filtered_items && this.filtered_items.length > 0) {
        this.$nextTick(() => this.refreshPricesForVisibleItems());
      } else {
        this.get_items();
      }
    }, 300),
    customer_price_list: _.debounce(function () {
      if (this.pos_profile.posa_force_reload_items) {
        if (this.pos_profile.posa_smart_reload_mode) {
          // When limit search is enabled there may be no items yet.
          // Fallback to full reload if nothing is loaded
          if (!this.items_loaded || !this.items.length) {
            this.items_loaded = false;
            this.get_items(true);
          } else {
            // Only refresh prices for visible items when smart reload is enabled
            this.$nextTick(() => this.refreshPricesForVisibleItems());
          }
        } else {
          // Fall back to full reload
          this.items_loaded = false;
          this.get_items(true);
        }
        return;
      }
      // Apply cached rates if available for immediate update
      if (this.items_loaded && this.items && this.items.length > 0) {
        const cached = getCachedPriceListItems(this.customer_price_list);
        if (cached && cached.length) {
          const map = {};
          cached.forEach(ci => { map[ci.item_code] = ci; });
          this.items.forEach(it => {
            const ci = map[it.item_code];
            if (ci) {
              it.rate = ci.rate;
              it.price_list_rate = ci.price_list_rate || ci.rate;
            }
          });
          this.eventBus.emit("set_all_items", this.items);
          this.update_items_details(this.items);
          return;
        }
      }
      // No cache found - force a reload so prices are updated
      this.items_loaded = false;
      this.get_items(true);
    }, 300),
    new_line() {
      this.eventBus.emit("set_new_line", this.new_line);
    },
    filtered_items(new_value, old_value) {
      // Update item details if items changed
      if (
        !this.pos_profile.pose_use_limit_search &&
        new_value.length !== old_value.length
      ) {
        this.update_items_details(new_value);
      }
    },
    // Auto-trigger search when limit search is enabled and the query changes
    first_search: _.debounce(function (val) {
      if (this.pos_profile && this.pos_profile.pose_use_limit_search) {
        this.search_onchange(val);
      }
    }, 300),
    // Refresh item prices whenever the user changes currency
    selected_currency() {
      this.applyCurrencyConversionToItems();
    },

    // Also react when exchange rate is adjusted manually
    exchange_rate() {
      this.applyCurrencyConversionToItems();
    },
  },

  methods: {
    /**
     * Unified method to handle barcode search from both manual input and scanning
     */
    handleBarcodeSearch(searchValue = null, isScanned = false) {
      // Use provided value or get from search field
      const barcodeValue = searchValue || this.first_search || this.search;
      
      if (!barcodeValue || barcodeValue.trim() === '') {
        console.warn('No barcode value provided');
        return;
      }

      console.log(`Processing ${isScanned ? 'scanned' : 'manual'} barcode:`, barcodeValue);

      // Set the search field values
      this.first_search = barcodeValue;
      this.search = barcodeValue;
      this.search_backup = '';

      // Show loading state briefly for better UX
      if (isScanned) {
        frappe.show_alert({
          message: `Searching for: ${barcodeValue}`,
          indicator: 'blue'
        }, 2);
      }

      // First, try to find exact barcode match
      let foundItem = this.findItemByBarcode(barcodeValue);

      if (foundItem) {
        console.log('Found item by exact barcode match:', foundItem);
        this.addItemFromSearch(foundItem, barcodeValue);
        return;
      }

      // If no exact barcode match, try item code match
      foundItem = this.items.find(item => 
        item.item_code === barcodeValue || 
        item.item_code.toLowerCase() === barcodeValue.toLowerCase()
      );

      if (foundItem) {
        console.log('Found item by item code match:', foundItem);
        this.addItemFromSearch(foundItem, barcodeValue);
        return;
      }

      // For scale barcodes (if configured)
      if (this.pos_profile.posa_scale_barcode_start && 
          barcodeValue.startsWith(this.pos_profile.posa_scale_barcode_start)) {
        const scaledItem = this.handleScaleBarcode(barcodeValue);
        if (scaledItem) {
          this.addItemFromSearch(scaledItem, barcodeValue);
          return;
        }
      }

      // Check serial numbers if enabled
      if (this.pos_profile.posa_search_serial_no) {
        foundItem = this.findItemBySerialNumber(barcodeValue);
        if (foundItem) {
          console.log('Found item by serial number:', foundItem);
          foundItem.to_set_serial_no = barcodeValue;
          this.flags.serial_no = barcodeValue;
          this.addItemFromSearch(foundItem, barcodeValue);
          return;
        }
      }

      // Check batch numbers if enabled
      if (this.pos_profile.posa_search_batch_no) {
        foundItem = this.findItemByBatchNumber(barcodeValue);
        if (foundItem) {
          console.log('Found item by batch number:', foundItem);
          foundItem.to_set_batch_no = barcodeValue;
          foundItem.batch_no = barcodeValue;
          this.flags.batch_no = barcodeValue;
          this.addItemFromSearch(foundItem, barcodeValue);
          return;
        }
      }

      // If still no match, try partial name search
      const partialMatches = this.searchItemsByName(barcodeValue);
      
      if (partialMatches.length === 1) {
        console.log('Found item by name search:', partialMatches[0]);
        this.addItemFromSearch(partialMatches[0], barcodeValue);
      } else if (partialMatches.length > 1) {
        console.log('Multiple items found, showing first match:', partialMatches[0]);
        this.addItemFromSearch(partialMatches[0], barcodeValue);
      } else {
        // No item found
        this.handleItemNotFound(barcodeValue, isScanned);
      }
    },

    findItemByBarcode(barcode) {
      return this.items.find(item => {
        // Check main barcode
        if (item.barcode === barcode) return true;
        
        // Check item_barcode array
        if (item.item_barcode && Array.isArray(item.item_barcode)) {
          return item.item_barcode.some(bc => bc.barcode === barcode);
        }
        
        // Check barcodes array (alternative structure)
        if (item.barcodes && Array.isArray(item.barcodes)) {
          return item.barcodes.some(bc => bc.barcode === barcode);
        }
        
        return false;
      });
    },

    findItemBySerialNumber(serialNo) {
      return this.items.find(item => {
        if (item.serial_no_data && Array.isArray(item.serial_no_data)) {
          return item.serial_no_data.some(sn => sn.serial_no === serialNo);
        }
        return false;
      });
    },

    findItemByBatchNumber(batchNo) {
      return this.items.find(item => {
        if (item.batch_no_data && Array.isArray(item.batch_no_data)) {
          return item.batch_no_data.some(bn => bn.batch_no === batchNo);
        }
        return false;
      });
    },

    searchItemsByName(searchTerm) {
      const term = searchTerm.toLowerCase();
      return this.items.filter(item =>
        item.item_name.toLowerCase().includes(term) ||
        item.item_code.toLowerCase().includes(term)
      );
    },

    handleScaleBarcode(barcode) {
      const itemCode = barcode.substr(0, 7);
      const foundItem = this.items.find(item => 
        item.item_code === itemCode || 
        item.barcode === itemCode
      );
      
      if (foundItem) {
        const qty = this.get_item_qty(barcode);
        foundItem.qty = qty;
        return foundItem;
      }
      
      return null;
    },

    addItemFromSearch(item, originalSearch) {
      if (!item) return;

      // Clone the item to avoid modifying the original
      const itemToAdd = { ...item };

      // Set quantity from the qty field or default to 1
      const qtyVal = this.qty != null ? this.qty : 1;
      itemToAdd.qty = Math.abs(qtyVal);

      // Handle barcode-specific UOM if found
      if (item.item_barcode && Array.isArray(item.item_barcode)) {
        const barcodeMatch = item.item_barcode.find(bc => bc.barcode === originalSearch);
        if (barcodeMatch && barcodeMatch.posa_uom) {
          itemToAdd.uom = barcodeMatch.posa_uom;
          this.eventBus.emit("calc_uom", itemToAdd, barcodeMatch.posa_uom);
        }
      }

      // Check stock availability
      if (itemToAdd.actual_qty === 0 && this.pos_profile.posa_display_items_in_stock) {
        this.eventBus.emit("show_message", {
          title: `No stock available for ${itemToAdd.item_name}`,
          color: "warning",
        });
        this.update_items_details([itemToAdd]);
        return;
      }

      // Ensure UOMs are available
      if (!itemToAdd.item_uoms || itemToAdd.item_uoms.length === 0) {
        const cachedUoms = getItemUOMs(itemToAdd.item_code);
        if (cachedUoms.length > 0) {
          itemToAdd.item_uoms = cachedUoms;
        } else if (itemToAdd.stock_uom) {
          itemToAdd.item_uoms = [{ uom: itemToAdd.stock_uom, conversion_factor: 1.0 }];
        }
      }

      // Handle multi-currency conversion
      if (this.pos_profile.posa_allow_multi_currency &&
          this.selected_currency !== this.pos_profile.currency) {
        itemToAdd.base_rate = itemToAdd.rate;
        itemToAdd.base_price_list_rate = itemToAdd.price_list_rate;
        itemToAdd.rate = this.getConvertedRate(itemToAdd);
        itemToAdd.price_list_rate = this.getConvertedRate(itemToAdd);
        itemToAdd.currency = this.selected_currency;
      }

      // Add the item to cart
      this.eventBus.emit("add_item", itemToAdd);

      // Show success feedback
      frappe.show_alert({
        message: `Added: ${itemToAdd.item_name}`,
        indicator: 'green'
      }, 3);

      // Clear search and reset form
      this.clearSearchForm();

      // Focus back to search field
      this.$nextTick(() => {
        this.$refs.debounce_search?.focus();
      });
    },

    handleItemNotFound(searchValue, isScanned = false) {
      const message = `No item found for: ${searchValue}`;
      
      console.warn(message);
      
      this.eventBus.emit("show_message", {
        title: message,
        color: "error",
      });

      frappe.utils.play_sound("error");

      frappe.show_alert({
        message: message,
        indicator: 'red'
      }, 5);

      if (isScanned) {
        setTimeout(() => {
          this.clearSearchForm();
        }, 2000);
      }
    },

    clearSearchForm() {
      this.search = "";
      this.first_search = "";
      this.search_backup = "";
      this.qty = 1;
      
      this.flags.serial_no = null;
      this.flags.batch_no = null;
    },

    refreshPricesForVisibleItems() {
      const vm = this;
      if (!vm.filtered_items || vm.filtered_items.length === 0) return;

      vm.loading = true;

      // Cancel previous request if any
      if (vm.currentRequest) {
        vm.abortController.abort();
        vm.currentRequest = null;
      }

      const itemCodes = vm.filtered_items.map(it => it.item_code);
      const cacheResult = getCachedItemDetails(vm.pos_profile.name, vm.active_price_list, itemCodes);
      const updates = [];

      cacheResult.cached.forEach(det => {
        const item = vm.filtered_items.find(it => it.item_code === det.item_code);
        if (item) {
          const upd = {
            actual_qty: det.actual_qty,
            serial_no_data: det.serial_no_data,
            batch_no_data: det.batch_no_data,
          };
          if (det.item_uoms && det.item_uoms.length > 0) {
            upd.item_uoms = det.item_uoms;
            saveItemUOMs(item.item_code, det.item_uoms);
          }
          if (det.rate !== undefined) {
            if (det.rate !== 0 || !item.rate) {
              upd.rate = det.rate;
              upd.price_list_rate = det.price_list_rate || det.rate;
            }
          }
          updates.push({ item, upd });
        }
      });

      if (cacheResult.missing.length === 0) {
        vm.$nextTick(() => {
          updates.forEach(({ item, upd }) => Object.assign(item, upd));
          updateLocalStockCache(cacheResult.cached);
          vm.loading = false;
        });
        return;
      }

      vm.abortController = new AbortController();
      const itemsToFetch = vm.filtered_items.filter(it => cacheResult.missing.includes(it.item_code));

      frappe.call({
        method: "posawesome.posawesome.api.items.get_items_details",
        args: {
          pos_profile: JSON.stringify(vm.pos_profile),
          items_data: JSON.stringify(itemsToFetch),
          price_list: vm.active_price_list,
        },
        freeze: false,
        signal: vm.abortController.signal,
        callback: function (r) {
          if (r.message) {
            r.message.forEach(updItem => {
              const item = vm.filtered_items.find(it => it.item_code === updItem.item_code);
              if (item) {
                const upd = {
                  actual_qty: updItem.actual_qty,
                  serial_no_data: updItem.serial_no_data,
                  batch_no_data: updItem.batch_no_data,
                };
                if (updItem.item_uoms && updItem.item_uoms.length > 0) {
                  upd.item_uoms = updItem.item_uoms;
                  saveItemUOMs(item.item_code, updItem.item_uoms);
                }
                if (updItem.rate !== undefined) {
                  if (updItem.rate !== 0 || !item.rate) {
                    upd.rate = updItem.rate;
                    upd.price_list_rate = updItem.price_list_rate || updItem.rate;
                  }
                }
                updates.push({ item, upd });
              }
            });

            vm.$nextTick(() => {
              updates.forEach(({ item, upd }) => Object.assign(item, upd));
              updateLocalStockCache(r.message);
              saveItemDetailsCache(vm.pos_profile.name, vm.active_price_list, r.message);
              vm.loading = false;
            });
          }
        },
        error: function (err) {
          if (err.name !== 'AbortError') {
            console.error("Error fetching item details:", err);
            vm.loading = false;
          }
        }
      });
    },

    async getProductBundle(item_code) {
    try {
      const response = await new Promise((resolve, reject) => {
        frappe.call({
          method: "posawesome.posawesome.api.posapp.get_product_bundle",
          args: {
            item_code: item_code,
            pos_profile: this.pos_profile
          },
          callback: function(r) {
            resolve(r);
          },
          error: function(err) {
            reject(err);
          }
        });
      });
      
      return response.message;
    } catch (error) {
      console.error('Error fetching product bundle:', error);
      throw error;
    }
  },

  async processProductBundle(item_code, quantity = 1) {
  if (!this.pos_profile.custom_product_bundle) {
    return false;
  }
  
  try {
    console.log(`Processing product bundle for item: ${item_code}`);
    const product_bundle = await this.getProductBundle(item_code);
    
    if (product_bundle && product_bundle.items && Array.isArray(product_bundle.items)) {
      console.log('Product bundle found:', product_bundle);
      
      // Show loading message
      this.eventBus.emit("show_message", {
        title: `Processing product bundle: ${product_bundle.name}`,
        color: "info",
      });
      
      let allItemsAdded = true;
      let addedCount = 0;
      
      // Process each bundle item
      for (const bundle_item of product_bundle.items) {
        try {
          // Find the item details from your items list
          const item_details = this.items.find(item => item.item_code === bundle_item.item_code);
          
          if (item_details) {
            // Calculate the total quantity for this bundle item
            const bundle_qty = (bundle_item.qty || 1) * quantity;
            
            // Create enhanced bundle item with all necessary properties
            const enhanced_bundle_item = {
              ...item_details, // Copy all properties from the original item
              qty: bundle_qty,
              uom: bundle_item.uom || item_details.stock_uom,
              is_bundle_item: true,
              parent_bundle: item_code,
              custom_bundle_id: product_bundle.name,
              bundle_item_description: bundle_item.description || '',
              // Preserve the original rate and other pricing info
              rate: item_details.rate,
              price_list_rate: item_details.price_list_rate || item_details.rate
            };
            
            console.log(`Adding bundle item: ${bundle_item.item_code} with qty: ${bundle_qty}`);
            
            // Add the bundle item to cart
            this.eventBus.emit("add_item", enhanced_bundle_item);
            addedCount++;
            
            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } else {
            console.warn(`Bundle item not found in items list: ${bundle_item.item_code}`);
            this.eventBus.emit("show_message", {
              title: `Bundle item not available: ${bundle_item.item_code}`,
              color: "warning",
            });
            allItemsAdded = false;
          }
        } catch (itemError) {
          console.error(`Error processing bundle item ${bundle_item.item_code}:`, itemError);
          allItemsAdded = false;
        }
      }
      
      // Show success/warning message based on results
      if (addedCount > 0) {
        const messageColor = allItemsAdded ? "success" : "warning";
        const messageText = allItemsAdded 
          ? `Product bundle "${product_bundle.name}" added successfully (${addedCount} items)`
          : `Product bundle "${product_bundle.name}" partially added (${addedCount} items)`;
          
        this.eventBus.emit("show_message", {
          title: messageText,
          color: messageColor,
        });
        
        return true;
      } else {
        this.eventBus.emit("show_message", {
          title: `No items could be added from bundle: ${product_bundle.name}`,
          color: "error",
        });
        return false;
      }
      
    } else {
      console.log(`No product bundle found for item: ${item_code}`);
      return false;
    }
    
  } catch (error) {
    console.error('Error processing product bundle:', error);
    this.eventBus.emit("show_message", {
      title: `Failed to process product bundle: ${error.message}`,
      color: "error",
    });
    return false;
  }
    },

    show_offers() {
      this.eventBus.emit("show_offers", "true");
    },
    show_coupons() {
      this.eventBus.emit("show_coupons", "true");
    },
    async get_items(force_server = false) {
      await initPromise;
      const request_token = ++this.items_request_token;
      if (!this.pos_profile) {
        console.error("No POS Profile");
        return;
      }

      if (force_server && this.pos_profile.posa_local_storage) {
        localStorage.setItem("items_storage", "");
      }

      const vm = this;
      this.loading = true;

      // Removed noisy debug log
      let search = this.get_search(this.first_search);
      let gr = vm.item_group !== "ALL" ? vm.item_group.toLowerCase() : "";
      let sr = search || "";

      // Skip reload if items already loaded, not forcing, not searching and limit search disabled
      if (
        this.items_loaded &&
        !force_server &&
        !this.first_search &&
        !this.pos_profile.pose_use_limit_search
      ) {
        console.info("Items already loaded, skipping reload");
        if (this.filtered_items && this.filtered_items.length > 0) {
          this.update_items_details(this.filtered_items);
        }
        this.loading = false;
        return;
      }
      // Removed noisy debug log

      // Attempt to load cached items for the current price list
      if (
        !force_server &&
        !this.pos_profile.pose_use_limit_search
      ) {
        const cached = getCachedPriceListItems(vm.customer_price_list);
        if (cached && cached.length) {
          vm.items = cached;
          vm.items.forEach((it) => {
            if (!it.item_uoms || it.item_uoms.length === 0) {
              const cachedUoms = getItemUOMs(it.item_code);
              if (cachedUoms.length > 0) {
                it.item_uoms = cachedUoms;
              } else if (it.stock_uom) {
                it.item_uoms = [{ uom: it.stock_uom, conversion_factor: 1.0 }];
              }
            }
          });
          this.eventBus.emit("set_all_items", vm.items);
          vm.loading = false;
          vm.items_loaded = true;

          if (vm.items && vm.items.length > 0) {
            vm.prePopulateStockCache(vm.items);
            vm.update_items_details(vm.items);
          }
          return;
        }
      }

      // Load from localStorage when available and not forcing
      if (
        vm.pos_profile.posa_local_storage &&
        getItemsStorage().length &&
        !vm.pos_profile.pose_use_limit_search &&
        !force_server
      ) {
        vm.items = getItemsStorage();
        // Fallback to cached UOMs when loading from storage
        vm.items.forEach((it) => {
          if (!it.item_uoms || it.item_uoms.length === 0) {
            const cached = getItemUOMs(it.item_code);
            if (cached.length > 0) {
              it.item_uoms = cached;
            } else if (it.stock_uom) {
              it.item_uoms = [{ uom: it.stock_uom, conversion_factor: 1.0 }];
            }
          }
        });
        this.eventBus.emit("set_all_items", vm.items);
        vm.loading = false;
        vm.items_loaded = true;

        if (vm.items && vm.items.length > 0) {
          await vm.prePopulateStockCache(vm.items);
          vm.update_items_details(vm.items);
        }
        return;
      }
      // Removed noisy debug log

      if (this.itemWorker) {

        try {
          const res = await fetch(
            "/api/method/posawesome.posawesome.api.items.get_items",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Frappe-CSRF-Token": frappe.csrf_token,
              },
              credentials: "same-origin",
              body: JSON.stringify({
                pos_profile: JSON.stringify(vm.pos_profile),
                price_list: vm.customer_price_list,
                item_group: gr,
                search_value: sr,
                customer: vm.customer,
              }),
            }
          );



          const text = await res.text();
          // console.log(text)
          this.itemWorker.onmessage = async (ev) => {
            if (this.items_request_token !== request_token) return;
            if (ev.data.type === "parsed") {
              const parsed = ev.data.items;
              vm.items = parsed.message || parsed;
              savePriceListItems(vm.customer_price_list, vm.items);
              // Ensure UOMs are available for each item
              vm.items.forEach((it) => {
                if (it.item_uoms && it.item_uoms.length > 0) {
                  saveItemUOMs(it.item_code, it.item_uoms);
                } else {
                  const cached = getItemUOMs(it.item_code);
                  if (cached.length > 0) {
                    it.item_uoms = cached;
                  } else if (it.stock_uom) {
                    it.item_uoms = [{ uom: it.stock_uom, conversion_factor: 1.0 }];
                  }
                }
              });
              vm.eventBus.emit("set_all_items", vm.items);
              vm.loading = false;
              vm.items_loaded = true;
              console.info("Items Loaded");

              // Pre-populate stock cache when items are freshly loaded
              vm.prePopulateStockCache(vm.items);

              vm.$nextTick(() => {
                if (vm.search && !vm.pos_profile.pose_use_limit_search) {
                  vm.search_onchange();
                }
              });

              // Always refresh quantities after items are loaded
              if (vm.items && vm.items.length > 0) {
                vm.update_items_details(vm.items);
              }

              if (
                vm.pos_profile.posa_local_storage &&
                !vm.pos_profile.pose_use_limit_search
              ) {
                try {
                  setItemsStorage(vm.items);
                  vm.items.forEach((it) => {
                    if (it.item_uoms && it.item_uoms.length > 0) {
                      saveItemUOMs(it.item_code, it.item_uoms);
                    }
                  });
                } catch (e) {
                  console.error(e);
                }
              }

              if (vm.pos_profile.pose_use_limit_search) {
                vm.handleBarcodeSearch();
              }

              // Terminate the worker after items are parsed to
              // release memory held by the worker thread.
              if (vm.itemWorker) {
                vm.itemWorker.terminate();
                vm.itemWorker = null;
              }
            } else if (ev.data.type === "error") {
              console.error('Item worker parse error:', ev.data.error);
              vm.loading = false;
            }
          };
          this.itemWorker.postMessage({ type: 'parse_and_cache', json: text, priceList: vm.customer_price_list });


        } catch (err) {
          console.error('Failed to fetch items', err);
          vm.loading = false;
        }
      } else {
        frappe.call({
          method: "posawesome.posawesome.api.items.get_items",
          args: {
            pos_profile: JSON.stringify(vm.pos_profile),
            price_list: vm.customer_price_list,
            item_group: gr,
            search_value: sr,
            customer: vm.customer,
          },
          callback: async function (r) {
            if (vm.items_request_token !== request_token) return;
            if (r.message) {
              vm.items = r.message;
              // Ensure UOMs are available for each item
              vm.items.forEach((it) => {
                if (it.item_uoms && it.item_uoms.length > 0) {
                  saveItemUOMs(it.item_code, it.item_uoms);
                } else {
                  const cached = getItemUOMs(it.item_code);
                  if (cached.length > 0) {
                    it.item_uoms = cached;
                  } else if (it.stock_uom) {
                    it.item_uoms = [{ uom: it.stock_uom, conversion_factor: 1.0 }];
                  }
                }
              });
              vm.eventBus.emit("set_all_items", vm.items);
              vm.loading = false;
              vm.items_loaded = true;
              savePriceListItems(vm.customer_price_list, vm.items);
              console.info("Items Loaded");

              // Pre-populate stock cache when items are freshly loaded
              vm.prePopulateStockCache(vm.items);

              vm.$nextTick(() => {
                if (vm.search && !vm.pos_profile.pose_use_limit_search) {
                  vm.search_onchange();
                }
              });

              // Always refresh quantities after items are loaded
              if (vm.items && vm.items.length > 0) {
                vm.update_items_details(vm.items);
              }

              if (
                vm.pos_profile.posa_local_storage &&
                !vm.pos_profile.pose_use_limit_search
              ) {
                try {
                  setItemsStorage(r.message);
                  r.message.forEach((it) => {
                    if (it.item_uoms && it.item_uoms.length > 0) {
                      saveItemUOMs(it.item_code, it.item_uoms);
                    }
                  });
                } catch (e) {
                  console.error(e);
                }
              }
              if (vm.pos_profile.pose_use_limit_search) {
                vm.handleBarcodeSearch();
              }
            }
          }
        });
      }
    },
    get_items_groups() {
      if (!this.pos_profile) {
        console.log("No POS Profile");
        return;
      }
      if (this.pos_profile.item_groups.length > 0) {
        this.pos_profile.item_groups.forEach((element) => {
          if (element.item_group !== "All Item Groups") {
            this.items_group.push(element.item_group);
          }
        });
      } else {
        const vm = this;
        frappe.call({
          method: "posawesome.posawesome.api.items.get_items_groups",
          args: {},
          callback: function (r) {
            if (r.message) {
              r.message.forEach((element) => {
                vm.items_group.push(element.name);
              });
            }
          },
        });
      }
    },
    getItemsHeaders() {
      const items_headers = [
        {
          title: __("Name"),
          align: "start",
          sortable: true,
          key: "item_name",
        },
        {
          title: __("Code"),
          align: "start",
          sortable: true,
          key: "item_code",
        },
        { title: __("Rate"), key: "rate", align: "start" },
        { title: __("Available QTY"), key: "actual_qty", align: "start" },
        { title: __("UOM"), key: "stock_uom", align: "start" },
      ];
      if (!this.pos_profile.posa_display_item_code) {
        items_headers.splice(1, 1);
      }

      return items_headers;
    },
    click_item_row(event, { item }) {
      this.add_item(item)
    },
    async add_item(item) {
      item = { ...item };
      if (item.has_variants) {
        this.eventBus.emit("open_variants_model", item, this.items);
      } else {
        if (item.actual_qty === 0 && this.pos_profile.posa_display_items_in_stock) {
          this.eventBus.emit("show_message", {
            title: `No stock available for ${item.item_name}`,
            color: "warning",
          });
          this.update_items_details([item]);
          return;
        }

        // Ensure UOMs are initialized before adding the item
        if (!item.item_uoms || item.item_uoms.length === 0) {
          // If UOMs are not available, fetch them first
          this.update_items_details([item]);

          // Add stock UOM as fallback
          if (!item.item_uoms || item.item_uoms.length === 0) {
            item.item_uoms = [{ uom: item.stock_uom, conversion_factor: 1.0 }];
          }
        }

        if (this.pos_profile.custom_product_bundle) {
          console.log('Checking if item is a product bundle:', item.item_code);
          
          const quantity = Math.abs(this.qty != null ? this.qty : 1);
          const bundleProcessed = await this.processProductBundle(item.item_code, quantity);
          
          if (bundleProcessed) {
            this.qty = 1;
            // ✅ Clear search and refocus after bundle processing
            this.search = "";
            this.first_search = "";
            this.search_backup = "";
            this.$refs.debounce_search?.focus();
            return; // Exit early since bundle was processed
            }
          }

        // Ensure correct rate based on selected currency
        if (this.pos_profile.posa_allow_multi_currency) {
          this.applyCurrencyConversionToItem(item);

          // Compute base rates from original values
          const base_rate =
            item.original_currency === this.pos_profile.currency
              ? item.original_rate
              : item.original_rate * (item.plc_conversion_rate || this.exchange_rate);
          item.base_rate = base_rate;
          item.base_price_list_rate = base_rate;
        }

        if (!item.qty || item.qty === 1) {
          let qtyVal = this.qty != null ? this.qty : 1;
          qtyVal = Math.abs(qtyVal);
          if (this.hide_qty_decimals) {
            qtyVal = Math.trunc(qtyVal);
          }
          item.qty = qtyVal;
        }
        this.eventBus.emit("add_item", item);
        this.qty = 1;
        this.search = "";
        this.first_search = "";
        this.search_backup = "";
        this.$refs.debounce_search?.focus();
      }
    },
    enter_event() {
      if (!this.first_search || this.filtered_items.length === 0) {
        return;
      }
      this.handleBarcodeSearch(this.first_search, false);
    },
    clearAndFocusSearch() {
    this.search = "";
    this.first_search = "";
    this.search_backup = "";
    this.$refs.debounce_search?.focus();
    },
    search_onchange: _.debounce(function (newSearchTerm) {
      const vm = this;
      if (newSearchTerm) vm.search = newSearchTerm;

      if (vm.pos_profile.pose_use_limit_search) {
        // Only trigger search when query length meets minimum threshold
        if (vm.search && vm.search.length >= 3) {
          vm.get_items();
        }
      } else {
        // Save the current filtered items before search to maintain quantity data
        const current_items = [...vm.filtered_items];
        if (vm.search && vm.search.length >= 3) {
          vm.handleBarcodeSearch();
        }

        // After search, update quantities for newly filtered items
        if (vm.filtered_items && vm.filtered_items.length > 0) {
          setTimeout(() => {
            vm.update_items_details(vm.filtered_items);
          }, 300);
        }
      }
    }, 300),
    get_item_qty(first_search) {
      const qtyVal = this.qty != null ? this.qty : 1;
      let scal_qty = Math.abs(qtyVal);
      if (first_search.startsWith(this.pos_profile.posa_scale_barcode_start)) {
        let pesokg1 = first_search.substr(7, 5);
        let pesokg;
        if (pesokg1.startsWith("0000")) {
          pesokg = "0.00" + pesokg1.substr(4);
        } else if (pesokg1.startsWith("000")) {
          pesokg = "0.0" + pesokg1.substr(3);
        } else if (pesokg1.startsWith("00")) {
          pesokg = "0." + pesokg1.substr(2);
        } else if (pesokg1.startsWith("0")) {
          pesokg =
            pesokg1.substr(1, 1) + "." + pesokg1.substr(2, pesokg1.length);
        } else if (!pesokg1.startsWith("0")) {
          pesokg =
            pesokg1.substr(0, 2) + "." + pesokg1.substr(2, pesokg1.length);
        }
        scal_qty = pesokg;
      }
      if (this.hide_qty_decimals) {
        scal_qty = Math.trunc(scal_qty);
      }
      return scal_qty;
    },
    get_search(first_search) {
      let search_term = "";
      if (
        first_search &&
        first_search.startsWith(this.pos_profile.posa_scale_barcode_start)
      ) {
        search_term = first_search.substr(0, 7);
      } else {
        search_term = first_search;
      }
      return search_term;
    },
    esc_event() {
      this.search = "";
      this.first_search = "";
      this.search_backup = "";
      this.qty = 1;
      this.$refs.debounce_search?.focus();
    },
    update_items_details(items) {
      const vm = this;
      if (!items || !items.length) return;

      // reset any pending retry timer
      if (vm.itemDetailsRetryTimeout) {
        clearTimeout(vm.itemDetailsRetryTimeout);
        vm.itemDetailsRetryTimeout = null;
      }

      const itemCodes = items.map(it => it.item_code);
      const cacheResult = getCachedItemDetails(vm.pos_profile.name, vm.active_price_list, itemCodes);
      cacheResult.cached.forEach(det => {
        const item = items.find(it => it.item_code === det.item_code);
        if (item) {
          Object.assign(item, {
            actual_qty: det.actual_qty,
            serial_no_data: det.serial_no_data,
            batch_no_data: det.batch_no_data,
            has_batch_no: det.has_batch_no,
            has_serial_no: det.has_serial_no,
          });
          if (det.item_uoms && det.item_uoms.length > 0) {
            item.item_uoms = det.item_uoms;
            saveItemUOMs(item.item_code, det.item_uoms);
          }
          if (det.rate !== undefined) {
            if (det.rate !== 0 || !item.rate) {
              item.rate = det.rate;
              item.price_list_rate = det.price_list_rate || det.rate;
            }
          }

          if (!item.original_rate) {
            item.original_rate = item.rate;
            item.original_currency = item.currency || vm.pos_profile.currency;
          }

          vm.applyCurrencyConversionToItem(item);
        }
      });

      let allCached = cacheResult.missing.length === 0;
      items.forEach((item) => {
        const localQty = getLocalStock(item.item_code);
        if (localQty !== null) {
          item.actual_qty = localQty;
        } else {
          allCached = false;
        }

        if (!item.item_uoms || item.item_uoms.length === 0) {
          const cachedUoms = getItemUOMs(item.item_code);
          if (cachedUoms.length > 0) {
            item.item_uoms = cachedUoms;
          } else if (isOffline()) {
            item.item_uoms = [{ uom: item.stock_uom, conversion_factor: 1.0 }];
          } else {
            allCached = false;
          }
        }
      });

      // When offline or everything is cached, skip server call
      if (isOffline() || allCached) {
        vm.itemDetailsRetryCount = 0;
        return;
      }

      // Cancel previous request
      if (vm.currentRequest) {
        vm.abortController.abort();
        vm.currentRequest = null;
      }

      vm.abortController = new AbortController();

      const itemsToFetch = items.filter(it => cacheResult.missing.includes(it.item_code));

      vm.currentRequest = frappe.call({
        method: "posawesome.posawesome.api.items.get_items_details",
        args: {
          pos_profile: JSON.stringify(vm.pos_profile),
          items_data: JSON.stringify(itemsToFetch),
          price_list: vm.active_price_list,
        },
        // Avoid freezing the UI while item details are fetched
        freeze: false,
        signal: vm.abortController.signal,
        callback: function (r) {
          if (r.message) {
            vm.itemDetailsRetryCount = 0;
            let qtyChanged = false;
            let updatedItems = [];

            // Batch updates to minimize reactivity triggers
            vm.$nextTick(() => {
              items.forEach((item) => {
                const updated_item = r.message.find(
                  (element) => element.item_code == item.item_code
                );
                if (updated_item) {
                  // Save previous quantity for comparison
                  const prev_qty = item.actual_qty;

                  // Prepare updates but don't apply them yet
                  updatedItems.push({
                    item: item,
                    updates: {
                      actual_qty: updated_item.actual_qty,
                      serial_no_data: updated_item.serial_no_data,
                      batch_no_data: updated_item.batch_no_data,
                      has_batch_no: updated_item.has_batch_no,
                      has_serial_no: updated_item.has_serial_no,
                      item_uoms: updated_item.item_uoms && updated_item.item_uoms.length > 0 ?
                        updated_item.item_uoms : item.item_uoms
                    }
                  });

                  // Track significant quantity changes
                  if (prev_qty > 0 && updated_item.actual_qty === 0) {
                    qtyChanged = true;
                  }

                  // Cache UOMs separately
                  if (updated_item.item_uoms && updated_item.item_uoms.length > 0) {
                    saveItemUOMs(item.item_code, updated_item.item_uoms);
                  }
                }
              });

              // Apply all updates in one batch
              updatedItems.forEach(({ item, updates }) => {
                Object.assign(item, updates);
                vm.applyCurrencyConversionToItem(item);
              });

              // Update local stock cache with latest quantities
              updateLocalStockCache(r.message);
              saveItemDetailsCache(vm.pos_profile.name, vm.active_price_list, r.message);

              // Force update if any item's quantity changed significantly
              if (qtyChanged) {
                vm.$forceUpdate();
              }
            });
          }
        },
        error: function (err) {
          if (err.name !== 'AbortError') {
            console.error("Error fetching item details:", err);
            // Fallback to local stock if server call fails
            items.forEach((item) => {
              const localQty = getLocalStock(item.item_code);
              if (localQty !== null) {
                item.actual_qty = localQty;
              }
              // Fallback to cached UOMs when offline or request fails
              if (!item.item_uoms || item.item_uoms.length === 0) {
                const cached = getItemUOMs(item.item_code);
                if (cached.length > 0) {
                  item.item_uoms = cached;
                }
              }
            });

            // do not retry if offline, wait for "server-online" event instead
            if (!isOffline()) {
              vm.itemDetailsRetryCount += 1;
              const delay = Math.min(32000, 1000 * Math.pow(2, vm.itemDetailsRetryCount - 1));
              vm.itemDetailsRetryTimeout = setTimeout(() => {
                vm.update_items_details(items);
              }, delay);
            }
          }
        }
      });

      // Cleanup on component destroy
      this.cleanupBeforeDestroy = () => {
        if (vm.abortController) {
          vm.abortController.abort();
        }
      };
    },
    update_cur_items_details() {
      if (this.filtered_items && this.filtered_items.length > 0) {
        this.update_items_details(this.filtered_items);
      }
    },
    async prePopulateStockCache(items) {
      if (this.prePopulateInProgress) {
        return;
      }
      this.prePopulateInProgress = true;
      try {
        // Use the new isStockCacheReady function
        if (isStockCacheReady()) {
          console.debug('Stock cache already initialized');
          return;
        }

        console.info('Pre-populating stock cache for', items.length, 'items');
        await initializeStockCache(items, this.pos_profile);
      } catch (error) {
        console.error('Failed to pre-populate stock cache:', error);
      } finally {
        this.prePopulateInProgress = false;
      }
    },

    applyCurrencyConversionToItems() {
      if (!this.items || !this.items.length) return;
      this.items.forEach(it => this.applyCurrencyConversionToItem(it));
    },

    applyCurrencyConversionToItem(item) {
      if (!item) return;
      const base = this.pos_profile.currency;

      if (!item.original_rate) {
        item.original_rate = item.rate;
        item.original_currency = item.currency || base;
      }

      // original_rate is in price list currency
      const price_list_rate = item.original_rate;
      const base_rate = price_list_rate * (item.plc_conversion_rate || 1);

      item.base_rate = base_rate;
      item.base_price_list_rate = price_list_rate;

      item.rate = this.flt(price_list_rate * (this.exchange_rate || 1), this.currency_precision);
      item.currency = this.selected_currency;
      item.price_list_rate = item.rate;
    },
    scan_barcoud() {
      const vm = this;
      try {
        // Check if scanner is already attached to document
        if (document._scannerAttached) {
          return;
        }

        onScan.attachTo(document, {
          suffixKeyCodes: [],
          keyCodeMapper: function (oEvent) {
            oEvent.stopImmediatePropagation();
            oEvent.preventDefault();
            return onScan.decodeKeyEvent(oEvent);
          },
          onScan: function (sCode) {
            setTimeout(() => {
              vm.trigger_onscan(sCode);
            }, 300);
          },
        });

        // Mark document as having scanner attached
        document._scannerAttached = true;
      } catch (error) {
        console.warn('Scanner initialization error:', error.message);
      }
    },
    trigger_onscan(sCode) {
      this.handleBarcodeSearch(sCode, true);
    },
    generateWordCombinations(inputString) {
      const words = inputString.split(" ");
      const wordCount = words.length;
      const combinations = [];

      // Helper function to generate all permutations
      function permute(arr, m = []) {
        if (arr.length === 0) {
          combinations.push(m.join(" "));
        } else {
          for (let i = 0; i < arr.length; i++) {
            const current = arr.slice();
            const next = current.splice(i, 1);
            permute(current.slice(), m.concat(next));
          }
        }
      }

      permute(words);

      return combinations;
    },
    clearSearch() {
      this.search_backup = this.first_search;
      this.first_search = "";
      this.search = "";
      // No need to call get_items() again
    },

    restoreSearch() {
      if (this.first_search === "") {
        this.first_search = this.search_backup;
        this.search = this.search_backup;
        // No need to reload items when focus is lost
      }
    },
    handleItemSearchFocus() {
      this.first_search = "";
      this.search = "";
      // Optionally, you might want to also clear search_backup if the behaviour should be a full reset on focus
      // this.search_backup = "";
    },

    clearQty() {
      this.qty = null;
    },

    startCameraScanning() {
      if (this.$refs.cameraScanner) {
        this.$refs.cameraScanner.startScanning();
      }
    },
    onBarcodeScanned(scannedCode) {
      console.log('Barcode scanned:', scannedCode);
      this.handleBarcodeSearch(scannedCode, true);
      this.search = '';
    },

    getConvertedRate(item) {
      if (!item.rate) return 0;
      if (!this.exchange_rate) return item.rate;

      // If exchange rate is 300 PKR = 1 USD
      // To convert PKR to USD: divide by exchange rate
      // Example: 3000 PKR / 300 = 10 USD
      const convertedRate = item.rate / this.exchange_rate;
      return this.flt(convertedRate, 4);
    },

    currencySymbol(currency) {
      return get_currency_symbol(currency);
    },
    format_currency(value, currency, precision) {
      const prec =
        typeof precision === 'number' ? precision : this.currency_precision;
      return this.formatCurrency(value, prec);
    },
    ratePrecision(value) {
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      return Number.isInteger(numericValue) ? 0 : this.currency_precision;
    },
    format_number(value, precision) {
      const prec =
        typeof precision === 'number' ? precision : this.float_precision;
      return this.formatFloat(value, prec);
    },
    hasDecimalPrecision(value) {
      // Check if the value has any decimal precision when converted by exchange rate
      if (this.exchange_rate && this.exchange_rate !== 1) {
        let convertedValue = value * this.exchange_rate;
        return !Number.isInteger(convertedValue);
      }
      return !Number.isInteger(value);
    },

    toggleItemSettings() {
      this.temp_hide_qty_decimals = this.hide_qty_decimals;
      this.temp_hide_zero_rate_items = this.hide_zero_rate_items;
      this.show_item_settings = true;
    },
    cancelItemSettings() {
      this.show_item_settings = false;
    },
    applyItemSettings() {
      this.hide_qty_decimals = this.temp_hide_qty_decimals;
      this.hide_zero_rate_items = this.temp_hide_zero_rate_items;
      this.saveItemSettings();
      this.show_item_settings = false;
    },
    saveItemSettings() {
      try {
        const settings = { 
          hide_qty_decimals: this.hide_qty_decimals,
          hide_zero_rate_items: this.hide_zero_rate_items,
        };
        localStorage.setItem('posawesome_item_selector_settings', JSON.stringify(settings));
      } catch (e) {
        console.error('Failed to save item selector settings:', e);
      }
    },
    loadItemSettings() {
      try {
        const saved = localStorage.getItem('posawesome_item_selector_settings');
        if (saved) {
          const opts = JSON.parse(saved);
          if (typeof opts.hide_qty_decimals === 'boolean') {
            this.hide_qty_decimals = opts.hide_qty_decimals;
          }
          if (typeof opts.hide_zero_rate_items === 'boolean') {
            this.hide_zero_rate_items = opts.hide_zero_rate_items;
          }
        }
      } catch (e) {
        console.error('Failed to load item selector settings:', e);
      }
    },
  },

  computed: {
    headers() {
      return this.getItemsHeaders();
    },
    filtered_items() {
      this.search = this.get_search(this.first_search);
      if (!this.pos_profile.pose_use_limit_search) {
        let filtred_list = [];
        let filtred_group_list = [];
        if (this.item_group != "ALL") {
          filtred_group_list = this.items.filter((item) =>
            item.item_group
              .toLowerCase()
              .includes(this.item_group.toLowerCase())
          );
        } else {
          filtred_group_list = this.items;
        }
        if (!this.search || this.search.length < 3) {
          let filtered = [];
          if (
            this.pos_profile.posa_show_template_items &&
            this.pos_profile.posa_hide_variants_items
          ) {
            filtered = filtred_group_list
              .filter((item) => !item.variant_of)
              .slice(0, this.itemsPerPage);
          } else {
            filtered = filtred_group_list.slice(0, this.itemsPerPage);
          }

          if (this.hide_zero_rate_items) {
            filtered = filtered.filter(item => parseFloat(item.rate) !== 0);
          }

          // Ensure quantities are defined
          filtered.forEach(item => {
            if (item.actual_qty === undefined) {
              item.actual_qty = 0;
            }
          });

          return filtered;
        } else if (this.search) {
          const term = this.search.toLowerCase();
          // Match barcode directly
          filtred_list = filtred_group_list.filter(item =>
            item.item_barcode.some(b => b.barcode === this.search)
          );

          if (filtred_list.length === 0) {
            // Match by code or name containing the term
            filtred_list = filtred_group_list.filter(item =>
              item.item_code.toLowerCase().includes(term) ||
              item.item_name.toLowerCase().includes(term)
            );
          }

          if (filtred_list.length === 0) {
            // Fallback to partial fuzzy match on name
            const search_combinations = this.generateWordCombinations(this.search);
            filtred_list = filtred_group_list.filter(item => {
              const nameLower = item.item_name.toLowerCase();
              return search_combinations.some(element => {
                element = element.toLowerCase().trim();
                const element_regex = new RegExp(`.*${element.split('').join('.*')}.*`);
                return element_regex.test(nameLower);
              });
            });
          }

          if (
            filtred_list.length === 0 &&
            this.pos_profile.posa_search_serial_no
          ) {
            filtred_list = filtred_group_list.filter(item => {
              for (let element of item.serial_no_data) {
                if (element.serial_no === this.search) {
                  this.flags.serial_no = this.search;
                  return true;
                }
              }
              return false;
            });
          }

          if (
            filtred_list.length === 0 &&
            this.pos_profile.posa_search_batch_no
          ) {
            filtred_list = filtred_group_list.filter(item => {
              for (let element of item.batch_no_data) {
                if (element.batch_no === this.search) {
                  this.flags.batch_no = this.search;
                  return true;
                }
              }
              return false;
            });
          }
        }

        let final_filtered_list = [];
        if (
          this.pos_profile.posa_show_template_items &&
          this.pos_profile.posa_hide_variants_items
        ) {
          final_filtered_list = filtred_list.filter((item) => !item.variant_of).slice(0, this.itemsPerPage);
        } else {
          final_filtered_list = filtred_list.slice(0, this.itemsPerPage);
        }

        if (this.hide_zero_rate_items) {
          final_filtered_list = final_filtered_list.filter(item => parseFloat(item.rate) !== 0);
        }

        // Ensure quantities are defined for each item
        final_filtered_list.forEach(item => {
          if (item.actual_qty === undefined) {
            item.actual_qty = 0;
          }
        });

        // Force request quantity update for filtered items
        if (final_filtered_list.length > 0) {
          setTimeout(() => {
            this.update_items_details(final_filtered_list);
          }, 100);
        }

        return final_filtered_list;
      } else {
        const items_list = this.items.slice(0, this.itemsPerPage);

        // Ensure quantities are defined
        items_list.forEach(item => {
          if (item.actual_qty === undefined) {
            item.actual_qty = 0;
          }
        });

        if (this.hide_zero_rate_items) {
          return items_list.filter(item => parseFloat(item.rate) !== 0);
        }

        return items_list;
      }
    },
    debounce_search: {
      get() {
        return this.first_search;
      },
      set: _.debounce(function (newValue) {
        this.first_search = newValue;
      }, 200),
    },
    debounce_qty: {
      get() {
        // Display the raw quantity while typing to avoid forced decimal format
        if (this.qty === null || this.qty === '') return '';
        return this.hide_qty_decimals ? Math.trunc(this.qty) : this.qty;
      },
      set: _.debounce(function (value) {
        let parsed = parseFloat(String(value).replace(/,/g, ''));
        if (isNaN(parsed)) {
          parsed = null;
        }
        if (this.hide_qty_decimals && parsed != null) {
          parsed = Math.trunc(parsed);
        }
        this.qty = parsed;
      }, 200),
    },
    isDarkTheme() {
      return this.$theme.current === 'dark';
    },
    active_price_list() {
      return this.customer_price_list || (this.pos_profile && this.pos_profile.selling_price_list);
    },
  },

  created: function () {
    this.loadItemSettings();
    if (typeof Worker !== 'undefined') {
      try {
        // Use the plain URL so the service worker can match the cached file
        // even when offline. Using a query string causes cache lookups to fail
        // which results in "Failed to fetch a worker script" errors.
        const workerUrl = '/assets/posawesome/js/posapp/workers/itemWorker.js';
        this.itemWorker = new Worker(workerUrl, { type: 'classic' });

        this.itemWorker.onerror = function (event) {
          console.error('Worker error:', event);
          console.error('Message:', event.message);
          console.error('Filename:', event.filename);
          console.error('Line number:', event.lineno);
        };
        console.log("Created worker nowwwwww")
      } catch (e) {
        console.error('Failed to start item worker', e);
        this.itemWorker = null;
      }
    }
    this.$nextTick(function () { });
    this.eventBus.on("register_pos_profile", async (data) => {
      await initPromise;
      this.pos_profile = data.pos_profile;
      if (this.pos_profile.posa_force_reload_items && !this.pos_profile.posa_smart_reload_mode) {
        await this.get_items(true);
      } else {
        await this.get_items();
      }
      this.get_items_groups();
      this.items_view = this.pos_profile.posa_default_card_view
        ? "card"
        : "list";
    });
    this.eventBus.on("update_cur_items_details", () => {
      this.update_cur_items_details();
    });
    this.eventBus.on("update_offers_counters", (data) => {
      this.offersCount = data.offersCount;
      this.appliedOffersCount = data.appliedOffersCount;
    });
    this.eventBus.on("update_coupons_counters", (data) => {
      this.couponsCount = data.couponsCount;
      this.appliedCouponsCount = data.appliedCouponsCount;
    });
    this.eventBus.on("update_customer_price_list", (data) => {
      this.customer_price_list = data;
    });
    this.eventBus.on("update_customer", (data) => {
      this.customer = data;
    });

    // Refresh item quantities when connection to server is restored
    this.eventBus.on("server-online", async () => {
      if (this.items && this.items.length > 0) {
        await this.update_items_details(this.items);
      }
    });

    // Setup auto-refresh for item quantities
    // Trigger an immediate refresh once items are available
    this.update_cur_items_details();
    this.refresh_interval = setInterval(() => {
      if (this.filtered_items && this.filtered_items.length > 0) {
        this.update_cur_items_details();
      }
    }, 30000); // Refresh every 30 seconds after the initial fetch

    // Add new event listener for currency changes
    this.eventBus.on("update_currency", (data) => {
      this.selected_currency = data.currency;
      this.exchange_rate = data.exchange_rate;

      // Refresh visible item prices when currency changes
      this.applyCurrencyConversionToItems();
      this.update_cur_items_details();
    });
  },

  mounted() {
    this.scan_barcoud();
    // grid layout adjusts automatically with CSS, no width tracking needed
  },

  beforeUnmount() {
    // Clear interval when component is destroyed
    if (this.refresh_interval) {
      clearInterval(this.refresh_interval);
    }

    if (this.itemDetailsRetryTimeout) {
      clearTimeout(this.itemDetailsRetryTimeout);
    }
    this.itemDetailsRetryCount = 0;

    // Call cleanup function for abort controller
    if (this.cleanupBeforeDestroy) {
      this.cleanupBeforeDestroy();
    }

    // Detach scanner if it was attached
    if (document._scannerAttached) {
      try {
        onScan.detachFrom(document);
        document._scannerAttached = false;
      } catch (error) {
        console.warn('Scanner detach error:', error.message);
      }
    }

    if (this.itemWorker) {
      this.itemWorker.terminate();
    }

    this.eventBus.off("update_currency");
    this.eventBus.off("server-online");
    this.eventBus.off("register_pos_profile");
    this.eventBus.off("update_cur_items_details");
    this.eventBus.off("update_offers_counters");
    this.eventBus.off("update_coupons_counters");
    this.eventBus.off("update_customer_price_list");
    this.eventBus.off("update_customer");
  },
};
</script>

<style scoped>
.dynamic-card {
  composes: pos-card;
}

.dynamic-padding {
  padding: var(--dynamic-xs) var(--dynamic-sm) var(--dynamic-xs) var(--dynamic-sm);
}

.dynamic-scroll {
  transition: max-height var(--transition-normal);
  padding-bottom: var(--dynamic-xs);
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--dynamic-sm);
  align-items: start;
  align-content: start;
}

.dynamic-item-card {
  margin: var(--dynamic-xs);
  transition: var(--transition-normal);
  background-color: var(--surface-secondary);
  display: flex;
  flex-direction: column;
  height: auto;
  box-sizing: border-box;
}

.dynamic-item-card .v-img {
  object-fit: contain;
}

.dynamic-item-card:hover {
  transform: scale(calc(1 + 0.02 * var(--font-scale)));
}

.text-success {
  color: #4CAF50 !important;
}

.sleek-data-table {
  composes: pos-table;
  margin: var(--dynamic-xs);
}

.sleek-data-table:hover {
  box-shadow: var(--shadow-md) !important;
}

.settings-container {
  display: flex;
  align-items: center;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Light mode card backgrounds */
.selection,
.cards {
  background-color: var(--surface-secondary) !important;
}

/* Consistent spacing with navbar and system */
.dynamic-spacing-sm {
  padding: var(--dynamic-sm) !important;
}

.action-btn-consistent {
  margin-top: var(--dynamic-xs) !important;
  padding: var(--dynamic-xs) var(--dynamic-sm) !important;
  transition: var(--transition-normal) !important;
}

.action-btn-consistent:hover {
  background-color: rgba(25, 118, 210, 0.1) !important;
  transform: translateY(-1px) !important;
}

/* Ensure consistent spacing with navbar pattern */
.cards {
  margin-top: var(--dynamic-sm) !important;
  padding: var(--dynamic-sm) !important;
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  .dynamic-padding {
    padding: var(--dynamic-xs) var(--dynamic-xs) var(--dynamic-xs) var(--dynamic-xs);
  }

  .dynamic-spacing-sm {
    padding: var(--dynamic-xs) !important;
  }

  .action-btn-consistent {
    padding: var(--dynamic-xs) !important;
    font-size: 0.875rem !important;
  }
}

@media (max-width: 480px) {
  .dynamic-padding {
    padding: var(--dynamic-xs) var(--dynamic-xs) var(--dynamic-xs) var(--dynamic-xs);
  }

  .cards {
    padding: var(--dynamic-xs) !important;
  }
}
</style>
