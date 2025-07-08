export default {

    // Update additional discount amount based on percentage
    update_discount_umount() {
      const value = flt(this.additional_discount_percentage);
      // If value is too large, reset to 0
      if (value < -100 || value > 100) {
        this.additional_discount_percentage = 0;
        this.additional_discount = 0;
        return;
      }

      // Calculate discount amount based on percentage
      if (this.Total && this.Total !== 0) {
        this.additional_discount = (this.Total * value) / 100;
      } else {
        this.additional_discount = 0;
      }
    },

    // Calculate prices and discounts for an item based on field change
    calc_prices(item, value, $event) {
      if (!$event?.target?.id || !item) return;

      const fieldId = $event.target.id;
      let newValue = flt(value, this.currency_precision);

      try {
        // Flag to track manual rate changes
        if (fieldId === 'rate') {
          item._manual_rate_set = true;
        }

        // Handle negative values
        if (newValue < 0) {
          newValue = 0;
          this.eventBus.emit("show_message", {
            title: __("Negative values not allowed"),
            color: "error"
          });
        }

        // Convert price_list_rate to current currency for calculations
        const baseCurrency = this.price_list_currency || this.pos_profile.currency;
        const converted_price_list_rate = this.selected_currency !== baseCurrency ?
          this.flt(item.price_list_rate / this.exchange_rate, this.currency_precision) :
          item.price_list_rate;

        // Field-wise calculations
        switch (fieldId) {
          case "rate":
            // Store base rate and convert to selected currency
            item.base_rate = this.flt(newValue / this.exchange_rate, this.currency_precision);
            item.rate = newValue;

            // Calculate discount amount in selected currency
            item.discount_amount = this.flt(converted_price_list_rate - item.rate, this.currency_precision);
            item.base_discount_amount = this.flt(item.price_list_rate - item.base_rate, this.currency_precision);

            // Calculate percentage based on converted values
            if (converted_price_list_rate) {
              item.discount_percentage = this.flt((item.discount_amount / converted_price_list_rate) * 100, this.float_precision);
            }
            break;

          case "discount_amount":
            console.log("[calc_prices] Event Target ID:", fieldId);
            console.log("[calc_prices] RAW value received by function:", value); // <-- ADDED THIS
            console.log("[calc_prices] Original item.price_list_rate:", item.price_list_rate);
            console.log("[calc_prices] Converted price_list_rate for calc:", converted_price_list_rate);
            console.log("[calc_prices] Input value (newValue before Math.min):", newValue);

            // Ensure discount amount doesn't exceed price list rate
            newValue = Math.min(newValue, converted_price_list_rate);
            console.log("[calc_prices] Input value (newValue after Math.min):", newValue);

            // Store base discount and convert to selected currency
            item.base_discount_amount = this.flt(newValue / this.exchange_rate, this.currency_precision);
            item.discount_amount = newValue;
            console.log("[calc_prices] Updated item.discount_amount:", item.discount_amount);
            console.log("[calc_prices] Updated item.base_discount_amount:", item.base_discount_amount);

            // Update rate based on discount
            item.rate = this.flt(converted_price_list_rate - item.discount_amount, this.currency_precision);
            item.base_rate = this.flt(item.price_list_rate - item.base_discount_amount, this.currency_precision);
            console.log("[calc_prices] Calculated item.rate:", item.rate);
            console.log("[calc_prices] Calculated item.base_rate:", item.base_rate);

            // Calculate percentage
            if (converted_price_list_rate) {
              item.discount_percentage = this.flt((item.discount_amount / converted_price_list_rate) * 100, this.float_precision);
            } else {
              item.discount_percentage = 0; // Avoid division by zero
            }
            console.log("[calc_prices] Calculated item.discount_percentage:", item.discount_percentage);
            break;

          case "discount_percentage":
            // Ensure percentage doesn't exceed 100%
            newValue = Math.min(newValue, 100);
            item.discount_percentage = this.flt(newValue, this.float_precision);

            // Calculate discount amount in selected currency
            item.discount_amount = this.flt((converted_price_list_rate * item.discount_percentage) / 100, this.currency_precision);
            item.base_discount_amount = this.flt((item.price_list_rate * item.discount_percentage) / 100, this.currency_precision);

            // Update rates
            item.rate = this.flt(converted_price_list_rate - item.discount_amount, this.currency_precision);
            item.base_rate = this.flt(item.price_list_rate - item.base_discount_amount, this.currency_precision);
            break;
        }

        // Ensure rate doesn't go below zero
        if (item.rate < 0) {
          item.rate = 0;
          item.base_rate = 0;
          item.discount_amount = converted_price_list_rate;
          item.base_discount_amount = item.price_list_rate;
          item.discount_percentage = 100;
        }

        // Update stock calculations and force UI update
        this.calc_stock_qty(item, item.qty);
        this.$forceUpdate();

      } catch (error) {
        console.error("Error calculating prices:", error);
        this.eventBus.emit("show_message", {
          title: __("Error calculating prices"),
          color: "error"
        });
      }
    },

    // Calculate item price and discount fields
    calc_item_price(item) {
      // Skip recalculation if called from update_item_rates to avoid double calculations
      if (item._skip_calc) {
        item._skip_calc = false;
        return;
      }

      if (!item.posa_offer_applied) {
        if (item.price_list_rate) {
          // Always work with base rates first
          if (!item.base_price_list_rate) {
            item.base_price_list_rate = item.price_list_rate;
            item.base_rate = item.rate;
          }

          // Convert to selected currency
          const baseCurrency = this.price_list_currency || this.pos_profile.currency;
          if (this.selected_currency !== baseCurrency) {
            // If exchange rate is 300 PKR = 1 USD
            // To convert PKR to USD: divide by exchange rate
            // Example: 3000 PKR / 300 = 10 USD
            item.price_list_rate = this.flt(item.base_price_list_rate / this.exchange_rate, this.currency_precision);
            item.rate = this.flt(item.base_rate / this.exchange_rate, this.currency_precision);
          } else {
            item.price_list_rate = item.base_price_list_rate;
            item.rate = item.base_rate;
          }
        }
      }

      // Handle discounts
      if (item.discount_percentage) {
        // Calculate discount in selected currency
        const price_list_rate = item.price_list_rate;
        const discount_amount = this.flt((price_list_rate * item.discount_percentage) / 100, this.currency_precision);

        item.discount_amount = discount_amount;
        item.rate = this.flt(price_list_rate - discount_amount, this.currency_precision);

        // Store base discount amount
        const baseCurrency = this.price_list_currency || this.pos_profile.currency;
        if (this.selected_currency !== baseCurrency) {
          // Convert discount amount back to base currency by dividing by exchange rate
          item.base_discount_amount = this.flt(discount_amount / this.exchange_rate, this.currency_precision);
        } else {
          item.base_discount_amount = item.discount_amount;
        }
      }

      // Calculate amounts
      item.amount = this.flt(item.qty * item.rate, this.currency_precision);
      const baseCurrency = this.price_list_currency || this.pos_profile.currency;
      if (this.selected_currency !== baseCurrency) {
        // Convert amount back to base currency by dividing by exchange rate
        item.base_amount = this.flt(item.amount / this.exchange_rate, this.currency_precision);
      } else {
        item.base_amount = item.amount;
      }

      this.$forceUpdate();
    },
};
