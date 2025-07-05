<template>
  <v-row align="center" class="items px-3 py-2 mt-0" v-if="pos_profile.posa_allow_change_posting_date">
    <v-col cols="4" class="pb-2">
      <VueDatePicker
        v-model="internal_posting_date_display"
        model-type="format"
        format="dd-MM-yyyy"
        auto-apply
        :placeholder="frappe._('Posting Date')"
        :dark="isDarkTheme"
        class="dark-field"
        @update:model-value="onUpdate"
      />
    </v-col>
    <v-col v-if="pos_profile.posa_enable_price_list_dropdown" cols="6" class="pb-2 d-flex align-center">
      <v-select
        density="comfortable"
        variant="outlined"
        color="primary"
        :items="priceLists"
        :label="frappe._('Price List')"
        v-model="internal_price_list"
        hide-details
        class="flex-grow-1"
        @update:model-value="onPriceListUpdate"
      />
      <div
        v-if="pos_profile.posa_show_customer_balance"
        class="balance-field ml-3"
      >
        <strong>{{ __('Customer Balance') }}:</strong>
        <span class="balance-value">{{ formatCurrency(customer_balance) }}</span>
      </div>
    </v-col>
    <v-col
      v-else-if="pos_profile.posa_show_customer_balance"
      cols="8"
      class="pb-2 d-flex align-center"
    >
      <div class="balance-field">
        <strong>{{ __('Customer Balance') }}:</strong>
        <span class="balance-value">{{ formatCurrency(customer_balance) }}</span>
      </div>
    </v-col>
  </v-row>
</template>

<script>
export default {
  props: {
    pos_profile: Object,
    posting_date_display: String,
    customer_balance: Number,
    formatCurrency: Function,
    priceList: String,
    priceLists: Array,
  },
  data() {
    return {
      internal_posting_date_display: this.posting_date_display,
      internal_price_list: this.priceList,
    };
  },
  computed: {
    isDarkTheme() {
      return this.$theme?.current === 'dark';
    }
  },
  watch: {
    posting_date_display(val) {
      this.internal_posting_date_display = val;
    },
    priceList(val) {
      this.internal_price_list = val;
    },
  },
  methods: {
    onUpdate(val) {
      this.$emit('update:posting_date_display', val);
    },
    onPriceListUpdate(val) {
      this.$emit('update:priceList', val);
    }
  },
};
</script>

<style scoped>
/* Dark mode styling for input wrapper */
:deep(.dark-theme) .dark-field,
:deep(.v-theme--dark) .dark-field,
::v-deep(.dark-theme) .dark-field,
::v-deep(.v-theme--dark) .dark-field {
  background-color: #1E1E1E !important;
}

/* Ensure input text and label are readable */
:deep(.dark-theme) .dark-field :deep(.v-field__input),
:deep(.v-theme--dark) .dark-field :deep(.v-field__input),
:deep(.dark-theme) .dark-field :deep(input),
:deep(.v-theme--dark) .dark-field :deep(input),
:deep(.dark-theme) .dark-field :deep(.v-label),
:deep(.v-theme--dark) .dark-field :deep(.v-label),
::v-deep(.dark-theme) .dark-field .v-field__input,
::v-deep(.v-theme--dark) .dark-field .v-field__input,
::v-deep(.dark-theme) .dark-field input,
::v-deep(.v-theme--dark) .dark-field input,
::v-deep(.dark-theme) .dark-field .v-label,
::v-deep(.v-theme--dark) .dark-field .v-label {
  color: #fff !important;
}

/* Overlay background in dark mode */
:deep(.dark-theme) .dark-field :deep(.v-field__overlay),
:deep(.v-theme--dark) .dark-field :deep(.v-field__overlay),
::v-deep(.dark-theme) .dark-field .v-field__overlay,
::v-deep(.v-theme--dark) .dark-field .v-field__overlay {
  background-color: #1E1E1E !important;
}

/* Dark mode styling for date picker input */
:deep(.dark-theme) .dp__input,
:deep(.v-theme--dark) .dp__input,
::v-deep(.dark-theme) .dp__input,
::v-deep(.v-theme--dark) .dp__input {
  background-color: #1E1E1E !important;
  color: #fff !important;
}

/* Dark mode styling for date picker calendar dropdown */
:deep(.dark-theme) .dp__menu,
:deep(.v-theme--dark) .dp__menu,
::v-deep(.dark-theme) .dp__menu,
::v-deep(.v-theme--dark) .dp__menu {
  background-color: #1E1E1E !important;
  color: #fff !important;
}
</style>
