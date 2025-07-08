<template>
  <div class="cache-usage-section mx-1">
    <v-tooltip location="bottom">
      <template v-slot:activator="{ props }">
        <div v-bind="props" class="cache-meter-container" @click="refreshCacheUsage">
          <v-progress-circular :model-value="cacheUsage" :color="cacheUsageColor" :size="32" :width="3"
            class="cache-meter">
            <v-icon size="16">mdi-database</v-icon>
          </v-progress-circular>
        </div>
      </template>
      <div class="cache-tooltip-content">
        <div class="cache-tooltip-title">{{ __('Cache Usage') }}</div>
        <div class="cache-tooltip-detail" v-if="!cacheUsageLoading">
          <div>{{ __('Total Size') }}: {{ formatBytes(cacheUsageDetails.total) }}</div>
          <div>{{ __('IndexedDB') }}: {{ formatBytes(cacheUsageDetails.indexedDB) }}</div>
          <div>{{ __('localStorage') }}: {{ formatBytes(cacheUsageDetails.localStorage) }}</div>
        </div>
        <div class="cache-tooltip-detail" v-else>
          {{ __('Calculating...') }}
        </div>
        <div class="cache-tooltip-action">
          <v-icon size="14" class="mr-1">mdi-refresh</v-icon>
          {{ __('Click to refresh') }}
        </div>
      </div>
    </v-tooltip>
  </div>
</template>

<script>
export default {
  name: 'CacheUsageMeter',
  props: {
    cacheUsage: {
      type: Number,
      default: 0
    },
    cacheUsageLoading: {
      type: Boolean,
      default: false
    },
    cacheUsageDetails: {
      type: Object,
      default: () => ({
        total: 0,
        indexedDB: 0,
        localStorage: 0
      })
    }
  },
  computed: {
    cacheUsageColor() {
      // Return color based on cache usage percentage
      if (this.cacheUsage < 50) return 'success';
      if (this.cacheUsage < 80) return 'warning';
      return 'error';
    }
  },
  methods: {
    refreshCacheUsage() {
      this.$emit('refresh');
    },
    formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
};
</script>

<style scoped>
/* Cache Usage Meter Styling */
.cache-usage-section {
  display: flex;
  align-items: center;
  margin: 0 8px;
}

.cache-meter-container {
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.cache-meter-container:hover {
  transform: scale(1.1);
}

.cache-meter {
  transition: all 0.3s ease;
}

.cache-tooltip-content {
  padding: 12px;
  min-width: 200px;
}

.cache-tooltip-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: var(--primary);
}

.cache-tooltip-detail {
  font-size: 12px;
  margin-bottom: 8px;
  line-height: 1.5;
}

.cache-tooltip-action {
  font-size: 11px;
  opacity: 0.7;
  display: flex;
  align-items: center;
  margin-top: 8px;
  color: var(--primary);
}
</style>