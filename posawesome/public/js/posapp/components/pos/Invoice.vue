<template>
  <!-- Main Invoice Wrapper -->
  <div class="pa-0">
    <!-- Cancel Sale Confirmation Dialog -->
    <CancelSaleDialog v-model="cancel_dialog" @confirm="cancel_invoice" />

    <!-- Reference Details Dialog -->
    <v-dialog v-model="reference_dialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 bg-primary white--text">
          <v-icon left color="white">mdi-file-document-edit</v-icon>
          {{ __("Enter Reference Details") }}
        </v-card-title>
        
        <v-card-text class="pt-6 pb-2">
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="reference_no"
                  :label="__('Reference Number')"
                  variant="outlined"
                  density="compact"
                  color="primary"
                  prepend-inner-icon="mdi-numeric"
                  :rules="[v => !!v || __('Reference Number is required')]"
                  required
                  hide-details="auto"
                  autocomplete="off" 
                  class="mb-3"
                ></v-text-field>
              </v-col>
              
              <v-col cols="12">
                <v-text-field
                  v-model="reference_name"
                  :label="__('Reference Name')"
                  variant="outlined"
                  density="compact"
                  color="primary"
                  prepend-inner-icon="mdi-account"
                  :rules="[v => !!v || __('Reference Name is required')]"
                  required
                  hide-details="auto"
                  autocomplete="off" 
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer></v-spacer>
          
          <v-btn
            color="grey"
            variant="outlined"
            @click="cancel_reference_dialog"
            prepend-icon="mdi-close"
          >
            {{ __("Cancel") }}
          </v-btn>
          
          <v-btn
            color="primary"
            variant="elevated"
            @click="confirm_reference_and_proceed"
            prepend-icon="mdi-credit-card"
            :disabled="!reference_no || !reference_name"
            class="ml-3"
          >
            {{ __("Proceed to Payment") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Main Invoice Card (contains all invoice content) -->
    <v-card
      :style="{ height: 'var(--container-height)', maxHeight: 'var(--container-height)', backgroundColor: isDarkTheme ? '#121212' : '' }"
      :class="['cards my-0 py-0 mt-3', isDarkTheme ? '' : 'bg-grey-lighten-5', { 'return-mode': isReturnInvoice }]">

      <!-- Dynamic padding wrapper -->
      <div class="dynamic-padding">
        <!-- Top Row: Customer Selection and Invoice Type -->
        <v-row align="center" class="items px-3 py-2">
          <v-col :cols="pos_profile.posa_allow_sales_order ? 9 : 12" class="pb-0 pr-0">
            <!-- Customer selection component -->
            <Customer />
          </v-col>
          <!-- Invoice Type Selection (Only shown if sales orders are allowed) -->
          <v-col v-if="pos_profile.posa_allow_sales_order" cols="3" class="pb-4">
            <v-select density="compact" hide-details variant="outlined" color="primary"
              :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" :items="invoiceTypes"
              :label="frappe._('Type')" v-model="invoiceType" :disabled="invoiceType == 'Return'"></v-select>
          </v-col>
        </v-row>


        <!-- Delivery Charges Section (Only if enabled in POS profile) -->
        <DeliveryCharges :pos_profile="pos_profile" :delivery_charges="delivery_charges"
          :selected_delivery_charge="selected_delivery_charge" :delivery_charges_rate="delivery_charges_rate"
          :deliveryChargesFilter="deliveryChargesFilter" :formatCurrency="formatCurrency"
          :currencySymbol="currencySymbol" :readonly="readonly"
          @update:selected_delivery_charge="(val) => { selected_delivery_charge = val; update_delivery_charges(); }" />

        <!-- Posting Date and Customer Balance Section -->
        <PostingDateRow :pos_profile="pos_profile" :posting_date_display="posting_date_display"
          :customer_balance="customer_balance" :price-list="selected_price_list" :price-lists="price_lists"
          :formatCurrency="formatCurrency" @update:posting_date_display="(val) => { posting_date_display = val; }"
          @update:priceList="(val) => { selected_price_list = val; }" />

        <!-- Multi-Currency Section (Only if enabled in POS profile) -->
        <MultiCurrencyRow :pos_profile="pos_profile" :selected_currency="selected_currency"
          :plc_conversion_rate="exchange_rate" :conversion_rate="conversion_rate"
          :available_currencies="available_currencies" :isNumber="isNumber"
          :price_list_currency="price_list_currency"
          @update:selected_currency="(val) => { selected_currency = val; update_currency(val); }"
          @update:plc_conversion_rate="(val) => { exchange_rate = val; update_exchange_rate(); }"
          @update:conversion_rate="(val) => { conversion_rate = val; update_conversion_rate(); }" />

        <!-- Items Table Section (Main items list for invoice) -->
        <!-- Add this right before the ItemsTable component -->
        <div class="column-selector-container">
          <v-btn density="compact" variant="text" color="primary" prepend-icon="mdi-cog-outline"
            @click="toggleColumnSelection" class="column-selector-btn">
            {{ __('Columns') }}
          </v-btn>

          <v-dialog v-model="show_column_selector" max-width="500px">
            <v-card>
              <v-card-title class="text-h6 pa-4 d-flex align-center">
                <span>{{ __('Select Columns to Display') }}</span>
                <v-spacer></v-spacer>
                <v-btn icon="mdi-close" variant="text" density="compact" @click="show_column_selector = false"></v-btn>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row dense>
                  <v-col cols="12" v-for="column in available_columns.filter(col => !col.required)" :key="column.key">
                    <v-switch v-model="temp_selected_columns" :label="column.title" :value="column.key" hide-details
                      density="compact" color="primary" class="column-switch mb-1"
                      :disabled="column.required"></v-switch>
                  </v-col>
                </v-row>
                <div class="text-caption mt-2">{{ __('Required columns cannot be hidden') }}</div>
              </v-card-text>
              <v-card-actions class="pa-4 pt-0">
                <v-btn color="error" variant="text" @click="cancelColumnSelection">{{ __('Cancel') }}</v-btn>
                <v-spacer></v-spacer>
                <v-btn color="primary" variant="tonal" @click="updateSelectedColumns">{{ __('Apply') }}</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>

        <!-- ItemsTable component with reorder event handler -->
        <ItemsTable
          :headers="items_headers"
          :items="items"
          :expanded="expanded"
          :itemsPerPage="itemsPerPage"
          :itemSearch="itemSearch"
          :pos_profile="pos_profile"
          :invoice_doc="invoice_doc"
          :invoiceType="invoiceType"
          :displayCurrency="displayCurrency"
          :formatFloat="formatFloat"
          :formatCurrency="formatCurrency"
          :currencySymbol="currencySymbol"
          :isNumber="isNumber"
          :setFormatedQty="setFormatedQty"
          :calcStockQty="calc_stock_qty"
          :setFormatedCurrency="setFormatedCurrency"
          :calcPrices="calc_prices"
          :calcUom="calc_uom"
          :setSerialNo="set_serial_no"
          :setBatchQty="set_batch_qty"
          :validateDueDate="validate_due_date"
          :removeItem="remove_item"
          :subtractOne="subtract_one"
          :addOne="add_one"
          :toggleOffer="toggleOffer"
          @update:expanded="expanded = $event"
          @reorder-items="handleItemReorder"
          @add-item-from-drag="handleItemDrop"
          @show-drop-feedback="showDropFeedback"
          @item-dropped="showDropFeedback(false)"
        />
      </div>
    </v-card>
    <!-- Payment Section -->
    <InvoiceSummary :pos_profile="pos_profile" :total_qty="total_qty" :additional_discount="additional_discount"
      :additional_discount_percentage="additional_discount_percentage"
      :total_items_discount_amount="total_items_discount_amount" :subtotal="subtotal" :displayCurrency="displayCurrency"
      :formatFloat="formatFloat" :formatCurrency="formatCurrency" :currencySymbol="currencySymbol"
      :discount_percentage_offer_name="discount_percentage_offer_name" :isNumber="isNumber"
      @update:additional_discount="val => additional_discount = val"
      @update:additional_discount_percentage="val => additional_discount_percentage = val"
      @update_discount_umount="update_discount_umount" @save-and-clear="save_and_clear_invoice"
      @load-drafts="get_draft_invoices" @select-order="get_draft_orders" @cancel-sale="cancel_dialog = true"
      @open-returns="open_returns" @print-draft="print_draft_invoice" @show-payment="show_payment" />
  </div>
</template>

<script>

import format from "../../format";
import Customer from "./Customer.vue";
import DeliveryCharges from "./DeliveryCharges.vue";
import PostingDateRow from "./PostingDateRow.vue";
import MultiCurrencyRow from "./MultiCurrencyRow.vue";
import CancelSaleDialog from "./CancelSaleDialog.vue";
import InvoiceSummary from "./InvoiceSummary.vue";
import ItemsTable from "./ItemsTable.vue";
import invoiceComputed from "./invoiceComputed";
import invoiceWatchers from "./invoiceWatchers";
import itemAddition from "./invoice-item/itemAddition";
import batchSerial from "./invoice-item/batchSerial";
import discountMethods from "./invoice-item/discounts";
import stockUtils from "./invoice-item/stockUtils";
import offerMethods from "./invoiceOfferMethods";
import shortcutMethods from "./invoiceShortcuts";
import invoiceItemMethods from "./invoiceItemMethods";
import { isOffline, saveCustomerBalance, getCachedCustomerBalance } from "../../../offline";

export default {
  name: 'POSInvoice',
  mixins: [format],
  data() {
    return {
      // POS profile settings
      pos_profile: "",
      pos_opening_shift: "",
      stock_settings: "",
      invoice_doc: "",
      return_doc: "",
      customer: "",
      customer_info: "",
      customer_balance: 0,
      discount_amount: 0,
      additional_discount: 0,
      additional_discount_percentage: 0,
      total_tax: 0,
      items: [], // List of invoice items
      posOffers: [], // All available offers
      posa_offers: [], // Offers applied to this invoice
      posa_coupons: [], // Coupons applied
      allItems: [], // All items for offer logic
      discount_percentage_offer_name: null, // Track which offer is applied
      invoiceTypes: ["Invoice", "Order"], // Types of invoices
      invoiceType: "Invoice", // Current invoice type
      itemsPerPage: 1000, // Items per page in table
      expanded: [], // Array of expanded row IDs
      singleExpand: true, // Only one row expanded at a time
      cancel_dialog: false, // Cancel dialog visibility
      reference_dialog: false, // Reference dialog visibility
      reference_no: '', // Reference number field
      reference_name: '', // Reference name field
      float_precision: 6, // Float precision for calculations
      currency_precision: 6, // Currency precision for display
      new_line: false, // Add new line for item
      delivery_charges: [], // List of delivery charges
      delivery_charges_rate: 0, // Selected delivery charge rate
      selected_delivery_charge: "", // Selected delivery charge object
      invoice_posting_date: false, // Posting date dialog
      posting_date: frappe.datetime.nowdate(), // Invoice posting date
      posting_date_display: '', // Display value for date picker
      items_headers: [],
      selected_currency: "", // Currently selected currency
      exchange_rate: 1, // Current exchange rate
      conversion_rate: 1, // Currency to company rate
      exchange_rate_date: "", // Date of fetched exchange rate
      company: null, // Company doc with default currency
      available_currencies: [], // List of available currencies
      price_lists: [], // Available selling price lists
      selected_price_list: "", // Currently selected price list
      price_list_currency: "", // Currency of the selected price list
      selected_columns: [], // Selected columns for items table
      temp_selected_columns: [], // Temporary array for column selection
      available_columns: [], // All available columns
      show_column_selector: false // Column selector dialog visibility
    };
  },

  components: {
    Customer,
    DeliveryCharges,
    PostingDateRow,
    MultiCurrencyRow,
    InvoiceSummary,
    CancelSaleDialog,
    ItemsTable,
  },
  computed: {
    ...invoiceComputed,
    isDarkTheme() {
      return this.$theme.current === 'dark';
    }
  },


  methods: {
    ...shortcutMethods,
    ...itemAddition,
    ...batchSerial,
    ...discountMethods,
    ...stockUtils,
    ...offerMethods,
    ...invoiceItemMethods,
    
    // Reference Dialog Methods
    show_payment() {
      // Check if reference details are required
      if (this.pos_profile.custom_add_reference_details) {
        console.log('Reference details required - showing dialog');
        this.reference_no = '';
        this.reference_name = '';
        this.reference_dialog = true;
        return;
      }
  
      // If no reference required, proceed directly to payment
      this.process_payment();
    },

    // Add this new method to handle the payment processing
    async process_payment() {
      try {
        let invoice_doc;
        if (this.invoice_doc.doctype == "Sales Order") {
          console.log('Processing Sales Order payment');
          invoice_doc = await this.process_invoice_from_order();
        } else {
          console.log('Processing regular invoice');
          invoice_doc = this.process_invoice();
        }

        if (!invoice_doc) {
          console.log('Failed to process invoice');
          return;
        }

        // Add reference details to invoice if provided
        if (this.reference_no || this.reference_name) {
          invoice_doc.custom_reference_no = this.reference_no;
          invoice_doc.custom_reference_name = this.reference_name;
        }

        // Update invoice_doc with current currency info
        invoice_doc.currency = this.selected_currency || this.pos_profile.currency;
        invoice_doc.conversion_rate = this.exchange_rate || 1;
        
        // Update totals in invoice_doc to match current calculations
        invoice_doc.total = this.Total;
        invoice_doc.grand_total = this.subtotal;
        
        // Apply rounding to get rounded total
        invoice_doc.rounded_total = this.roundAmount(this.subtotal);
        invoice_doc.base_total = this.Total * (1 / this.exchange_rate || 1);
        invoice_doc.base_grand_total = this.subtotal * (1 / this.exchange_rate || 1);
        invoice_doc.base_rounded_total = this.roundAmount(invoice_doc.base_grand_total);
        
        // Check if this is a return invoice
        if (this.invoiceType === 'Return' || invoice_doc.is_return) {
          console.log('Preparing RETURN invoice for payment with:', {
            is_return: invoice_doc.is_return,
            invoiceType: this.invoiceType,
            return_against: invoice_doc.return_against,
            items: invoice_doc.items.length,
            grand_total: invoice_doc.grand_total
          });
          
          // For return invoices, explicitly ensure all amounts are negative
          invoice_doc.is_return = 1;
          if (invoice_doc.grand_total > 0) invoice_doc.grand_total = -Math.abs(invoice_doc.grand_total);
          if (invoice_doc.rounded_total > 0) invoice_doc.rounded_total = -Math.abs(invoice_doc.rounded_total);
          if (invoice_doc.total > 0) invoice_doc.total = -Math.abs(invoice_doc.total);
          if (invoice_doc.base_grand_total > 0) invoice_doc.base_grand_total = -Math.abs(invoice_doc.base_grand_total);
          if (invoice_doc.base_rounded_total > 0) invoice_doc.base_rounded_total = -Math.abs(invoice_doc.base_rounded_total);
          if (invoice_doc.base_total > 0) invoice_doc.base_total = -Math.abs(invoice_doc.base_total);
          
          // Ensure all items have negative quantity and amount
          if (invoice_doc.items && invoice_doc.items.length) {
            invoice_doc.items.forEach(item => {
              if (item.qty > 0) item.qty = -Math.abs(item.qty);
              if (item.stock_qty > 0) item.stock_qty = -Math.abs(item.stock_qty);
              if (item.amount > 0) item.amount = -Math.abs(item.amount);
            });
          }
        }
        
        // Get payments with correct sign (positive/negative)
        invoice_doc.payments = this.get_payments();
        console.log('Final payment data:', invoice_doc.payments);

        // Double-check return invoice payments are negative
        if ((this.invoiceType === 'Return' || invoice_doc.is_return) && invoice_doc.payments.length) {
          invoice_doc.payments.forEach(payment => {
            if (payment.amount > 0) payment.amount = -Math.abs(payment.amount);
            if (payment.base_amount > 0) payment.base_amount = -Math.abs(payment.base_amount);
          });
          console.log('Ensured negative payment amounts for return:', invoice_doc.payments);
        }

        console.log('Showing payment dialog with currency:', invoice_doc.currency);
        this.eventBus.emit("show_payment", "true");
        this.eventBus.emit("send_invoice_doc_payment", invoice_doc);

      } catch (error) {
        console.error('Error in process_payment:', error);
        this.eventBus.emit("show_message", {
          title: __("Error processing payment"),
          color: "error",
          message: error.message
        });
      }
    },

    // Add this new method to handle reference dialog confirmation
    async confirm_reference_and_proceed() {
      try {
        // Validate reference fields if required
        if (this.pos_profile.custom_add_reference_details) {
          if (!this.reference_no || !this.reference_name) {
            this.eventBus.emit("show_message", {
              title: __("Please fill in both reference number and reference name"),
              color: "error"
            });
            return;
          }
        }

        // Close the reference dialog
        this.reference_dialog = false;

        // Proceed with payment processing
        await this.process_payment();

      } catch (error) {
        console.error('Error in confirm_reference_and_proceed:', error);
        this.eventBus.emit("show_message", {
          title: __("Error processing reference details"),
          color: "error",
          message: error.message
        });
      }
    },

    // Add this method to handle reference dialog cancellation
    cancel_reference_dialog() {
      this.reference_dialog = false;
      this.reference_no = '';
      this.reference_name = '';
    },

    initializeItemsHeaders() {
      // Define all available columns
      this.available_columns = [
        { title: __('Name'), align: 'start', sortable: true, key: 'item_name', required: true },
        { title: __('QTY'), key: 'qty', align: 'center', required: true },
        { title: __('UOM'), key: 'uom', align: 'center', required: false },
        { title: __('Rate'), key: 'rate', align: 'center', required: true },
        { title: __('Last Inc Rate'), key: 'last_incoming_rate', align: 'center', required: false },
        { title: __('Discount %'), key: 'discount_value', align: 'center', required: false },
        { title: __('Discount Amount'), key: 'discount_amount', align: 'center', required: false },
        { title: __('Amount'), key: 'amount', align: 'center', required: true },
        { title: __('Offer?'), key: 'posa_is_offer', align: 'center', required: false },
      ];

      // Initialize selected columns if empty
      if (!this.selected_columns || this.selected_columns.length === 0) {
        // By default, select all required columns and those enabled in POS profile
        this.selected_columns = this.available_columns
          .filter(col => {
            if (col.required) return true;
            if (col.key === 'discount_value' && this.pos_profile.posa_display_discount_percentage) return true;
            if (col.key === 'discount_amount' && this.pos_profile.posa_display_discount_amount) return true;
            if (col.key === 'last_incoming_rate' && this.pos_profile.custom_show_last_incoming_rate) return true;
            return false;
          })
          .map(col => col.key);
      }

      // Generate headers based on selected columns
      this.updateHeadersFromSelection();
    },
    // Handle item dropped from ItemsSelector to ItemsTable
    handleItemDrop(item) {
      console.log('Item dropped:', item);

      // Use the existing add_item method to add the dropped item
      this.add_item(item);

      // Show success feedback
      this.eventBus.emit("show_message", {
        title: __(`Item {0} added to invoice`, [item.item_name]),
        color: "success",
      });
    },

    // Show visual feedback when item is being dragged over drop zone
    showDropFeedback(isDragging) {
      // Add visual feedback class to the items table
      const itemsTable = this.$el.querySelector('.modern-items-table');
      if (itemsTable) {
        if (isDragging) {
          itemsTable.classList.add('drag-over');
        } else {
          itemsTable.classList.remove('drag-over');
        }
      }
    },
    toggleColumnSelection() {
      // Create a copy of selected columns for temporary editing
      this.temp_selected_columns = [...this.selected_columns];
      this.show_column_selector = true;
    },

    cancelColumnSelection() {
      // Discard changes
      this.show_column_selector = false;
    },

    updateHeadersFromSelection() {
      // Generate headers based on selected columns (without closing dialog)
      this.items_headers = this.available_columns.filter(col =>
        this.selected_columns.includes(col.key) || col.required
      );
    },

    updateSelectedColumns() {
      // Apply the temporary selection
      this.selected_columns = [...this.temp_selected_columns];

      // Add required columns if they're not already included
      const requiredKeys = this.available_columns
        .filter(col => col.required)
        .map(col => col.key);

      requiredKeys.forEach(key => {
        if (!this.selected_columns.includes(key)) {
          this.selected_columns.push(key);
        }
      });

      // Update headers
      this.updateHeadersFromSelection();

      // Save preferences
      this.saveColumnPreferences();

      // Close dialog
      this.show_column_selector = false;
    },

    saveColumnPreferences() {
      try {
        localStorage.setItem('posawesome_selected_columns', JSON.stringify(this.selected_columns));
      } catch (e) {
        console.error('Failed to save column preferences:', e);
      }
    },

    loadColumnPreferences() {
      try {
        const saved = localStorage.getItem('posawesome_selected_columns');
        if (saved) {
          this.selected_columns = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load column preferences:', e);
      }
    },
    makeid(length) {
      let result = "";
      const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
      const charactersLength = characters.length;
      for (var i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }
      return result;
    },


    print_draft_invoice() {
      if (!this.pos_profile.posa_allow_print_draft_invoices) {
        this.eventBus.emit("show_message", {
          title: __(`You are not allowed to print draft invoices`),
          color: "error",
        });
        return;
      }
      let invoice_name = this.invoice_doc.name;
      frappe.run_serially([
        () => {
          const invoice_doc = this.save_and_clear_invoice();
          invoice_name = invoice_doc.name ? invoice_doc.name : invoice_name;
        },
        () => {
          this.load_print_page(invoice_name);
        },
      ]);
    },
    async set_delivery_charges() {
      var vm = this;
      if (
        !this.pos_profile ||
        !this.customer ||
        !this.pos_profile.posa_use_delivery_charges
      ) {
        this.delivery_charges = [];
        this.delivery_charges_rate = 0;
        this.selected_delivery_charge = "";
        return;
      }
      this.delivery_charges_rate = 0;
      this.selected_delivery_charge = "";
      try {
        const r = await frappe.call({
          method:
            "posawesome.posawesome.api.offers.get_applicable_delivery_charges",
          args: {
            company: this.pos_profile.company,
            pos_profile: this.pos_profile.name,
            customer: this.customer,
          },
        });
        if (r.message && r.message.length) {
          console.log(r.message);
          vm.delivery_charges = r.message;
        }
      } catch (error) {
        console.error("Failed to fetch delivery charges", error);
      }
    },
    deliveryChargesFilter(itemText, queryText, itemRow) {
      const item = itemRow.raw;
      console.log("dl charges", item)
      const textOne = item.name.toLowerCase();
      const searchText = queryText.toLowerCase();
      return textOne.indexOf(searchText) > -1;
    },
    update_delivery_charges() {

      if (this.selected_delivery_charge) {
        this.delivery_charges_rate = this.selected_delivery_charge.rate;
      } else {
        this.delivery_charges_rate = 0;
      }
    },
    updatePostingDate(date) {
      if (!date) return;
      this.posting_date = date;
      this.$forceUpdate();
    },
    // Override setFormatedFloat for qty field to handle return mode
    setFormatedQty(item, field_name, precision, no_negative, value) {
      // Use the regular formatter method from the mixin
      let parsedValue = this.setFormatedFloat(item, field_name, precision, no_negative, value);

      // Ensure negative value for return invoices
      if (this.isReturnInvoice && parsedValue > 0) {
        parsedValue = -Math.abs(parsedValue);
        item[field_name] = parsedValue;
      }

      return parsedValue;
    },
    async fetch_available_currencies() {
      try {
        console.log("Fetching available currencies...");
        const r = await frappe.call({
          method: "posawesome.posawesome.api.invoices.get_available_currencies"
        });

        if (r.message) {
          console.log("Received currencies:", r.message);

          // Get base currency for reference
          const baseCurrency = this.pos_profile.currency;

          // Create simple currency list with just names
          this.available_currencies = r.message.map(currency => {
            return {
              value: currency.name,
              title: currency.name
            };
          });

          // Sort currencies - base currency first, then others alphabetically
          this.available_currencies.sort((a, b) => {
            if (a.value === baseCurrency) return -1;
            if (b.value === baseCurrency) return 1;
            return a.value.localeCompare(b.value);
          });

          // Set default currency if not already set
          if (!this.selected_currency) {
            this.selected_currency = baseCurrency;
          }

          return this.available_currencies;
        }

        return [];
      } catch (error) {
        console.error("Error fetching currencies:", error);
        // Set default currency as fallback
        const defaultCurrency = this.pos_profile.currency;
        this.available_currencies = [{
          value: defaultCurrency,
          title: defaultCurrency
        }];
        this.selected_currency = defaultCurrency;
        return this.available_currencies;
      }
    },

    async fetch_price_lists() {
      if (this.pos_profile.posa_enable_price_list_dropdown) {
        try {
          const r = await frappe.call({
            method: "posawesome.posawesome.api.posapp.get_selling_price_lists",
          });
          if (r && r.message) {
            this.price_lists = r.message.map((pl) => pl.name);
          }
        } catch (error) {
          console.error("Failed fetching price lists", error);
          this.price_lists = [this.pos_profile.selling_price_list];
        }
      } else {
        // Fallback to the price list defined in the POS Profile
        this.price_lists = [this.pos_profile.selling_price_list];
      }

      if (!this.selected_price_list) {
        this.selected_price_list = this.pos_profile.selling_price_list;
      }

      // Fetch and store currency for the applied price list
      try {
        const r = await frappe.call({
          method: "posawesome.posawesome.api.invoices.get_price_list_currency",
          args: { price_list: this.selected_price_list },
        });
        if (r && r.message) {
          this.price_list_currency = r.message;
        }
      } catch (error) {
        console.error("Failed fetching price list currency", error);
      }

      return this.price_lists;
    },

    async update_currency(currency) {
      if (!currency) return;
      this.selected_currency = currency;
      await this.update_currency_and_rate();
    },

    update_exchange_rate() {
      if (!this.exchange_rate || this.exchange_rate <= 0) {
        this.exchange_rate = 1;
      }

      // Emit currency update
      this.eventBus.emit("update_currency", {
        currency: this.selected_currency || this.pos_profile.currency,
        exchange_rate: this.exchange_rate
      });

      this.update_item_rates();
    },

    update_conversion_rate() {
      if (!this.conversion_rate || this.conversion_rate <= 0) {
        this.conversion_rate = 1;
      }

      this.sync_exchange_rate();
    },

    update_item_rates() {
      console.log('Updating item rates with exchange rate:', this.exchange_rate);

      this.items.forEach(item => {
        // Set skip flag to avoid double calculations
        item._skip_calc = true;

        // First ensure base rates exist for all items
        if (!item.base_rate) {
          console.log(`Setting base rates for ${item.item_code} for the first time`);
          const baseCurrency = this.price_list_currency || this.pos_profile.currency;
          if (this.selected_currency === baseCurrency) {
            // When in base currency, base rates = displayed rates
            item.base_rate = item.rate;
            item.base_price_list_rate = item.price_list_rate;
            item.base_discount_amount = item.discount_amount || 0;
          } else {
            // When in another currency, calculate base rates
            item.base_rate = item.rate / this.exchange_rate;
            item.base_price_list_rate = item.price_list_rate / this.exchange_rate;
            item.base_discount_amount = (item.discount_amount || 0) / this.exchange_rate;
          }
        }

        // Currency conversion logic
        const baseCurrency = this.price_list_currency || this.pos_profile.currency;
        if (this.selected_currency === baseCurrency) {
          // When switching back to default currency, restore from base rates
          console.log(`Restoring rates for ${item.item_code} from base rates`);
          item.price_list_rate = item.base_price_list_rate;
          item.rate = item.base_rate;
          item.discount_amount = item.base_discount_amount;
        } else if (item.original_currency === this.selected_currency) {
          // When selected currency matches the price list currency,
          // no conversion should be applied
          console.log(
            `Using original currency rates for ${item.item_code}`
          );
          item.price_list_rate = item.base_price_list_rate;
          item.rate = item.base_rate;
          item.discount_amount = item.base_discount_amount;
        } else {
          // When switching to another currency, convert from base rates
          console.log(`Converting rates for ${item.item_code} to ${this.selected_currency}`);

            // Convert base currency values to the selected currency
            const converted_price = this.flt(item.base_price_list_rate * this.exchange_rate, this.currency_precision);
            const converted_rate = this.flt(item.base_rate * this.exchange_rate, this.currency_precision);
            const converted_discount = this.flt(item.base_discount_amount * this.exchange_rate, this.currency_precision);

          // Ensure we don't set values to 0 if they're just very small
          item.price_list_rate = converted_price < 0.000001 ? 0 : converted_price;
          item.rate = converted_rate < 0.000001 ? 0 : converted_rate;
          item.discount_amount = converted_discount < 0.000001 ? 0 : converted_discount;
        }

        // Always recalculate final amounts
        item.amount = this.flt(item.qty * item.rate, this.currency_precision);
        item.base_amount = this.flt(item.qty * item.base_rate, this.currency_precision);

        console.log(`Updated rates for ${item.item_code}:`, {
          price_list_rate: item.price_list_rate,
          base_price_list_rate: item.base_price_list_rate,
          rate: item.rate,
          base_rate: item.base_rate,
          discount: item.discount_amount,
          base_discount: item.base_discount_amount,
          amount: item.amount,
          base_amount: item.base_amount,
        });

        // Apply any other pricing rules if needed
        this.calc_item_price(item);
      });

      // Force UI update after all calculations
      this.$forceUpdate();
    },

    formatCurrency(value, precision = null) {
      const prec = precision != null ? precision : this.currency_precision;
      return this.$options.mixins[0].methods.formatCurrency.call(this, value, prec);
    },

    flt(value, precision = null) {
      // Enhanced float handling for small numbers
      if (precision === null) {
        precision = this.float_precision;
      }

      const _value = Number(value);
      if (isNaN(_value)) {
        return 0;
      }

      // Handle very small numbers to prevent them from becoming 0
      if (Math.abs(_value) < 0.000001) {
        return _value;
      }

      return Number((_value || 0).toFixed(precision));
    },

    // Update currency and exchange rate when currency is changed
    async update_currency_and_rate() {
      if (!this.selected_currency) return;

      const companyCurrency = (this.company && this.company.default_currency) || this.pos_profile.currency;
      const priceListCurrency = this.price_list_currency || companyCurrency;

      try {
        // Price list currency to selected currency rate
        if (this.selected_currency === priceListCurrency) {
          this.exchange_rate = 1;
        } else {
          const r = await frappe.call({
            method: "posawesome.posawesome.api.invoices.fetch_exchange_rate_pair",
            args: {
              from_currency: priceListCurrency,
              to_currency: this.selected_currency,
            },
          });
          if (r && r.message) {
            this.exchange_rate = r.message.exchange_rate;
          }
        }

        // Selected currency to company currency rate
        if (this.selected_currency === companyCurrency) {
          this.conversion_rate = 1;
          this.exchange_rate_date = this.formatDateForBackend(this.posting_date_display);
        } else {
          const r2 = await frappe.call({
            method: "posawesome.posawesome.api.invoices.fetch_exchange_rate_pair",
            args: {
              from_currency: this.selected_currency,
              to_currency: companyCurrency,
            },
          });
          if (r2 && r2.message) {
            this.conversion_rate = r2.message.exchange_rate;
            this.exchange_rate_date = r2.message.date;
            const posting_backend = this.formatDateForBackend(this.posting_date_display);
            if (this.exchange_rate_date && posting_backend !== this.exchange_rate_date) {
              this.eventBus.emit("show_message", {
                title: __(
                  "Exchange rate date " +
                    this.exchange_rate_date +
                    " differs from posting date " +
                    posting_backend
                ),
                color: "warning",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error updating currency:", error);
        this.eventBus.emit("show_message", {
          title: "Error updating currency",
          color: "error",
        });
      }

      this.sync_exchange_rate();

      // If items already exist, update the invoice on the server so that
      // the document currency and rates remain consistent
      if (this.items.length) {
        const doc = this.get_invoice_doc();
        doc.currency = this.selected_currency;
        doc.price_list_currency = priceListCurrency || this.pos_profile.currency;
        doc.conversion_rate = this.conversion_rate;
        doc.plc_conversion_rate = this.exchange_rate;
        try {
          await this.update_invoice(doc);
        } catch (error) {
          console.error("Error updating invoice currency:", error);
          this.eventBus.emit("show_message", {
            title: "Error updating currency",
            color: "error",
          });
        }
      }
    },

    async update_exchange_rate_on_server() {
      if (this.conversion_rate) {
        if (!this.items.length) {
          this.sync_exchange_rate();
          return;
        }

        const doc = this.get_invoice_doc();
        doc.conversion_rate = this.conversion_rate;
        doc.plc_conversion_rate = this.exchange_rate;
        try {
          const resp = await this.update_invoice(doc);
          if (resp && resp.exchange_rate_date) {
            this.exchange_rate_date = resp.exchange_rate_date;
            const posting_backend = this.formatDateForBackend(this.posting_date_display);
            if (posting_backend !== this.exchange_rate_date) {
              this.eventBus.emit("show_message", {
                title: __("Exchange rate date " + this.exchange_rate_date + " differs from posting date " + posting_backend),
                color: "warning",
              });
            }
          }
          this.sync_exchange_rate();
        } catch (error) {
          console.error("Error updating exchange rate:", error);
          this.eventBus.emit("show_message", {
            title: "Error updating exchange rate",
            color: "error",
          });
        }
      }
    },

    sync_exchange_rate() {
      if (!this.exchange_rate || this.exchange_rate <= 0) {
        this.exchange_rate = 1;
      }
      if (!this.conversion_rate || this.conversion_rate <= 0) {
        this.conversion_rate = 1;
      }

      // Emit currency update
      this.eventBus.emit("update_currency", {
        currency: this.selected_currency || this.pos_profile.currency,
        exchange_rate: this.exchange_rate,
        conversion_rate: this.conversion_rate
      });

      this.update_item_rates();
    },

    // Add new rounding function
    roundAmount(amount) {
      // Respect POS Profile setting to disable rounding
      if (this.pos_profile.disable_rounded_total) {
        // Use configured precision without applying rounding
        return this.flt(amount, this.currency_precision);
      }
      // If multi-currency is enabled and selected currency is different from base currency
      const baseCurrency = this.price_list_currency || this.pos_profile.currency;
      if (this.pos_profile.posa_allow_multi_currency &&
        this.selected_currency !== baseCurrency) {
        // For multi-currency, just keep 2 decimal places without rounding to nearest integer
        return this.flt(amount, 2);
      }
      // For base currency or when multi-currency is disabled, round to nearest integer
      return Math.round(amount);
    },

    async calc_uom(item, value) {
      const new_uom = item.item_uoms.find((element) => element.uom == value);
      if (!new_uom) {
        // this.eventBus.emit("show_message", {
        //   title: __("UOM not found"),
        //   color: "error",
        // });
        return;
      }

      // Store old conversion factor for ratio calculation
      const old_conversion_factor = item.conversion_factor || 1;
      
      // Update conversion factor
      item.conversion_factor = new_uom.conversion_factor;

      // Reset discount if not offer
      if (!item.posa_offer_applied) {
        item.discount_amount = 0;
        item.discount_percentage = 0;
      }

      try {
        // Fetch item price for the specific UOM
        const response = await frappe.call({
          method: "posawesome.posawesome.api.invoice.get_item_price_for_uom",
          args: {
            item_code: item.item_code,
            price_list: this.get_price_list(),
            uom: value,
            customer: this.customer,
            company: this.pos_profile.company,
            currency: this.pos_profile.currency,
            conversion_factor: item.conversion_factor
          }
        });

        if (response && response.message && response.message.price_list_rate) {
          // Use the fetched price from Item Price
          const fetched_rate = response.message.price_list_rate;
          
          // Set base rates (always in base currency)
          item.base_rate = fetched_rate;
          item.base_price_list_rate = fetched_rate;
          
          // Convert to selected currency if needed
          if (this.selected_currency !== this.pos_profile.currency) {
            // If exchange rate is 300 PKR = 1 USD
            // To convert PKR to USD: divide by exchange rate
            item.rate = this.flt(fetched_rate / this.exchange_rate, this.currency_precision);
            item.price_list_rate = item.rate;
          } else {
            item.rate = fetched_rate;
            item.price_list_rate = fetched_rate;
          }
          
          console.log(`Found Item Price for ${item.item_code} with UOM ${value}: ${fetched_rate}`);
          
        } else {
          // Fallback to conversion factor calculation if no Item Price found
          console.log(`No Item Price found for ${item.item_code} with UOM ${value}, using conversion factor`);
          this.fallbackToConversionFactor(item, old_conversion_factor);
        }
      } catch (error) {
        console.error("Error fetching item price for UOM:", error);
        
        // Fallback to conversion factor calculation on error
        this.fallbackToConversionFactor(item, old_conversion_factor);
        
        this.eventBus.emit("show_message", {
          title: __("Could not fetch item price for UOM, using conversion factor"),
          color: "warning",
        });
      }

      // Update item details and force UI update
      this.calc_stock_qty(item, item.qty);
      this.$forceUpdate();
    },

    fallbackToConversionFactor(item, old_conversion_factor) {
      if (!item.original_base_rate && !item.posa_offer_applied) {
        item.original_base_rate = item.base_rate / old_conversion_factor;
        item.original_base_price_list_rate = item.base_price_list_rate / old_conversion_factor;
      }

      if (item.batch_price) {
        item.base_rate = item.batch_price * item.conversion_factor;
        item.base_price_list_rate = item.base_rate;
      } else if (item.original_base_rate) {
        item.base_rate = item.original_base_rate * item.conversion_factor;
        item.base_price_list_rate = item.original_base_price_list_rate * item.conversion_factor;
      }
      
      // Convert to selected currency
      if (this.selected_currency !== this.pos_profile.currency) {
        item.rate = this.flt(item.base_rate / this.exchange_rate, this.currency_precision);
        item.price_list_rate = this.flt(item.base_price_list_rate / this.exchange_rate, this.currency_precision);
      } else {
        item.rate = item.base_rate;
        item.price_list_rate = item.base_price_list_rate;
      }
    },

    // Increase quantity of an item (handles return logic)
    add_one(item) {
      // Increase quantity, return items remain negative
      item.qty++;
      if (item.qty == 0) {
        this.remove_item(item);
      }
      this.calc_stock_qty(item, item.qty);
      this.$forceUpdate();
    },

    // Decrease quantity of an item (handles return logic)
    subtract_one(item) {
      // Decrease quantity, return items remain negative
      item.qty--;
      if (item.qty == 0) {
        this.remove_item(item);
      }
      this.calc_stock_qty(item, item.qty);
      this.$forceUpdate();
    },

    // Handle item reordering from drag and drop
    handleItemReorder(reorderData) {
      const { fromIndex, toIndex } = reorderData;

      if (fromIndex === toIndex) return;

      // Create a copy of the items array
      const newItems = [...this.items];

      // Remove the item from its original position
      const [movedItem] = newItems.splice(fromIndex, 1);

      // Insert the item at its new position
      newItems.splice(toIndex, 0, movedItem);

      // Update the items array
      this.items = newItems;

      // Show success feedback
      this.eventBus.emit("show_message", {
        title: __("Item order updated"),
        color: "success",
      });

      // Optionally, you can also update the idx field for each item
      this.items.forEach((item, index) => {
        item.idx = index + 1;
      });
    },
  },

  mounted() {
    // Load saved column preferences
    this.loadColumnPreferences();
    this.eventBus.on("item-drag-start", (item) => {
      this.showDropFeedback(true);
    });
    this.eventBus.on("item-drag-end", () => {
      this.showDropFeedback(false);
    });

    // Register event listeners for POS profile, items, customer, offers, etc.
    this.eventBus.on("register_pos_profile", (data) => {
      this.pos_profile = data.pos_profile;
      this.company = data.company || null;
      this.customer = data.pos_profile.customer;
      this.pos_opening_shift = data.pos_opening_shift;
      this.stock_settings = data.stock_settings;
      const prec = parseInt(data.pos_profile.posa_decimal_precision);
      if (!isNaN(prec)) {
        this.float_precision = prec;
        this.currency_precision = prec;
      }
      this.invoiceType = this.pos_profile.posa_default_sales_order
        ? "Order"
        : "Invoice";
      this.initializeItemsHeaders();

      // Add this block to handle currency initialization
      if (this.pos_profile.posa_allow_multi_currency) {
        this.fetch_available_currencies().then(async () => {
          // Set default currency after currencies are loaded
          this.selected_currency = this.pos_profile.currency;
          // Fetch proper exchange rate from server
          await this.update_currency_and_rate();
        }).catch(error => {
          console.error("Error initializing currencies:", error);
          this.eventBus.emit("show_message", {
            title: __("Error loading currencies"),
            color: "error"
          });
        });
      }

      this.fetch_price_lists();
      this.update_price_list();
    });
    this.eventBus.on("add_item", this.add_item);
    this.eventBus.on("update_customer", (customer) => {
      this.customer = customer;
    });
    this.eventBus.on("fetch_customer_details", () => {
      this.fetch_customer_details();
    });
    this.eventBus.on("clear_invoice", () => {
      this.clear_invoice();
    });
    this.eventBus.on("load_invoice", (data) => {
      this.load_invoice(data);
    });
    this.eventBus.on("load_order", (data) => {
      this.new_order(data);
      // this.eventBus.emit("set_pos_coupons", data.posa_coupons);
    });
    this.eventBus.on("set_offers", (data) => {
      this.posOffers = data;
    });
    this.eventBus.on("update_invoice_offers", (data) => {
      this.updateInvoiceOffers(data);
    });
    this.eventBus.on("update_invoice_coupons", (data) => {
      this.posa_coupons = data;
      this.handelOffers();
    });
    this.eventBus.on("set_all_items", (data) => {
      this.allItems = data;
      this.items.forEach((item) => {
        this.update_item_detail(item);
      });
    });
    this.eventBus.on("load_return_invoice", (data) => {
      // Handle loading of return invoice and set all related fields
      console.log("Invoice component received load_return_invoice event with data:", data);
      this.load_invoice(data.invoice_doc);
      // Explicitly mark as return invoice
      this.invoiceType = "Return";
      this.invoiceTypes = ["Return"];
      this.invoice_doc.is_return = 1;
      // Ensure negative values for returns
      if (this.items && this.items.length) {
        this.items.forEach(item => {
          // Ensure item quantities are negative
          if (item.qty > 0) item.qty = -Math.abs(item.qty);
          if (item.stock_qty > 0) item.stock_qty = -Math.abs(item.stock_qty);
        });
      }
      if (data.return_doc) {
        console.log("Return against existing invoice:", data.return_doc.name);
        // Ensure negative discount amounts
        this.discount_amount = data.return_doc.discount_amount > 0 ?
          -Math.abs(data.return_doc.discount_amount) :
          data.return_doc.discount_amount;
        this.additional_discount_percentage = data.return_doc.additional_discount_percentage > 0 ?
          -Math.abs(data.return_doc.additional_discount_percentage) :
          data.return_doc.additional_discount_percentage;
        this.return_doc = data.return_doc;
        // Set return_against reference
        this.invoice_doc.return_against = data.return_doc.name;
      } else {
        console.log("Return without invoice reference");
        // For return without invoice, reset discount values
        this.discount_amount = 0;
        this.additional_discount_percentage = 0;
      }
      console.log("Invoice state after loading return:", {
        invoiceType: this.invoiceType,
        is_return: this.invoice_doc.is_return,
        items: this.items.length,
        customer: this.customer
      });
    });
    this.eventBus.on("set_new_line", (data) => {
      this.new_line = data;
    });
    if (this.pos_profile.posa_allow_multi_currency) {
      this.fetch_available_currencies();
    }
    // Listen for reset_posting_date to reset posting date after invoice submission
    this.eventBus.on("reset_posting_date", () => {
      this.posting_date = frappe.datetime.nowdate();
    });
    this.eventBus.on("open_variants_model", this.open_variants_model);
    this.eventBus.on("calc_uom", this.calc_uom);
    this.eventBus.on("item-drag-start", (item) => {
      this.showDropFeedback(true);
    });
    this.eventBus.on("item-drag-end", () => {
      this.showDropFeedback(false);
    });
  },
  // Cleanup event listeners before component is destroyed
  beforeUnmount() {
    // Existing cleanup
    this.eventBus.off("register_pos_profile");
    this.eventBus.off("add_item");
    this.eventBus.off("update_customer");
    this.eventBus.off("fetch_customer_details");
    this.eventBus.off("clear_invoice");
    // Cleanup reset_posting_date listener
    this.eventBus.off("reset_posting_date");
  },
  // Register global keyboard shortcuts when component is created
  created() {
    document.addEventListener("keydown", this.shortOpenPayment.bind(this));
    document.addEventListener("keydown", this.shortDeleteFirstItem.bind(this));
    document.addEventListener("keydown", this.shortOpenFirstItem.bind(this));
    document.addEventListener("keydown", this.shortSelectDiscount.bind(this));
  },
  // Remove global keyboard shortcuts when component is unmounted
  unmounted() {
    document.removeEventListener("keydown", this.shortOpenPayment);
    document.removeEventListener("keydown", this.shortDeleteFirstItem);
    document.removeEventListener("keydown", this.shortOpenFirstItem);
    document.removeEventListener("keydown", this.shortSelectDiscount);
  },
  watch: invoiceWatchers,
};
</script>

<style scoped>
/* Card background adjustments */
.cards {
  background-color: var(--surface-secondary) !important;
}

/* Style for selected checkbox button */
.v-checkbox-btn.v-selected {
  background-color: var(--submit-start) !important;
  color: white;
}

/* Bottom border for elements */
.border_line_bottom {
  border-bottom: 1px solid var(--field-border);
}

/* Disable pointer events for elements */
.disable-events {
  pointer-events: none;
}

/* Style for customer balance field */
:deep(.balance-field) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

/* Style for balance value text */
:deep(.balance-value) {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-start);
  margin-left: var(--dynamic-xs);
}

/* Red border and label for return mode card */

/* Red border and label for return mode card */

.return-mode {
  border: 2px solid rgb(var(--v-theme-error)) !important;
  position: relative;
}

/* Label for return mode card */
.return-mode::before {
  content: 'RETURN';
  position: absolute;
  top: 0;
  right: 0;
  background-color: rgb(var(--v-theme-error));
  color: white;
  padding: 4px 12px;
  font-weight: bold;
  border-bottom-left-radius: 8px;
  z-index: 1;
}

/* Dynamic padding for responsive layout */
.dynamic-padding {
  padding: var(--dynamic-xs) var(--dynamic-sm) var(--dynamic-xs) var(--dynamic-sm);
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  .dynamic-padding {
    padding: var(--dynamic-xs) var(--dynamic-xs) var(--dynamic-xs) var(--dynamic-xs);
  }

  .dynamic-padding .v-row {
    margin: 0 -2px;
  }

  .dynamic-padding .v-col {
    padding: 2px 4px;
  }
}

@media (max-width: 480px) {
  .dynamic-padding {
    padding: var(--dynamic-xs) var(--dynamic-xs) var(--dynamic-xs) var(--dynamic-xs);
  }

  .dynamic-padding .v-row {
    margin: 0 -1px;
  }

  .dynamic-padding .v-col {
    padding: 1px 2px;
  }
}

.column-selector-container {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
  background-color: var(--surface-secondary);
  border-radius: 8px 8px 0 0;
}

:deep(.dark-theme) .column-selector-container,
:deep(.v-theme--dark) .column-selector-container {
  background-color: #1E1E1E;
}

.column-selector-btn {
  font-size: 0.875rem;
}

/* New styles for improved column switches */
:deep(.column-switch) {
  margin: 0;
  padding: 0;
}

:deep(.column-switch .v-switch__track) {
  opacity: 0.7;
}

:deep(.column-switch .v-switch__thumb) {
  transform: scale(0.8);
}

:deep(.column-switch .v-label) {
  opacity: 0.9;
  font-size: 0.95rem;
}
</style>