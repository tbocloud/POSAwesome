<template>
  <div class="my-0 py-0 overflow-y-auto" :style="{ height: 'calc(var(--container-height) - 80px)', maxHeight: 'calc(var(--container-height) - 80px)' }">
    <v-data-table-virtual
      :headers="headers"
      :items="items"
      :theme="$theme.current"
      :expanded="expanded"
      show-expand
      item-value="posa_row_id"
      class="modern-items-table elevation-2"
      :items-per-page="itemsPerPage"
      expand-on-click
      density="compact"
      hide-default-footer
      :single-expand="true"
      :header-props="headerProps"
      @update:expanded="$emit('update:expanded', $event)"
      :search="itemSearch"
    >
      <!-- Custom cell renderers for numeric values with proper alignment -->
      <template v-slot:item.qty="{ item }">
        <div class="amount-value">{{ formatFloat(item.qty, hide_qty_decimals ? 0 : undefined) }}</div>
      </template>

      <template v-slot:item.rate="{ item }">
        <div class="currency-display">
          <span class="currency-symbol">{{ currencySymbol(displayCurrency) }}</span>
          <span class="amount-value">{{ formatCurrency(item.rate) }}</span>
        </div>
      </template>

      <template v-slot:item.amount="{ item }">
        <div class="currency-display">
          <span class="currency-symbol">{{ currencySymbol(displayCurrency) }}</span>
          <span class="amount-value">{{ formatCurrency(item.qty * item.rate) }}</span>
        </div>
      </template>

      <template v-slot:item.discount_value="{ item }">
        <div class="amount-value">
          {{ formatFloat(item.discount_percentage || (item.price_list_rate ? (item.discount_amount / item.price_list_rate) * 100 : 0)) }}%
        </div>
      </template>

      <template v-slot:item.discount_amount="{ item }">
        <div class="currency-display">
          <span class="currency-symbol">{{ currencySymbol(displayCurrency) }}</span>
          <span class="amount-value">{{ formatCurrency(item.discount_amount || 0) }}</span>
        </div>
      </template>

      <template v-slot:item.price_list_rate="{ item }">
        <div class="currency-display">
          <span class="currency-symbol">{{ currencySymbol(displayCurrency) }}</span>
          <span class="amount-value">{{ formatCurrency(item.price_list_rate) }}</span>
        </div>
      </template>

      <template v-slot:item.posa_is_offer="{ item }">
        <v-checkbox-btn v-model="item.posa_is_offer" class="center" @change="toggleOffer(item)"></v-checkbox-btn>
      </template>

      <!-- Enhanced expandable row with modern design -->
      <template v-slot:expanded-row="{ columns: headers, item }">
        <td :colspan="headers.length" class="ma-0 pa-0">
          <div class="expanded-content">
            <!-- Action buttons with improved layout and visual feedback -->
            <div class="action-panel">
              <div class="action-button-group">
                <v-btn :disabled="!!item.posa_is_replace" icon="mdi-trash-can-outline" size="large" color="error"
                  variant="tonal" class="item-action-btn delete-btn" @click.stop="removeItem(item)">
                  <v-icon size="large">mdi-trash-can-outline</v-icon>
                  <span class="action-label">{{ __('Remove') }}</span>
                </v-btn>
              </div>
              
              <div class="action-button-group">
                <v-btn :disabled="!!item.posa_is_replace" size="large" color="warning" variant="tonal"
                  class="item-action-btn minus-btn" @click.stop="subtractOne(item)">
                  <v-icon size="large">mdi-minus-circle-outline</v-icon>
                  <span class="action-label">{{ __('Decrease') }}</span>
                </v-btn>
                <v-btn :disabled="!!item.posa_is_replace" size="large" color="success" variant="tonal"
                  class="item-action-btn plus-btn" @click.stop="addOne(item)">
                  <v-icon size="large">mdi-plus-circle-outline</v-icon>
                  <span class="action-label">{{ __('Increase') }}</span>
                </v-btn>
              </div>
            </div>

            <!-- Item details form with improved layout -->
            <div class="item-details-form">
              <!-- First row of fields -->
              <div class="form-row">
                <div class="form-field">
                  <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Item Code')"
                    :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details v-model="item.item_code" disabled
                    prepend-inner-icon="mdi-barcode"></v-text-field>
                </div>
                <div class="form-field">
                  <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('QTY')"
                    :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details :model-value="formatFloat(item.qty, hide_qty_decimals ? 0 : undefined)" @change="[
                      setFormatedQty(item, 'qty', null, false, $event.target.value),
                      calcStockQty(item, item.qty),
                    ]" :rules="[isNumber]" :disabled="!!item.posa_is_replace"
                    prepend-inner-icon="mdi-numeric"></v-text-field>
                </div>
                <div class="form-field">
                  <v-select density="compact" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" :label="frappe._('UOM')" v-model="item.uom"
                    :items="item.item_uoms" variant="outlined" item-title="uom" item-value="uom" hide-details
                    @update:model-value="calcUom(item, $event)"
                    :disabled="!!item.posa_is_replace || (isReturnInvoice && invoice_doc.return_against)"
                    prepend-inner-icon="mdi-weight"></v-select>
                </div>
              </div>

              <!-- Second row of fields -->
              <div class="form-row">
                <div class="form-field">
                  <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Rate')"
                    :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details :prefix="currencySymbol(displayCurrency)"
                    :model-value="formatCurrency(item.rate)" @change="[
                      setFormatedCurrency(item, 'rate', null, false, $event),
                      calcPrices(item, $event.target.value, $event),
                    ]" :rules="[isNumber]" id="rate" :disabled="!!item.posa_is_replace ||
                      !!item.posa_offer_applied ||
                      !pos_profile.posa_allow_user_to_edit_rate ||
                      (isReturnInvoice && invoice_doc.return_against)"></v-text-field>
                </div>
                <div class="form-field">
                  <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Discount %')"
                    :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details :model-value="formatFloat(item.discount_percentage)" @change="[
                      setFormatedCurrency(item, 'discount_percentage', null, true, $event),
                      calcPrices(item, $event.target.value, $event),
                    ]" :rules="[isNumber]" id="discount_percentage" :disabled="!!item.posa_is_replace ||
                      item.posa_offer_applied ||
                      !pos_profile.posa_allow_user_to_edit_item_discount ||
                      (isReturnInvoice && invoice_doc.return_against)" suffix="%"></v-text-field>
                </div>
                <div class="form-field">
                  <v-text-field density="compact" variant="outlined" color="primary"
                    :label="frappe._('Discount Amount')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                    :model-value="formatCurrency(item.discount_amount || 0)" ref="discount"
                    @change="(event) => { if (expanded && expanded.length === 1 && expanded[0] === item.posa_row_id) { calcPrices(item, event.target.value, { target: { id: 'discount_amount' } }); } }"
                    :rules="['isNumber']" id="discount_amount"
                    :disabled="!!item.posa_is_replace || item.posa_offer_applied || !pos_profile.posa_allow_user_to_edit_item_discount || (isReturnInvoice && invoice_doc.return_against)"
                    :prefix="currencySymbol(displayCurrency)"></v-text-field>
                </div>
              </div>

              <!-- Third row of fields -->
              <div class="form-row">
                <div class="form-field">
                  <v-text-field density="compact" variant="outlined" color="primary"
                    :label="frappe._('Price list Rate')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                    :model-value="formatCurrency(item.price_list_rate)" disabled
                    :prefix="currencySymbol(displayCurrency)"></v-text-field>
                </div>
                <div class="form-field">
                  <v-text-field density="compact" variant="outlined" color="primary"
                    :label="frappe._('Available QTY')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                    :model-value="formatFloat(item.actual_qty, hide_qty_decimals ? 0 : undefined)" disabled></v-text-field>
                </div>
                <div class="form-field">
                  <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Group')"
                    :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details v-model="item.item_group" disabled></v-text-field>
                </div>
              </div>

              <!-- Fourth row of fields -->
              <div class="form-row">
                <div class="form-field">
                  <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Stock QTY')"
                    :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details :model-value="formatFloat(item.stock_qty)" disabled></v-text-field>
                </div>
                <div class="form-field">
                  <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Stock UOM')"
                    :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details v-model="item.stock_uom" disabled></v-text-field>
                </div>
                <div class="form-field" v-if="item.posa_offer_applied">
                  <v-checkbox density="compact" :label="frappe._('Offer Applied')" v-model="item.posa_offer_applied"
                    readonly hide-details class="mt-1"></v-checkbox>
                </div>
              </div>

              <!-- Serial Number Section -->
              <div class="form-section" v-if="item.has_serial_no == 1 || item.serial_no">
                <div class="form-row">
                  <div class="form-field">
                    <v-text-field density="compact" variant="outlined" color="primary"
                      :label="frappe._('Serial No QTY')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                      v-model="item.serial_no_selected_count" type="number" disabled></v-text-field>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-field full-width">
                    <v-autocomplete v-model="item.serial_no_selected" :items="item.serial_no_data"
                      item-title="serial_no" variant="outlined" density="compact" chips color="primary" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field"
                      :label="frappe._('Serial No')" multiple
                      @update:model-value="setSerialNo(item)"></v-autocomplete>
                  </div>
                </div>
              </div>

              <!-- Batch Number Section -->
              <div class="form-section" v-if="item.has_batch_no == 1 || item.batch_no">
                <div class="form-row">
                  <div class="form-field">
                    <v-text-field density="compact" variant="outlined" color="primary"
                      :label="frappe._('Batch No. Available QTY')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                      :model-value="formatFloat(item.actual_batch_qty, hide_qty_decimals ? 0 : undefined)" disabled></v-text-field>
                  </div>
                  <div class="form-field">
                    <v-text-field density="compact" variant="outlined" color="primary"
                      :label="frappe._('Batch No Expiry Date')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                      v-model="item.batch_no_expiry_date" disabled></v-text-field>
                  </div>
                  <div class="form-field">
                    <v-autocomplete v-model="item.batch_no" :items="item.batch_no_data" item-title="batch_no"
                      variant="outlined" density="compact" color="primary" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" :label="frappe._('Batch No')"
                      @update:model-value="setBatchQty(item, $event)" hide-details>
                      <template v-slot:item="{ props, item }">
                        <v-list-item v-bind="props">
                          <v-list-item-title v-html="item.raw.batch_no"></v-list-item-title>
                          <v-list-item-subtitle v-html="`Available QTY  '${item.raw.batch_qty}' - Expiry Date ${item.raw.expiry_date}`"></v-list-item-subtitle>
                        </v-list-item>
                      </template>
                    </v-autocomplete>
                  </div>
                </div>
              </div>

              <!-- Delivery Date Section -->
              <div class="form-section" v-if="pos_profile.posa_allow_sales_order && invoiceType == 'Order'">
                <div class="form-row">
                  <div class="form-field">
                    <VueDatePicker
                      v-model="item.posa_delivery_date"
                      model-type="format"
                      format="dd-MM-yyyy"
                      :min-date="new Date()"
                      auto-apply
                      :dark="isDarkTheme"
                      @update:model-value="validateDueDate(item)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </template>
    </v-data-table-virtual>
  </div>
</template>

<script>
export default {
  name: 'ItemsTable',
  props: {
    headers: Array,
    items: Array,
    expanded: Array,
    itemsPerPage: Number,
    itemSearch: String,
    pos_profile: Object,
    invoice_doc: Object,
    invoiceType: String,
    displayCurrency: String,
    formatFloat: Function,
    formatCurrency: Function,
    currencySymbol: Function,
    isNumber: Function,
    setFormatedQty: Function,
    calcStockQty: Function,
    setFormatedCurrency: Function,
    calcPrices: Function,
    calcUom: Function,
    setSerialNo: Function,
    setBatchQty: Function,
    validateDueDate: Function,
    removeItem: Function,
    subtractOne: Function,
    addOne: Function,
    isReturnInvoice: Boolean,
    toggleOffer: Function,
  },
  computed: {
    headerProps() {
      return this.isDarkTheme
        ? { style: 'background-color:#121212;color:#fff' }
        : {};
    },
    isDarkTheme() {
      return this.$theme.current === 'dark';
    },
    hide_qty_decimals() {
      try {
        const saved = localStorage.getItem('posawesome_item_selector_settings');
        if (saved) {
          const opts = JSON.parse(saved);
          return !!opts.hide_qty_decimals;
        }
      } catch (e) {
        console.error('Failed to load item selector settings:', e);
      }
      return false;
    },
  },
};
</script>

<style>
/* Modern table styling with enhanced visual hierarchy */
.modern-items-table {
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(0, 0, 0, 0.09);
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

/* Table wrapper styling */
.modern-items-table :deep(.v-data-table__wrapper),
.modern-items-table :deep(.v-table__wrapper) {
  border-radius: var(--border-radius-sm);
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
}

/* Table header styling */
.modern-items-table :deep(th) {
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 12px 16px;
  transition: background-color var(--transition-normal);
  border-bottom: 2px solid var(--table-header-border);
  background-color: var(--table-header-bg);
  color: var(--table-header-text);
  position: sticky;
  top: 0;
  z-index: 1;
}

/* Table row styling */
.modern-items-table :deep(tr) {
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.modern-items-table :deep(tr:hover) {
  background-color: var(--table-row-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

/* Table cell styling */
.modern-items-table :deep(td) {
  padding: 12px 16px;
  vertical-align: middle;
}

/* Expanded content styling */
.expanded-content {
  padding: var(--dynamic-md);
  background-color: var(--surface-secondary);
  border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.05);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Action panel styling */
.action-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 16px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: var(--border-radius-md);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

:deep(.dark-theme) .action-panel,
:deep(.v-theme--dark) .action-panel {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.action-button-group {
  display: flex;
  gap: 8px;
}

/* Item action buttons styling */
.item-action-btn {
  min-width: 44px !important;
  height: 44px !important;
  border-radius: 12px !important;
  transition: all 0.3s ease;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1) !important;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 0 16px !important;
}

.item-action-btn .action-label {
  margin-left: 8px;
  font-weight: 500;
  display: none;
}

@media (min-width: 600px) {
  .item-action-btn .action-label {
    display: inline-block;
  }
  
  .item-action-btn {
    min-width: 120px !important;
  }
}

.item-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.15) !important;
}

.item-action-btn .v-icon {
  font-size: 22px !important;
  position: relative;
  z-index: 2;
}

/* Light theme button styles with enhanced gradients */
.item-action-btn.delete-btn {
  background: linear-gradient(145deg, #ffebee, #ffcdd2) !important;
}

.item-action-btn.delete-btn:hover {
  background: linear-gradient(145deg, #ffcdd2, #ef9a9a) !important;
}

.item-action-btn.minus-btn {
  background: linear-gradient(145deg, #fff8e1, #ffecb3) !important;
}

.item-action-btn.minus-btn:hover {
  background: linear-gradient(145deg, #ffecb3, #ffe082) !important;
}

.item-action-btn.plus-btn {
  background: linear-gradient(145deg, #e8f5e9, #c8e6c9) !important;
}

.item-action-btn.plus-btn:hover {
  background: linear-gradient(145deg, #c8e6c9, #a5d6a7) !important;
}

/* Dark theme button styles */
:deep(.dark-theme) .item-action-btn.delete-btn,
:deep(.v-theme--dark) .item-action-btn.delete-btn {
  background: linear-gradient(145deg, #4a1515, #3a1010) !important;
  color: #ff8a80 !important;
}

:deep(.dark-theme) .item-action-btn.delete-btn:hover,
:deep(.v-theme--dark) .item-action-btn.delete-btn:hover {
  background: linear-gradient(145deg, #5a1a1a, #4a1515) !important;
}

:deep(.dark-theme) .item-action-btn.minus-btn,
:deep(.v-theme--dark) .item-action-btn.minus-btn {
  background: linear-gradient(145deg, #4a3c10, #3a2e0c) !important;
  color: #ffe082 !important;
}

:deep(.dark-theme) .item-action-btn.minus-btn:hover,
:deep(.v-theme--dark) .item-action-btn.minus-btn:hover {
  background: linear-gradient(145deg, #5a4a14, #4a3c10) !important;
}

:deep(.dark-theme) .item-action-btn.plus-btn,
:deep(.v-theme--dark) .item-action-btn.plus-btn {
  background: linear-gradient(145deg, #1b4620, #133419) !important;
  color: #a5d6a7 !important;
}

:deep(.dark-theme) .item-action-btn.plus-btn:hover,
:deep(.v-theme--dark) .item-action-btn.plus-btn:hover {
  background: linear-gradient(145deg, #235828, #1b4620) !important;
}

:deep(.dark-theme) .item-action-btn .v-icon,
:deep(.v-theme--dark) .item-action-btn .v-icon {
  opacity: 0.9;
}

/* Form layout styling */
.item-details-form {
  margin-top: 16px;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.form-field {
  flex: 1;
  min-width: 200px;
}

.form-field.full-width {
  flex-basis: 100%;
}

.form-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

:deep(.dark-theme) .form-section,
:deep(.v-theme--dark) .form-section {
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

/* Currency and amount display */
.currency-display {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.currency-symbol {
  opacity: 0.7;
  margin-right: 2px;
  font-size: 0.85em;
}

.amount-value {
  font-weight: 500;
  text-align: right;
}
</style>