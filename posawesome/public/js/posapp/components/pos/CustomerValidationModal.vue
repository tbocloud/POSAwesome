<!-- CustomerValidationModal.vue -->
<template>
    <v-dialog v-model="show" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h6 pa-4 d-flex align-center bg-warning">
          <v-icon left color="white">mdi-alert</v-icon>
          <span class="white--text">{{ __('Customer Required') }}</span>
          <v-spacer></v-spacer>
        </v-card-title>
        
        <v-card-text class="pa-6 text-center">
          <v-icon size="64" color="warning" class="mb-4">mdi-account-alert</v-icon>
          <h3 class="mb-3">{{ __('Customer First Select') }}</h3>
          <p class="text-body-1 mb-0">
            {{ __('Please select a customer before adding items to the invoice.') }}
          </p>
        </v-card-text>
        
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="elevated"
            @click="closeModal"
            prepend-icon="mdi-check"
          >
            {{ __('OK') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
  
  <script>
  export default {
    name: 'CustomerValidationModal',
    props: {
      modelValue: {
        type: Boolean,
        default: false
      }
    },
    computed: {
      show: {
        get() {
          return this.modelValue;
        },
        set(value) {
          this.$emit('update:modelValue', value);
        }
      }
    },
    methods: {
      closeModal() {
        this.show = false;
      }
    }
  };
  </script>
  
  <style scoped>
  .bg-warning {
    background-color: rgb(var(--v-theme-warning)) !important;
  }
  
  .white--text {
    color: white !important;
  }
  </style>