<template>
  <nav>
    <!-- Use the modular NavbarAppBar component -->
    <NavbarAppBar :pos-profile="posProfile" :pending-invoices="pendingInvoices" :is-dark="isDark"
      @nav-click="handleNavClick" @go-desk="goDesk" @show-offline-invoices="showOfflineInvoices = true">
      <!-- Slot for status indicator -->
      <template #status-indicator>
        <StatusIndicator :network-online="networkOnline" :server-online="serverOnline"
          :server-connecting="serverConnecting" :is-ip-host="isIpHost" :sync-totals="syncTotals" />
      </template>

      <!-- Slot for cache usage meter -->
      <template #cache-usage-meter>
        <CacheUsageMeter :cache-usage="cacheUsage" :cache-usage-loading="cacheUsageLoading"
          :cache-usage-details="cacheUsageDetails" @refresh="refreshCacheUsage" />
      </template>

      <!-- Slot for menu -->
      <template #menu>
        <NavbarMenu :pos-profile="posProfile" :last-invoice-id="lastInvoiceId" :manual-offline="manualOffline"
          :is-dark="isDark" @close-shift="openCloseShift" @print-last-invoice="printLastInvoice"
          @sync-invoices="syncPendingInvoices" @toggle-offline="toggleManualOffline" @clear-cache="clearCache"
          @show-about="showAboutDialog = true" @toggle-theme="toggleTheme" @logout="logOut" />
      </template>
    </NavbarAppBar>

    <!-- Use the modular NavbarDrawer component -->
    <NavbarDrawer v-model:drawer="drawer" v-model:item="item" :company="company" :company-img="companyImg"
      :items="items" :is-dark="isDark" @change-page="changePage" />

    <!-- Use the modular AboutDialog component -->
    <AboutDialog v-model="showAboutDialog" />

    <!-- Keep existing dialogs -->
    <v-dialog v-model="freeze" persistent max-width="290">
      <v-card>
        <v-card-title class="text-h5">{{ freezeTitle }}</v-card-title>
        <v-card-text>{{ freezeMsg }}</v-card-text>
      </v-card>
    </v-dialog>

    <OfflineInvoicesDialog v-model="showOfflineInvoices" :pos-profile="posProfile" @deleted="updateAfterDelete" />

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snack" :timeout="snackTimeout" :color="snackColor" location="top right">
      {{ snackText }}
      <template v-slot:actions>
        <v-btn color="white" variant="text" @click="snack = false">{{ __('Close') }}</v-btn>
      </template>
    </v-snackbar>
  </nav>
</template>

<script>
import NavbarAppBar from './navbar/NavbarAppBar.vue'
import NavbarDrawer from './navbar/NavbarDrawer.vue'
import NavbarMenu from './navbar/NavbarMenu.vue'
import StatusIndicator from './navbar/StatusIndicator.vue'
import CacheUsageMeter from './navbar/CacheUsageMeter.vue'
import AboutDialog from './navbar/AboutDialog.vue'
import OfflineInvoices from './OfflineInvoices.vue'
import { clearAllCache } from '../../offline/cache.js'

export default {
  name: 'NavBar',
  components: {
    NavbarAppBar,
    NavbarDrawer,
    NavbarMenu,
    StatusIndicator,
    CacheUsageMeter,
    AboutDialog,
    OfflineInvoicesDialog: OfflineInvoices
  },
  props: {
    posProfile: {
      type: Object,
      default: () => ({})
    },
    pendingInvoices: {
      type: Number,
      default: 0
    },
    lastInvoiceId: String,
    networkOnline: Boolean,
    serverOnline: Boolean,
    serverConnecting: Boolean,
    isIpHost: Boolean,
    syncTotals: {
      type: Object,
      default: () => ({ pending: 0, synced: 0, drafted: 0 })
    },
    manualOffline: Boolean,
    isDark: Boolean,
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
      default: () => ({ total: 0, indexedDB: 0, localStorage: 0 })
    }
  },
  data() {
    return {
      drawer: false,
      mini: true,
      item: 0,
      items: [
        { text: 'POS', icon: 'mdi-network-pos' },
        { text: 'Payments', icon: 'mdi-credit-card' }
      ],
      company: 'POS Awesome',
      companyImg: '/assets/posawesome/js/posapp/components/pos/pos.png',
      showAboutDialog: false,
      showOfflineInvoices: false,
      freeze: false,
      freezeTitle: '',
      freezeMsg: '',
      snack: false,
      snackText: '',
      snackColor: 'success',
      snackTimeout: 3000
    }
  },
  computed: {
    appBarColor() {
      return this.isDark ? this.$vuetify.theme.themes.dark.colors.surface : 'white'
    }
  },
  mounted() {
    this.initializeNavbar()
    
    // Debug: Check if drawer is receiving props correctly
    console.log('Navbar mounted with:')
    console.log('- Company:', this.company)
    console.log('- Company Image:', this.companyImg)
    console.log('- Items:', this.items)
    console.log('- Drawer state:', this.drawer)
  },
  methods: {
    initializeNavbar() {
      // Initialize company info from Frappe boot data
      if (frappe.boot && frappe.boot.sysdefaults && frappe.boot.sysdefaults.company) {
        this.company = frappe.boot.sysdefaults.company
      }
      
      // Try multiple sources for company logo
      if (frappe.boot && frappe.boot.website_settings && frappe.boot.website_settings.app_logo) {
        this.companyImg = frappe.boot.website_settings.app_logo
      } else if (frappe.boot && frappe.boot.website_settings && frappe.boot.website_settings.banner_image) {
        this.companyImg = frappe.boot.website_settings.banner_image
      }
      
      // Debug logging to check what data is available
      console.log('Company:', this.company)
      console.log('Company Image:', this.companyImg)
      console.log('Frappe boot data:', frappe.boot)
      
      // Force reactivity update
      this.$forceUpdate()
    },
    handleNavClick() {
      console.log('Nav icon clicked, current drawer state:', this.drawer);
      this.drawer = !this.drawer;
      console.log('New drawer state:', this.drawer);
      this.$emit('nav-click');
    },
    goDesk() {
      window.location.href = '/app'
    },
    changePage(page) {
      this.$emit('change-page', page)
    },
    openCloseShift() {
      this.$emit('close-shift')
    },
    printLastInvoice() {
      this.$emit('print-last-invoice')
    },
    syncPendingInvoices() {
      this.$emit('sync-invoices')
    },
    toggleManualOffline() {
      this.$emit('toggle-offline')
    },
    async clearCache() {
      try {
        await clearAllCache()
        this.showMessage({ color: 'success', title: this.__('Cache cleared successfully') })
      } catch (e) {
        console.error('Failed to clear cache', e)
        this.showMessage({ color: 'error', title: this.__('Failed to clear cache') })
      } finally {
        setTimeout(() => location.reload(), 1000)
      }
    },
    toggleTheme() {
      this.$emit('toggle-theme')
    },
    logOut() {
      this.$emit('logout')
    },
    refreshCacheUsage() {
      this.$emit('refresh-cache-usage')
    },
    updateAfterDelete() {
      this.$emit('update-after-delete')
    },
    showMessage(data) {
      this.snackText = data.title
      this.snackColor = data.color || 'success'
      this.snack = true
    },
    handleMouseLeave() {
      if (!this.drawer) return
      clearTimeout(this._closeTimeout)
      this._closeTimeout = setTimeout(() => {
        this.drawer = false
        this.mini = true
      }, 250)
    }
  },
  emits: [
    'nav-click',
    'change-page',
    'close-shift',
    'print-last-invoice',
    'sync-invoices',
    'toggle-offline',
    'toggle-theme',
    'logout',
    'refresh-cache-usage',
    'update-after-delete'
  ]
}
</script>

<style scoped>
/* Main navigation container styles */
nav {
  position: relative;
  z-index: 1000;
}

/* Snackbar positioning */
:deep(.v-snackbar) {
  z-index: 9999;
}

/* Dark theme adjustments */
:deep(.dark-theme) nav,
:deep(.v-theme--dark) nav {
  background-color: var(--background) !important;
}
</style>