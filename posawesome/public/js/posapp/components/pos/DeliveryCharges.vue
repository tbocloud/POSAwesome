<template>
  <v-row align="center" class="items px-3 py-2 mt-0" v-if="pos_profile.posa_use_delivery_charges">
    <v-col cols="8" class="pb-0 mb-0 pr-0 pt-0">
      <v-autocomplete density="compact" clearable auto-select-first variant="outlined" color="primary"
        :label="frappe._('Delivery Charges')" v-model="internal_selected_delivery_charge" :items="delivery_charges"
        item-title="name" item-value="name" return-object bg-color="white" :no-data-text="__('Charges not found')"
        hide-details :customFilter="deliveryChargesFilter" :disabled="readonly"
        @update:model-value="onUpdate">
        <template v-slot:item="{ props, item }">
          <v-list-item v-bind="props">
            <v-list-item-title class="text-primary text-subtitle-1" v-html="item.raw.name"></v-list-item-title>
            <v-list-item-subtitle v-html="`Rate: ${item.raw.rate}`"></v-list-item-subtitle>
          </v-list-item>
        </template>
      </v-autocomplete>
    </v-col>
    <v-col cols="4" class="pb-0 mb-0 pt-0">
      <v-text-field density="compact" variant="outlined" color="primary"
        :label="frappe._('Delivery Charges Rate')" bg-color="white" hide-details
        :model-value="formatCurrency(delivery_charges_rate)" :prefix="currencySymbol(pos_profile.currency)"
        disabled></v-text-field>
    </v-col>
  </v-row>
</template>

<script>
export default {
  props: {
    pos_profile: Object,
    delivery_charges: Array,
    selected_delivery_charge: [Object, String],
    delivery_charges_rate: Number,
    deliveryChargesFilter: Function,
    formatCurrency: Function,
    currencySymbol: Function,
    readonly: Boolean,
  },
  data() {
    return {
      internal_selected_delivery_charge: this.selected_delivery_charge,
    };
  },
  watch: {
    selected_delivery_charge(val) {
      this.internal_selected_delivery_charge = val;
    },
  },
  methods: {
    onUpdate(val) {
      this.$emit('update:selected_delivery_charge', val);
    },
  },
};
</script>
