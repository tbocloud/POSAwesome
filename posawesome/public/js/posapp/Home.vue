<template>
  <v-app class="container1">
    <v-main class="main-content">
      <Navbar :pos-profile="posProfile" :pending-invoices="pendingInvoices" :last-invoice-id="lastInvoiceId"
        :network-online="networkOnline" :server-online="serverOnline" :server-connecting="serverConnecting"
        :is-ip-host="isIpHost" :sync-totals="syncTotals" :manual-offline="manualOffline" :is-dark="isDark"
        :cache-usage="cacheUsage" :cache-usage-loading="cacheUsageLoading" :cache-usage-details="cacheUsageDetails"
        @change-page="setPage($event)" @nav-click="handleNavClick" @close-shift="handleCloseShift"
        @print-last-invoice="handlePrintLastInvoice" @sync-invoices="handleSyncInvoices"
        @toggle-offline="handleToggleOffline" @toggle-theme="handleToggleTheme" @logout="handleLogout"
        @refresh-cache-usage="handleRefreshCacheUsage" @update-after-delete="handleUpdateAfterDelete" />
      <div class="page-content">
        <component v-bind:is="page" class="mx-4 md-4"></component>
      </div>
    </v-main>
  </v-app>
</template>

<script>
import Navbar from './components/Navbar.vue';
import POS from './components/pos/Pos.vue';
import Payments from './components/payments/Pay.vue';
import { getOpeningStorage, getCacheUsageEstimate } from '../offline/index.js';

export default {
  data: function () {
    return {
      page: 'POS',
      // POS Profile data
      posProfile: {},
      pendingInvoices: 0,
      lastInvoiceId: '',

      // Network status
      networkOnline: navigator.onLine || false,
      serverOnline: false,
      serverConnecting: false,
      isIpHost: false,

      // Sync data
      syncTotals: { pending: 0, synced: 0, drafted: 0 },
      manualOffline: false,


      // Cache data
      cacheUsage: 0,
      cacheUsageLoading: false,
      cacheUsageDetails: { total: 0, indexedDB: 0, localStorage: 0 }
    };
  },
  computed: {
    isDark() {
      return this.$theme?.current === 'dark';
    }
  },
  components: {
    Navbar,
    POS,
    Payments,
  },
  mounted() {
    this.remove_frappe_nav();
    this.initializeData();
    this.setupNetworkListeners();
    this.setupEventListeners();
    this.handleRefreshCacheUsage();
  },
  methods: {
    setPage(page) {
      this.page = page;
    },

    initializeData() {
      // Load POS profile from cache or storage
      const openingData = getOpeningStorage();
      if (openingData && openingData.pos_profile) {
        this.posProfile = openingData.pos_profile;
      }

      // Check if running on IP host
      this.isIpHost = /^\d+\.\d+\.\d+\.\d+/.test(window.location.hostname);
    },

    setupNetworkListeners() {
      // Listen for network status changes
      window.addEventListener('online', () => {
        this.networkOnline = true;
        console.log('Network: Online');
        // Verify actual connectivity
        this.checkNetworkConnectivity();
      });

      window.addEventListener('offline', () => {
        this.networkOnline = false;
        this.serverOnline = false;
        console.log('Network: Offline');
        this.$forceUpdate();
      });

      // Initial network status
      this.networkOnline = navigator.onLine;
      this.checkNetworkConnectivity();

      // Periodic network check every 15 seconds
      setInterval(() => {
        if (navigator.onLine) {
          this.checkNetworkConnectivity();
        }
      }, 15000);
    },

    async checkNetworkConnectivity() {
      try {
        let isConnected = false;

        // Strategy 1: Try Frappe's desk endpoint (always available)
        try {
          const response = await fetch('/app', {
            method: 'HEAD',
            cache: 'no-cache',
            signal: AbortSignal.timeout(5000)
          });
          if (response.status < 500) {
            isConnected = true;
          }
        } catch (error) {
          console.log('Desk endpoint check failed:', error.message);
        }

        // Strategy 2: Try a static asset if desk fails
        if (!isConnected) {
          try {
            const response = await fetch('/assets/frappe/images/frappe-logo.svg', {
              method: 'HEAD',
              cache: 'no-cache',
              signal: AbortSignal.timeout(3000)
            });
            if (response.status < 500) {
              isConnected = true;
            }
          } catch (error) {
            console.log('Static asset check failed:', error.message);
          }
        }

        // Strategy 3: Try current page origin as last resort
        if (!isConnected) {
          try {
            const response = await fetch(window.location.origin, {
              method: 'HEAD',
              cache: 'no-cache',
              signal: AbortSignal.timeout(3000)
            });
            if (response.status < 500) {
              isConnected = true;
            }
          } catch (error) {
            console.log('Origin check failed:', error.message);
          }
        }

        // Update network and server status
        if (isConnected) {
          this.networkOnline = true;
          this.serverOnline = true;
          this.serverConnecting = false;
          console.log('Network: Connected');
        } else {
          this.networkOnline = navigator.onLine;
          this.serverOnline = false;
          this.serverConnecting = false;
          console.log('Network: Disconnected');
        }

        // Force Vue reactivity update
        this.$forceUpdate();

      } catch (error) {
        console.warn('Network connectivity check failed:', error);
        this.networkOnline = navigator.onLine;
        this.serverOnline = false;
        this.serverConnecting = false;
        this.$forceUpdate();
      }
    },

    detectHostType(hostname) {
      // Check for IP addresses (IPv4)
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

      // Check for IPv6 addresses
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::/;

      // Check for localhost variants
      const localhostVariants = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];

      return ipv4Regex.test(hostname) ||
        ipv6Regex.test(hostname) ||
        localhostVariants.includes(hostname.toLowerCase());
    },

    async performConnectivityChecks(hostname, protocol, port) {
      const checks = [];

      // Strategy 1: Try Frappe ping endpoint
      checks.push(this.checkFrappePing());

      // Strategy 2: Try current origin with a simple request
      checks.push(this.checkCurrentOrigin(protocol, hostname, port));

      // Strategy 3: For non-local hosts, try external connectivity
      if (!this.isIpHost) {
        checks.push(this.checkExternalConnectivity());
      }

      // Strategy 4: WebSocket connectivity check
      if (frappe.realtime && frappe.realtime.socket) {
        checks.push(this.checkWebSocketConnectivity());
      }

      try {
        // Wait for any check to succeed (race condition)
        const results = await Promise.allSettled(checks);
        return results.some(result => result.status === 'fulfilled' && result.value === true);
      } catch (error) {
        console.warn('All connectivity checks failed:', error);
        return false;
      }
    },

    async checkFrappePing() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('/api/method/ping', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Frappe ping check failed:', error);
        }
        return false;
      }
    },

    async checkCurrentOrigin(protocol, hostname, port) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // Construct the URL based on current origin
        const baseUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;

        // Try to fetch a lightweight resource
        const response = await fetch(`${baseUrl}/api/method/frappe.auth.get_logged_user`, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });

        clearTimeout(timeoutId);
        return response.status < 500; // Accept any response that's not a server error
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Current origin check failed:', error);
        }
        return false;
      }
    },

    async checkExternalConnectivity() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        // Try to reach a reliable external service
        const response = await fetch('https://httpbin.org/status/200', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return true; // If we reach here, we have internet connectivity
      } catch (error) {
        // For no-cors requests, we might get an opaque response
        // which is still a sign of connectivity
        if (error.name !== 'AbortError') {
          console.warn('External connectivity check failed:', error);
        }
        return false;
      }
    },

    async checkWebSocketConnectivity() {
      try {
        if (frappe.realtime && frappe.realtime.socket) {
          const socketState = frappe.realtime.socket.readyState;
          // WebSocket.OPEN = 1
          return socketState === 1;
        }
        return false;
      } catch (error) {
        console.warn('WebSocket connectivity check failed:', error);
        return false;
      }
    },

    setupEventListeners() {
      // Listen for POS profile registration
      if (this.eventBus) {
        this.eventBus.on('register_pos_profile', (data) => {
          this.posProfile = data.pos_profile || {};
        });
      }

      // Enhanced server connection status listeners
      if (frappe.realtime) {
        frappe.realtime.on('connect', () => {
          this.serverOnline = true;
          this.serverConnecting = false;
          console.log('Server: Connected via WebSocket');
          this.$forceUpdate();
        });

        frappe.realtime.on('disconnect', () => {
          this.serverOnline = false;
          this.serverConnecting = false;
          console.log('Server: Disconnected from WebSocket');
          // Trigger connectivity check to verify if it's just WebSocket or full network
          setTimeout(() => this.checkNetworkConnectivity(), 1000);
        });

        frappe.realtime.on('connecting', () => {
          this.serverConnecting = true;
          console.log('Server: Connecting to WebSocket...');
          this.$forceUpdate();
        });

        frappe.realtime.on('reconnect', () => {
          console.log('Server: Reconnected to WebSocket');
          this.checkNetworkConnectivity();
        });
      }

      // Listen for visibility changes to check connectivity when tab becomes active
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && navigator.onLine) {
          this.checkNetworkConnectivity();
        }
      });
    },

    // Event handlers for navbar events
    handleNavClick() {
      // Handle navigation click
    },

    handleCloseShift() {
      // Emit to POS component
      this.eventBus.emit('close_shift');
    },

    handlePrintLastInvoice() {
      // Handle print last invoice
      this.eventBus.emit('print_last_invoice');
    },

    handleSyncInvoices() {
      // Handle sync invoices
      this.eventBus.emit('sync_invoices');
    },

    handleToggleOffline() {
      this.manualOffline = !this.manualOffline;
    },

    handleToggleTheme() {
      // Use the global theme plugin instead of local state
      this.$theme.toggle();
    },

    handleLogout() {
      window.location.href = '/app';
    },

    handleRefreshCacheUsage() {
      this.cacheUsageLoading = true;
      getCacheUsageEstimate()
        .then((usage) => {
          this.cacheUsage = usage.percentage || 0;
          this.cacheUsageDetails = {
            total: usage.total || 0,
            indexedDB: usage.indexedDB || 0,
            localStorage: usage.localStorage || 0,
          };
        })
        .catch((e) => {
          console.error('Failed to refresh cache usage', e);
        })
        .finally(() => {
          this.cacheUsageLoading = false;
        });
    },

    handleUpdateAfterDelete() {
      // Handle update after delete
    },

    remove_frappe_nav() {
      this.$nextTick(function () {
        $('.page-head').remove();
        $('.navbar.navbar-default.navbar-fixed-top').remove();
      });
    },
  },
  created: function () {
    setTimeout(() => {
      this.remove_frappe_nav();
    }, 1000);
  },
};
</script>

<style scoped>
.container1 {
  height: 100vh;
  overflow: hidden;
}

.main-content {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding-top: 8px;
}

/* Ensure proper spacing and prevent layout shifts */
:deep(.v-main__wrap) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
