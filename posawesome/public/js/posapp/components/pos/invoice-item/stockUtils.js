export default {
    calc_uom(item, value) {
      let new_uom = item.item_uoms.find((element) => element.uom == value);

      // try cached uoms when not found on item
      if (!new_uom) {
        const cached = getItemUOMs(item.item_code);
        if (cached.length) {
          item.item_uoms = cached;
          new_uom = cached.find(u => u.uom == value);
        }
      }

      // fallback to stock uom
      if (!new_uom && item.stock_uom === value) {
        new_uom = { uom: item.stock_uom, conversion_factor: 1 };
        if (!item.item_uoms) item.item_uoms = [];
        item.item_uoms.push(new_uom);
      }

      if (!new_uom) {
        this.eventBus.emit("show_message", {
          title: __("UOM not found"),
          color: "error",
        });
        return;
      }

      // Store old conversion factor for ratio calculation
      const old_conversion_factor = item.conversion_factor || 1;

      // Update conversion factor
      item.conversion_factor = new_uom.conversion_factor;

      // Calculate the ratio of new to old conversion factor
      const conversion_ratio = item.conversion_factor / old_conversion_factor;

      // Reset discount if not offer
      if (!item.posa_offer_applied) {
        item.discount_amount = 0;
        item.discount_percentage = 0;
      }

      // Store original base rates if not already stored
      if (!item.original_base_rate && !item.posa_offer_applied) {
        item.original_base_rate = item.base_rate / old_conversion_factor;
        item.original_base_price_list_rate = item.base_price_list_rate / old_conversion_factor;
      }

      // Update rates based on new conversion factor
      if (item.posa_offer_applied) {
        // For items with offer, recalculate from original offer rate
        const offer = this.posOffers && Array.isArray(this.posOffers) ? this.posOffers.find(o => {
          if (!o || !o.items) return false;
          const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
          return Array.isArray(items) && items.includes(item.posa_row_id);
        }) : null;

        if (offer && offer.discount_type === "Rate") {
          // Apply offer rate with new conversion factor
          const converted_rate = flt(offer.rate * item.conversion_factor);

          // Set base rates
          item.base_rate = converted_rate;
          item.base_price_list_rate = converted_rate;

          // Convert to selected currency
          const baseCurrency = this.price_list_currency || this.pos_profile.currency;
          if (this.selected_currency !== baseCurrency) {
            // If exchange rate is 300 PKR = 1 USD
            // To convert PKR to USD: divide by exchange rate
            // Example: 3000 PKR / 300 = 10 USD
            item.rate = this.flt(converted_rate / this.exchange_rate, this.currency_precision);
            item.price_list_rate = item.rate;
          } else {
            item.rate = converted_rate;
            item.price_list_rate = converted_rate;
          }
        } else if (offer && offer.discount_type === "Discount Percentage") {
          // For percentage discount, recalculate from original price but with new conversion factor

          // Update the base prices with new conversion factor
          let updated_base_price;
          if (item.original_base_price_list_rate) {
            // Use original price adjusted for new conversion factor
            updated_base_price = this.flt(item.original_base_price_list_rate * item.conversion_factor, this.currency_precision);
          } else {
            // Fallback if original price not stored
            updated_base_price = this.flt(item.base_price_list_rate * conversion_ratio, this.currency_precision);
          }

          // Store updated base price
          item.base_price_list_rate = updated_base_price;

          // Recalculate discount based on percentage
          const base_discount = this.flt((updated_base_price * offer.discount_percentage) / 100, this.currency_precision);
          item.base_discount_amount = base_discount;
          item.base_rate = this.flt(updated_base_price - base_discount, this.currency_precision);

          // Convert to selected currency if needed
          const baseCurrency = this.price_list_currency || this.pos_profile.currency;
          if (this.selected_currency !== baseCurrency) {
            item.price_list_rate = this.flt(updated_base_price / this.exchange_rate, this.currency_precision);
            item.discount_amount = this.flt(base_discount / this.exchange_rate, this.currency_precision);
            item.rate = this.flt(item.base_rate / this.exchange_rate, this.currency_precision);
          } else {
            item.price_list_rate = updated_base_price;
            item.discount_amount = base_discount;
            item.rate = item.base_rate;
          }
        }
      } else {
        // For regular items, use standard conversion
        if (item.batch_price) {
          item.base_rate = item.batch_price * item.conversion_factor;
          item.base_price_list_rate = item.base_rate;
        } else if (item.original_base_rate) {
          item.base_rate = item.original_base_rate * item.conversion_factor;
          item.base_price_list_rate = item.original_base_price_list_rate * item.conversion_factor;
        }

        // Convert to selected currency
        const baseCurrency = this.price_list_currency || this.pos_profile.currency;
        if (this.selected_currency !== baseCurrency) {
          // If exchange rate is 300 PKR = 1 USD
          // To convert PKR to USD: divide by exchange rate
          // Example: 3000 PKR / 300 = 10 USD
          item.rate = this.flt(item.base_rate / this.exchange_rate, this.currency_precision);
          item.price_list_rate = this.flt(item.base_price_list_rate / this.exchange_rate, this.currency_precision);
        } else {
          item.rate = item.base_rate;
          item.price_list_rate = item.base_price_list_rate;
        }
      }

      // Update item details
      this.calc_stock_qty(item, item.qty);
      this.$forceUpdate();
    },

    // Calculate stock quantity for an item
    calc_stock_qty(item, value) {
      item.stock_qty = item.conversion_factor * value;
    },

};
