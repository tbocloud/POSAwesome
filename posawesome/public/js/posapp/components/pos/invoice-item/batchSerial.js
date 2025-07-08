export default {
    // Set serial numbers for an item (and update qty)
    set_serial_no(item) {
      console.log(item)
      if (!item.has_serial_no) return;
      item.serial_no = "";
      item.serial_no_selected.forEach((element) => {
        item.serial_no += element + "\n";
      });
      item.serial_no_selected_count = item.serial_no_selected.length;
      if (item.serial_no_selected_count != item.stock_qty) {
        item.qty = item.serial_no_selected_count;
        this.calc_stock_qty(item, item.qty);
        this.$forceUpdate();
      }
    },

    // Set batch number for an item (and update batch data)
    set_batch_qty(item, value, update = true) {
      console.log('Setting batch quantity:', item, value);
      const existing_items = this.items.filter(
        (element) =>
          element.item_code == item.item_code &&
          element.posa_row_id != item.posa_row_id
      );
      const used_batches = {};
      item.batch_no_data.forEach((batch) => {
        used_batches[batch.batch_no] = {
          ...batch,
          used_qty: 0,
          remaining_qty: batch.batch_qty,
        };
        existing_items.forEach((element) => {
          if (element.batch_no && element.batch_no == batch.batch_no) {
            used_batches[batch.batch_no].used_qty += element.qty;
            used_batches[batch.batch_no].remaining_qty -= element.qty;
            used_batches[batch.batch_no].batch_qty -= element.qty;
          }
        });
      });

      const batch_no_data = Object.values(used_batches)
        .filter((batch) => batch.remaining_qty > 0)
        .sort((a, b) => {
          if (a.expiry_date && b.expiry_date) {
            return new Date(a.expiry_date) - new Date(b.expiry_date);
          } else if (a.expiry_date) {
            return -1;
          } else if (b.expiry_date) {
            return 1;
          } else if (a.manufacturing_date && b.manufacturing_date) {
            return new Date(a.manufacturing_date) - new Date(b.manufacturing_date);
          } else if (a.manufacturing_date) {
            return -1;
          } else if (b.manufacturing_date) {
            return 1;
          } else {
            return b.remaining_qty - a.remaining_qty;
          }
        });

      if (batch_no_data.length > 0) {
        let batch_to_use = null;
        if (value) {
          batch_to_use = batch_no_data.find((batch) => batch.batch_no == value);
        }
        if (!batch_to_use) {
          batch_to_use = batch_no_data[0];
        }

        item.batch_no = batch_to_use.batch_no;
        item.actual_batch_qty = batch_to_use.batch_qty;
        item.batch_no_expiry_date = batch_to_use.expiry_date;

        if (batch_to_use.batch_price) {
          // Store batch price in base currency
          item.base_batch_price = batch_to_use.batch_price;

          // Convert batch price to selected currency if needed
          const baseCurrency = this.price_list_currency || this.pos_profile.currency;
          if (this.selected_currency !== baseCurrency) {
            // If exchange rate is 285 PKR = 1 USD
            // To convert PKR to USD: divide by exchange rate
            item.batch_price = this.flt(batch_to_use.batch_price / this.exchange_rate, this.currency_precision);
          } else {
            item.batch_price = batch_to_use.batch_price;
          }

          // Set rates based on batch price
          item.base_price_list_rate = item.base_batch_price;
          item.base_rate = item.base_batch_price;

          if (this.selected_currency !== baseCurrency) {
            item.price_list_rate = item.batch_price;
            item.rate = item.batch_price;
          } else {
            item.price_list_rate = item.base_batch_price;
            item.rate = item.base_batch_price;
          }

          // Reset discounts since we're using batch price
          item.discount_percentage = 0;
          item.discount_amount = 0;
          item.base_discount_amount = 0;

          // Calculate final amounts
          item.amount = this.flt(item.qty * item.rate, this.currency_precision);
          item.base_amount = this.flt(item.qty * item.base_rate, this.currency_precision);

          console.log('Updated batch prices:', {
            base_batch_price: item.base_batch_price,
            batch_price: item.batch_price,
            rate: item.rate,
            base_rate: item.base_rate,
            price_list_rate: item.price_list_rate,
            exchange_rate: this.exchange_rate
          });

        } else if (update) {
          item.batch_price = null;
          item.base_batch_price = null;
          this.update_item_detail(item);
        }
      } else {
        item.batch_no = null;
        item.actual_batch_qty = null;
        item.batch_no_expiry_date = null;
        item.batch_price = null;
        item.base_batch_price = null;
      }

      // Update batch_no_data
      item.batch_no_data = batch_no_data;

      // Force UI update
      this.$forceUpdate();
    }
};
