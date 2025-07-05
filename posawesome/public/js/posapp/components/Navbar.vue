<template>
  <!-- Main navigation container -->
  <nav>

    <!-- Top App Bar: application header with nav toggle, logo, title, and actions -->

    <v-app-bar app flat height="56" :color="appBarColor" :theme="isDark ? 'dark' : 'light'"
      class="navbar-enhanced elevation-2 px-2 pb-1">
      <v-app-bar-nav-icon ref="navIcon" @click="handleNavClick" class="text-secondary nav-icon" />

      <v-img src="/assets/posawesome/js/posapp/components/pos/pos.png" alt="POS Awesome" max-width="32" class="mx-2" />

      <v-toolbar-title @click="goDesk" class="text-h6 font-weight-bold text-primary navbar-title"
        style="cursor: pointer; text-decoration: none;">
        <span class="font-weight-light">POS</span><span>Awesome</span>
      </v-toolbar-title>

      <v-spacer />

      <!-- Enhanced connectivity status indicator - Always visible -->
      <div class="status-section-enhanced mx-1">
        <v-btn icon :title="statusText" class="status-btn-enhanced" :color="statusColor">
          <v-icon :color="statusColor">{{ statusIcon }}</v-icon>
        </v-btn>
        <div class="status-info-always-visible">
          <div class="status-title-inline"
            :class="{ 'status-connected': statusColor === 'green', 'status-offline': statusColor === 'red' }">{{
              statusText }}</div>
          <div class="status-detail-inline">{{ syncInfoText }}</div>
        </div>
      </div>

      <div class="profile-section mx-1">
        <v-chip color="primary" variant="outlined" class="profile-chip">
          <v-icon start>mdi-account-circle</v-icon>
          {{ posProfile.name }}
        </v-chip>
      </div>

      <v-btn icon color="primary" class="mx-1 offline-invoices-btn" @click="showOfflineInvoices = true"
        :class="{ 'has-pending': pendingInvoices > 0 }">
        <v-badge v-if="pendingInvoices > 0" :content="pendingInvoices" color="error" overlap>
          <v-icon>mdi-file-document-multiple-outline</v-icon>
        </v-badge>
        <v-icon v-else>mdi-file-document-multiple-outline</v-icon>
        <v-tooltip activator="parent" location="bottom">
          {{ __('Offline Invoices') }} ({{ pendingInvoices }})
        </v-tooltip>
      </v-btn>


      <v-menu offset-y :min-width="240" :close-on-content-click="false" location="bottom end" :offset="[0, 4]">
        <template #activator="{ props }">
          <v-btn v-bind="props" color="primary" variant="elevated" class="menu-btn-compact">
            {{ __('Menu') }}
            <v-icon right size="16" class="ml-1">mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-card class="menu-card-compact" elevation="12">
          <div class="menu-header-compact">
            <v-icon color="primary" size="20">mdi-menu</v-icon>
            <span class="menu-header-text-compact">{{ __('Actions') }}</span>
          </div>
          <v-list density="compact" class="menu-list-compact">
            <v-list-item v-if="!posProfile.posa_hide_closing_shift" @click="openCloseShift"
              class="menu-item-compact primary-action">
              <template v-slot:prepend>
                <div class="menu-icon-wrapper-compact primary-icon">
                  <v-icon color="white" size="16">mdi-content-save-move-outline</v-icon>
                </div>
              </template>
              <div class="menu-content-compact">
                <v-list-item-title class="menu-item-title-compact">{{ __('Close Shift') }}</v-list-item-title>
                <v-list-item-subtitle class="menu-item-subtitle-compact">{{ __('End current session')
                  }}</v-list-item-subtitle>
              </div>
            </v-list-item>

            <v-list-item v-if="posProfile.posa_allow_print_last_invoice && lastInvoiceId" @click="printLastInvoice"
              class="menu-item-compact secondary-action">
              <template v-slot:prepend>
                <div class="menu-icon-wrapper-compact secondary-icon">
                  <v-icon color="white" size="16">mdi-printer</v-icon>
                </div>
              </template>
              <div class="menu-content-compact">
                <v-list-item-title class="menu-item-title-compact">{{ __('Print Last Invoice') }}</v-list-item-title>
                <v-list-item-subtitle class="menu-item-subtitle-compact">{{ __('Reprint previous transaction')
                  }}</v-list-item-subtitle>
              </div>
            </v-list-item>

            <v-list-item @click="syncPendingInvoices" class="menu-item-compact info-action">
              <template v-slot:prepend>
                <div class="menu-icon-wrapper-compact info-icon">
                  <v-icon color="white" size="16">mdi-sync</v-icon>
                </div>
              </template>
              <div class="menu-content-compact">
                <v-list-item-title class="menu-item-title-compact">{{ __('Sync Offline Invoices') }}</v-list-item-title>
                <v-list-item-subtitle class="menu-item-subtitle-compact">{{ __('Upload pending transactions')
                  }}</v-list-item-subtitle>
              </div>
            </v-list-item>

            <v-list-item @click="toggleManualOffline" class="menu-item-compact warning-action">
              <template v-slot:prepend>
                <div class="menu-icon-wrapper-compact warning-icon">
                  <v-icon color="white" size="16">mdi-wifi-off</v-icon>
                </div>
              </template>
              <div class="menu-content-compact">
                <v-list-item-title class="menu-item-title-compact">{{ manualOffline ? __('Go Online') : __('Go Offline')
                }}</v-list-item-title>
                <v-list-item-subtitle class="menu-item-subtitle-compact">
                  {{ manualOffline ? __('Disable offline mode') : __('Work without server connection') }}
                </v-list-item-subtitle>
              </div>
            </v-list-item>

            <v-list-item @click="clearCache" class="menu-item-compact neutral-action">
              <template v-slot:prepend>
                <div class="menu-icon-wrapper-compact neutral-icon">
                  <v-icon color="white" size="16">mdi-delete-sweep-outline</v-icon>
                </div>
              </template>
              <div class="menu-content-compact">
                <v-list-item-title class="menu-item-title-compact">{{ __('Clear Cache') }}</v-list-item-title>
                <v-list-item-subtitle class="menu-item-subtitle-compact">{{ __('Remove local data and refresh') }}</v-list-item-subtitle>
              </div>
            </v-list-item>

            <v-divider class="menu-section-divider-compact"></v-divider>

            <v-list-item @click="goAbout" class="menu-item-compact neutral-action">
              <template v-slot:prepend>
                <div class="menu-icon-wrapper-compact neutral-icon">
                  <v-icon color="white" size="16">mdi-information-outline</v-icon>
                </div>
              </template>
              <div class="menu-content-compact">
                <v-list-item-title class="menu-item-title-compact">{{ __('About') }}</v-list-item-title>
                <v-list-item-subtitle class="menu-item-subtitle-compact">{{ __('App information')
                  }}</v-list-item-subtitle>
              </div>
            </v-list-item>

            <!-- Theme toggle menu item -->
            <v-list-item @click="toggleTheme" class="menu-item-compact info-action">
              <template v-slot:prepend>
                <div class="menu-icon-wrapper-compact info-icon">
                  <v-icon color="white" size="16">{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent'
                  }}</v-icon>
                </div>
              </template>
              <div class="menu-content-compact">
                <v-list-item-title class="menu-item-title-compact">{{ isDark ? __('Light Mode') : __('Dark Mode')
                }}</v-list-item-title>
                <v-list-item-subtitle class="menu-item-subtitle-compact">{{ __('Switch theme appearance')
                  }}</v-list-item-subtitle>
              </div>
            </v-list-item>

            <v-list-item @click="logOut" class="menu-item-compact danger-action">
              <template v-slot:prepend>
                <div class="menu-icon-wrapper-compact danger-icon">
                  <v-icon color="white" size="16">mdi-logout</v-icon>
                </div>
              </template>
              <div class="menu-content-compact">
                <v-list-item-title class="menu-item-title-compact">{{ __('Logout') }}</v-list-item-title>
                <v-list-item-subtitle class="menu-item-subtitle-compact">{{ __('Sign out of session')
                  }}</v-list-item-subtitle>
              </div>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- This drawer slides out from the left, providing additional navigation options.
         It can be in a mini-variant (collapsed) or expanded state. -->
    <v-navigation-drawer app v-model="drawer" :mini-variant="mini" expand-on-hover width="220" class="drawer-custom"
      @mouseleave="handleMouseLeave">
      <div v-if="!mini" class="drawer-header">
        <v-avatar size="40"><v-img :src="companyImg" alt="Company logo" /></v-avatar>
        <span class="drawer-company">{{ company }}</span>
        <v-btn icon @click.stop="mini = true"><v-icon>mdi-chevron-left</v-icon></v-btn>
      </div>
      <div v-else class="drawer-header-mini">
        <v-avatar size="40"><v-img :src="companyImg" alt="Company logo" /></v-avatar>
      </div>

      <v-divider />

      <v-list dense nav>
        <v-list-item-group v-model="item" active-class="active-item">
          <v-list-item v-for="i in items" :key="i.text" @click="changePage(i.text)" class="drawer-item">
            <v-list-item-icon><v-icon class="drawer-icon">{{ i.icon }}</v-icon></v-list-item-icon>
            <v-list-item-content v-if="!mini">
              <v-list-item-title class="drawer-item-title">{{ i.text }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-navigation-drawer>

    <v-snackbar v-model="snack" :timeout="2000" :color="snackColor" location="top right">
      {{ snackText }}
    </v-snackbar>

    <v-dialog v-model="freeze" persistent max-width="290">
      <v-card>
        <v-card-title class="text-h5">{{ freezeTitle }}</v-card-title>
        <v-card-text>{{ freezeMsg }}</v-card-text>
      </v-card>
    </v-dialog>

    <OfflineInvoicesDialog v-model="showOfflineInvoices" :pos-profile="posProfile" @deleted="updateAfterDelete" />

    <!-- About Dialog - Improved Compact Version -->
    <v-dialog v-model="showAboutDialog" max-width="650" persistent>
      <v-card class="about-dialog-card-improved">
        <v-card-title class="about-header-improved pa-5">
          <div class="header-content-improved">
            <div class="header-icon-wrapper-improved">
              <v-icon size="22" class="header-icon">mdi-information-outline</v-icon>
            </div>
            <div class="header-text-improved">
              <h3 class="header-title-improved">{{ __('About') }}</h3>
              <p class="header-subtitle-improved">{{ __('System Information') }}</p>
            </div>
            <div class="header-stats-improved" v-if="!loadingAppInfo && !appInfoError">
              <v-chip size="small" color="primary" variant="tonal" class="status-chip-improved">
                <v-icon start size="14">mdi-application-outline</v-icon>
                {{ appInfo.length }} {{ __('Apps') }}
              </v-chip>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" size="default" @click="showAboutDialog = false"
            class="close-btn-improved"></v-btn>
        </v-card-title>

        <v-card-text class="pa-0 white-background">
          <div class="content-container-improved">
            <!-- Loading State -->
            <div v-if="loadingAppInfo" class="empty-state-improved text-center">
              <v-progress-circular indeterminate color="primary" size="50"></v-progress-circular>
              <p class="text-body-2 mt-3 mb-0">{{ __('Loading...') }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="appInfoError" class="empty-state-improved text-center">
              <v-icon size="50" color="error" class="mb-3">mdi-alert-circle-outline</v-icon>
              <p class="text-body-2 mb-3">{{ __('Error Loading Data') }}</p>
              <v-btn color="primary" variant="outlined" size="default" @click="loadAppInfo">
                <v-icon start size="18">mdi-refresh</v-icon>
                {{ __('Retry') }}
              </v-btn>
            </div>

            <!-- Applications List - Improved -->
            <div v-else class="apps-list-improved">
              <div class="apps-header-improved">
                <h4 class="text-h6 mb-2">{{ __('Installed Applications') }}</h4>
              </div>

              <div class="apps-grid-improved">
                <div v-for="app in appInfo" :key="app.app_name" class="app-item-improved">
                  <div class="app-icon-improved">
                    <v-icon size="18" color="white">mdi-application-outline</v-icon>
                  </div>
                  <div class="app-details-improved">
                    <div class="app-name-improved">{{ app.app_name }}</div>
                    <div class="app-version-improved">v{{ app.installed_version }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="dialog-actions-improved pa-4">
          <div class="footer-info-improved">
            <span class="footer-text-improved">
              <v-icon start size="16" color="error">mdi-heart</v-icon>
              {{ __('Built with Frappe') }}
            </span>
          </div>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="showAboutDialog = false" class="close-btn-action-improved">
            {{ __('Close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </nav>
</template>

<script>
// Import the Socket.IO client library for real-time server status monitoring.
// This import is crucial for the server connectivity indicator.
import { io } from 'socket.io-client';
import { getPendingOfflineInvoiceCount, syncOfflineInvoices, isOffline, getLastSyncTotals, isManualOffline, setManualOffline, clearAllCache } from '../../offline.js';
import OfflineInvoicesDialog from './OfflineInvoices.vue';
import { silentPrint } from '../plugins/print.js';

export default {
  name: 'NavBar', // Component name
  components: { OfflineInvoicesDialog },
  data() {
    return {
      drawer: false, // Controls the visibility of the side navigation drawer (true for open, false for closed)
      mini: true, // Controls the mini-variant (collapsed) state of the drawer (true for collapsed, false for expanded)
      item: 0, // Index of the currently selected item in the drawer list, used for active styling
      items: [{ text: 'POS', icon: 'mdi-network-pos' }], // Array of navigation items for the drawer. Each item has text and a Material Design Icon.
      company: 'POS Awesome', // Default company name, used if not fetched from Frappe boot data
      companyImg: '/assets/erpnext/images/erpnext-logo.svg', // Default path to the company logo image
      posProfile: {}, // Object to store the current POS profile data, fetched from the backend
      lastInvoiceId: null, // Stores the ID of the last generated sales invoice, used for re-printing
      snack: false, // Controls the visibility of the snackbar (true for visible, false for hidden)
      snackColor: '', // Color of the snackbar (e.g., 'success', 'error', 'info')
      snackText: '', // Text content displayed within the snackbar
      freeze: false, // Controls the visibility of the freeze dialog (true for visible, false for hidden)
      freezeTitle: '', // Title text for the freeze dialog
      freezeMsg: '', // Message text for the freeze dialog
      // --- PENDING OFFLINE INVOICES ---
      pendingInvoices: 0, // Number of invoices saved locally while offline
      syncTotals: getLastSyncTotals(),
      // --- SIGNAL INDICATOR STATES ---
      networkOnline: navigator.onLine, // Boolean: Reflects the browser's current network connectivity (true if online, false if offline)
      serverOnline: false,             // Boolean: Reflects the real-time server health via WebSocket (true if connected, false if disconnected)
      serverConnecting: false,         // Boolean: Indicates if the client is currently attempting to establish a connection to the server via WebSocket
      socket: null,                    // Instance of the Socket.IO client, used for real-time communication with the server
      manualOffline: isManualOffline(), // Allows user to force offline mode manually
      offlineMessageShown: false,      // Flag to avoid repeating offline warnings
      showOfflineInvoices: false,      // Controls the Offline Invoices dialog
      showAboutDialog: false,          // Controls the About dialog
      loadingAppInfo: false,           // Loading state for app info
      appInfoError: false,             // Error state for app info
      appInfo: [],                     // Stores application information
      appHeaders: [                    // Table headers for applications
        {
          title: this.__('Application'),
          value: 'app_name',
          align: 'start',
          sortable: true,
        },
        {
          title: this.__('Version'),
          value: 'installed_version',
          align: 'center',
          sortable: true,
        }
      ],
    };
  },
  computed: {
    /**
     * Detects whether the current host is an IPv4 address. When using an IP
     * address with HTTPS the WebSocket connection may fail, so we treat the
     * server as online as long as the browser itself is online.
     */
    isIpHost() {
      return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname);
    },
    /**
     * Determines the color of the status icon based on current network and server connectivity.
     * @returns {string} A Vuetify color string ('green', 'red').
     */
    statusColor() {
      // When running on an IP host we ignore the WebSocket status and rely on
      // the browser's network status instead.
      if (this.networkOnline && (this.serverOnline || this.isIpHost)) {
        return 'green'; // Green when connected or IP host
      }
      return 'red'; // Red for any offline state (no internet or server offline)
    },
    /**
     * Determines the Material Design Icon to display based on network and server status.
     * @returns {string} A Material Design Icon class string.
     */
    statusIcon() {
      // Note: 'mdi-loading' is conceptually here, but `v-progress-circular` handles the visual loading state.
      if (this.networkOnline && (this.serverOnline || this.isIpHost)) {
        return 'mdi-wifi'; // Wi-Fi icon when connected to server or IP host
      }
      if (this.networkOnline && !this.serverOnline && !this.isIpHost) {
        return 'mdi-wifi-strength-alert-outline'; // Wi-Fi with alert for server offline
      }
      return 'mdi-wifi-off'; // Wi-Fi off icon when no internet connection
    },
    /**
     * Provides a descriptive text for the tooltip that appears when hovering over the status icon.
     * This text is also used for the `title` attribute of the button.
     * @returns {string} A localized status message.
     */
    statusText() {
      if (this.serverConnecting) return this.__('Connecting to server...'); // Message when connecting
      if (!this.networkOnline) return this.__('No Internet Connection'); // Message when no internet
      if (this.isIpHost) return this.__('Connected');
      return this.serverOnline ? this.__('Connected to Server') : this.__('Server Offline'); // Messages for server status
    },
    /**
     * Returns a short string summarizing the last offline invoice sync results.
     */
    syncInfoText() {
      const { pending, synced, drafted } = this.syncTotals;

      // Ensure we have valid numbers
      const pendingCount = pending || 0;
      const syncedCount = synced || 0;
      const draftedCount = drafted || 0;

      if (!this.networkOnline) {
        // In offline mode, show all available information
        if (pendingCount > 0 || syncedCount > 0 || draftedCount > 0) {
          return `Pending: ${pendingCount} | Synced: ${syncedCount} | Draft: ${draftedCount}`;
        } else {
          return 'Offline Mode';
        }
      }

      // Online mode - show full status
      return `To Sync: ${pendingCount} | Synced: ${syncedCount} | Draft: ${draftedCount}`;
    },
    isDark() {
      return this.$theme.current === 'dark';
    },
    appBarColor() {
      // Use theme colors directly
      return this.isDark ? this.$vuetify.theme.themes.dark.colors.surface : 'white';
    }
  },
  watch: {
    // Watch for theme changes to update the app bar color immediately
    '$theme.current'() {
      // force Vue to re-render so computed styles update
      this.$forceUpdate();
    }
  },
  created() {
    // --- LOAD COMPANY INFO FROM FRAPPE BOOT ---
    // Attempts to get the company name from Frappe's boot data.
    const bootCompany = frappe?.boot?.user_info?.company;
    this.company = bootCompany || this.company; // Use boot company or default 'POS Awesome'
    console.log('Fetched company:', this.company);
    window.serverOnline = this.serverOnline;

    // If a specific company name is found (not the default), fetch its logo from Frappe.
    if (this.company !== 'POS Awesome') {
      frappe.call({
        method: 'frappe.client.get',
        args: { doctype: 'Company', name: this.company },
        callback: r => {
          if (r.message?.company_logo) this.companyImg = r.message.company_logo;
        },
        error: err => console.warn('Company lookup failed', err)
      });
    }

    // --- EVENT BUS HANDLERS FOR POS INFO/STATE ---
    // Register event listeners on the global event bus. These listeners react to events
    // emitted from other parts of the application to update the NavBar's state.
    this.$nextTick(() => {
      // Initialize pending invoices count
      this.updatePendingInvoices();

      // Initialize sync totals from localStorage
      this.syncTotals = getLastSyncTotals();

      // Only sync if online
      if (this.networkOnline) {
        this.syncPendingInvoices();
      }

      // Listen for changes in pending invoices from other components
      this.eventBus.on('pending_invoices_changed', this.updatePendingInvoices);
      this.eventBus.on('show_message', this.showMessage); // Listens for requests to show a snackbar message
      this.eventBus.on('set_company', data => { // Listens for updates to company details (name, logo)
        this.company = data.name || this.company;
        this.companyImg = data.company_logo || this.companyImg;
      });
      this.eventBus.on('register_pos_profile', data => { // Listens for the POS profile data
        this.posProfile = data.pos_profile;
        const paymentsItem = { text: 'Payments', icon: 'mdi-cash-register' };
        // Conditionally adds a 'Payments' navigation item if allowed by the POS profile and not already present
        if (this.posProfile.posa_use_pos_awesome_payments && !this.items.some(i => i.text === 'Payments')) {
          this.items.push(paymentsItem);
        }
      });
      this.eventBus.on('set_last_invoice', data => { this.lastInvoiceId = data; }); // Listens for the ID of the last processed invoice
      this.eventBus.on('freeze', data => { // Listens for requests to display a freeze dialog (e.g., during long operations)
        this.freeze = true;
        this.freezeTitle = data.title;
        this.freezeMsg = data.msg;
      });
      this.eventBus.on('unfreeze', () => { // Listens for requests to hide the freeze dialog
        this.freeze = false;
        this.freezeTitle = '';
        this.freezeMsg = '';
      });
    });
  },
  mounted() {
    // --- NETWORK ONLINE/OFFLINE EVENTS ---
    // Attach event listeners to the window object to detect changes in the browser's network status.
    window.addEventListener('online', this.handleOnline); // Fires when the browser regains network connectivity
    window.addEventListener('offline', this.handleOffline); // Fires when the browser loses network connectivity

    // --- SOCKET CONNECTION FOR SERVER STATUS ---
    // Initiates the WebSocket connection to monitor server health.
    this.initSocketConnection();

  },
  beforeDestroy() {
    // --- REMOVE NETWORK LISTENERS ---
    // Crucial cleanup: Remove event listeners from the window to prevent memory leaks
    // when the component is destroyed (e.g., navigating away from the page).
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    // Remove event bus listener for pending invoices
    this.eventBus.off('pending_invoices_changed', this.updatePendingInvoices);
    // --- CLOSE SOCKET ---
    // Disconnect and clean up Socket.IO listeners to ensure proper resource management.

    if (this.socket) {
      this.socket.off('connect'); // Remove 'connect' listener
      this.socket.off('disconnect'); // Remove 'disconnect' listener
      this.socket.off('connect_error'); // Remove 'connect_error' listener
      this.socket.close(); // Close the Socket.IO connection
      this.socket = null; // Clear the socket instance to prevent stale references
    }
  },

    methods: {
    /**
     * Initializes a Socket.IO connection, adapting the URL based on the environment:
     * - Development: localhost / 127.0.0.1
     * - Production: domain names (not IP addresses)
     * - Fallback: IP addresses (e.g., 192.168.x.x), default to port 9000
     */

    initSocketConnection() {
      this.serverConnecting = true;
      this.serverOnline = false;

      try {
        const { protocol, hostname: host, port: currentPort } = window.location;

        /**
         * Checks if the host is a local development address.
         */
        const isLocalhost = () => ['localhost', '127.0.0.1'].includes(host);

        /**
         * Checks if the host is a valid IPv4 address.
         */
        const isIpAddress = (hostname) => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);

        /**
         * Determine the environment:
         * - Development: localhost or 127.0.0.1
         * - Production: not an IP address
         * - Fallback: IP address (not localhost)
         */
        const isDevelopment = isLocalhost();
        const isProduction = !isDevelopment && !isIpAddress(host);
        const isFallback = !isDevelopment && isIpAddress(host);

        /**
         * Returns the appropriate Socket.IO URL based on environment.
         */
        const getSocketUrl = () => {
          if (isProduction) {
            // Production: use current port or default for protocol
            const port = currentPort || (protocol === 'https:' ? '443' : '80');
            const url = `${protocol}//${host}:${port}`;
            console.log('Production environment detected, using:', url);
            return url;
          }

          if (isDevelopment) {
            // Development: use dev socket port (9000 or Frappe-configured)
            const socketPort = window.frappe?.boot?.socketio_port || '9000';
            const url = `${protocol}//${host}:${socketPort}`;
            console.log('Development environment detected, using:', url);
            return url;
          }

          if (isFallback) {
            // Fallback: IP addresses (e.g., 192.168.x.x), default to port 9000
            const fallbackUrl = `${protocol}//${host}:9000`;
            console.log('IP-based host detected, using fallback:', fallbackUrl);
            return fallbackUrl;
          }

          // As a final fallback, use port 9000
          const defaultFallbackUrl = `${protocol}//${host}:9000`;
          console.log('Unknown environment, using fallback:', defaultFallbackUrl);
          return defaultFallbackUrl;
        };

        // Create the Socket.IO client with connection options
        this.socket = io(getSocketUrl(), {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          forceNew: true
        });

        /**
         * Event: Successfully connected
         */
        this.socket.on('connect', () => {
          this.serverOnline = true;
          window.serverOnline = true;
          this.serverConnecting = false;
          this.offlineMessageShown = false; // reset offline warning flag
          console.log('Socket.IO: Connected to server');
          this.eventBus.emit('server-online');
        });

        /**
         * Event: Disconnected from server
         */
        this.socket.on('disconnect', (reason) => {
          this.serverOnline = false;
          window.serverOnline = false;
          this.serverConnecting = false;
          // Connection status is tracked through state variables and UI
          // notifications, so avoid cluttering the browser console with a
          // disconnection warning.
          // console.warn('Socket.IO: Disconnected from server. Reason:', reason);

          this.eventBus.emit('server-offline');

          if (!this.offlineMessageShown) {
            this.showMessage({
              color: 'error',
              title: this.__('Server connection lost. Please check your internet connection.')
            });
            this.offlineMessageShown = true;
          }
        });

        /**
         * Event: Connection error
         */
        this.socket.on('connect_error', (error) => {
          this.serverOnline = false;
          window.serverOnline = false;
          this.serverConnecting = false;
          console.error('Socket.IO: Connection error:', error.message);
          this.eventBus.emit('server-offline');

          if (!this.offlineMessageShown) {
            this.showMessage({
              color: 'error',
              title: this.__('Unable to connect to server. Please try again later.')
            });
            this.offlineMessageShown = true;
          }
        });
      } catch (err) {
        this.serverOnline = false;
        window.serverOnline = false;
        this.serverConnecting = false;
        console.error('Failed to initialize Socket.IO connection:', err);

        this.showMessage({
          color: 'error',
          title: this.__('Failed to initialize server connection.')
        });
      }
    },

    // --- SIGNAL ONLINE/OFFLINE EVENTS ---
    /**
     * Handles the browser's native 'online' event.
     * When the browser regains network connectivity, it updates the `networkOnline` status
     * and attempts to reconnect to the server if not already connected.
     */
    handleOnline() {
      this.networkOnline = true; // Browser is now online
      console.log('Browser is online');
      this.offlineMessageShown = false; // allow future offline warnings
      this.eventBus.emit('network-online');
      this.syncPendingInvoices();
      window.serverOnline = this.serverOnline;
      // If the server is not online and not currently connecting, and a socket instance exists,
      // explicitly try to connect the socket. This helps in re-establishing server connection
      // immediately after internet recovery.
      if (!this.serverOnline && !this.serverConnecting && this.socket) {
        this.socket.connect();
      } else if (!this.socket) {
        // If for some reason the socket instance is null, re-initialize it.
        this.initSocketConnection();
      }
    },
    /**
     * Handles the browser's native 'offline' event.
     * When the browser loses network connectivity, it updates all relevant status flags
     * and disconnects the Socket.IO connection as the server will be unreachable.
     */
    handleOffline() {
      this.networkOnline = false; // Browser is now offline
      this.serverOnline = false; // Server is considered unreachable if there's no internet
      window.serverOnline = false;
      this.serverConnecting = false; // Stop any ongoing connection attempts
      console.log('Browser is offline');
      this.eventBus.emit('network-offline');
      // Disconnect the socket gracefully if the network goes offline.
      if (this.socket) {
        this.socket.disconnect();
      }
    },

    toggleManualOffline() {
      this.manualOffline = !this.manualOffline;
      setManualOffline(this.manualOffline);

      // Show message with shorter duration
      this.showMessage({
        color: this.manualOffline ? 'warning' : 'success',
        title: this.manualOffline ? this.__('Switched to Offline Mode') : this.__('Switched to Online Mode')
      });

      if (this.manualOffline) {
        this.serverOnline = false;
        window.serverOnline = false;
        if (this.socket) {
          this.socket.disconnect();
        }
        this.eventBus.emit('network-offline');
      } else {
        window.serverOnline = this.serverOnline;
        if (this.networkOnline) {
          if (this.socket) {
            this.socket.connect();
          } else {
            this.initSocketConnection();
          }
        }
        this.eventBus.emit(this.networkOnline ? 'network-online' : 'network-offline');
      }
    },
    // --- NAVIGATION AND POS ACTIONS ---
    /**
     * Toggles the visibility and mini-variant state of the side navigation drawer.
     */
    handleNavClick() {
      this.drawer = true; // Open the drawer
      this.mini = false; // Ensure it's in expanded mode
    },
    /**
     * Handles the mouse leaving the navigation drawer area.
     * If the drawer is open, it sets a timeout to collapse it back to mini-variant.
     */
    handleMouseLeave() {
      if (!this.drawer) return; // Do nothing if the drawer is already closed
      clearTimeout(this._closeTimeout); // Clear any previous timeout to prevent conflicts
      this._closeTimeout = setTimeout(() => {
        this.drawer = false; // Close the drawer
        this.mini = true; // Set it to mini-variant
      }, 250); // Delay for 250 milliseconds
    },
    /**
     * Emits a 'changePage' event to the parent component, signaling a request to navigate to a new page.
     * @param {string} key - The identifier for the page to navigate to (e.g., 'POS', 'Payments').
     */
    changePage(key) {
      this.$emit('changePage', key);
    },
    /**
     * Navigates the user back to the main Frappe desk view and reloads the page.
     */
    goDesk() {
      frappe.set_route('/'); // Set Frappe route to home
      location.reload(); // Reload the entire page
    },
    /**
     * Emits an 'open_closing_dialog' event to the event bus, typically to trigger
     * the display of a dialog for closing the POS shift.
     */
    openCloseShift() {
      this.eventBus.emit('open_closing_dialog');
    },
    /**
     * Prints the last generated sales invoice.
     * It constructs a print URL using the invoice ID and POS profile settings,
     * then opens it in a new window and triggers the print command.
     */
    printLastInvoice() {
      if (!this.lastInvoiceId) return; // Exit if no invoice ID is available
      // Determine the print format to use
      const pf = this.posProfile.print_format_for_online || this.posProfile.print_format;
      // Determine if letterhead should be excluded
      const noLetterHead = this.posProfile.letter_head || 0;
      // Construct the full print URL for the Sales Invoice
      const url = `${frappe.urllib.get_base_url()}/printview?doctype=Sales%20Invoice&name=${this.lastInvoiceId}` +
        `&trigger_print=1&format=${pf}&no_letterhead=${noLetterHead}`;
      if (this.posProfile.posa_silent_print) {
        silentPrint(url);
      } else {
        const win = window.open(url, '_blank');
        win.addEventListener('load', () => win.print(), { once: true });
      }
    },
    goAbout() {
      this.showAboutDialog = true;
      this.loadAppInfo();
    },

    loadAppInfo() {
      this.loadingAppInfo = true;
      this.appInfoError = false;

      frappe.call({
        method: 'posawesome.posawesome.api.utilities.get_app_info',
        callback: r => {
          this.loadingAppInfo = false;
          if (Array.isArray(r.message.apps)) {
            this.appInfo = r.message.apps;
          } else {
            this.appInfoError = true;
          }
        },
        error: () => {
          this.loadingAppInfo = false;
          this.appInfoError = true;
        }
      });
    },

    toggleTheme() {
      // Toggle the theme using the theme plugin
      this.$theme.toggle();

      // Force re-render of components that might not react to theme change
      this.$forceUpdate();

      // Add dark-theme class to document root for global CSS targeting
      document.documentElement.classList.toggle('dark-theme', this.$theme.current === 'dark');

      // Add a smooth transition class to the body for theme changes
      document.body.classList.add('theme-transition');

      // Remove the transition class after the transition completes
      setTimeout(() => {
        document.body.classList.remove('theme-transition');
      }, 1000);

      // Emit an event that other components can listen to
      this.eventBus.emit('theme-changed', this.$theme.current);
    },


    /**
     * Logs out the current user from the Frappe system.
     * Upon successful logout, it redirects the user to the Frappe home page and reloads.
     */
    logOut() {
      frappe.call({
        method: 'logout', // Frappe API method for logout
        callback: r => {
          if (!r.exc) { // If no exception occurred during logout
            frappe.set_route('/app/home'); // Set route to home
            location.reload(); // Reload the page to complete logout process
          }
        }
      });
    },

    async syncPendingInvoices() {
      const pending = getPendingOfflineInvoiceCount();
      if (pending) {
        this.showMessage({
          title: `${pending} invoice${pending > 1 ? 's' : ''} pending for sync`,
          color: 'warning'
        });
      }
      const result = await syncOfflineInvoices();
      if (result && (result.synced || result.drafted)) {
        if (result.synced) {
          this.showMessage({
            title: `${result.synced} offline invoice${result.synced > 1 ? 's' : ''} synced`,
            color: 'success'
          });
        }
        if (result.drafted) {
          this.showMessage({
            title: `${result.drafted} offline invoice${result.drafted > 1 ? 's' : ''} saved as draft`,
            color: 'warning'
          });
        }
      }
      if (result) {
        this.syncTotals = { ...result };
      }
      this.updatePendingInvoices();
      this.eventBus.emit('pending_invoices_changed', this.pendingInvoices);
    },
    /**
     * Reads the current number of invoices stored offline and updates the badge
     * counter in the navigation bar.
     */
    updatePendingInvoices() {
      this.pendingInvoices = getPendingOfflineInvoiceCount();
    },
    updateAfterDelete() {
      this.updatePendingInvoices();
      this.eventBus.emit('pending_invoices_changed', this.pendingInvoices);
    },

    async clearCache() {
      try {
        await clearAllCache();
      } catch (e) {
        console.error('Failed to clear cache', e);
      } finally {
        location.reload();
      }
    },
    /**
     * Displays a snackbar message at the top right of the screen.
     * @param {object} data - An object containing `color` (for snackbar styling) and `title` (the message text).
     */
    showMessage(data) {
      this.snack = true; // Make snackbar visible
      this.snackColor = data.color; // Set snackbar color
      this.snackText = data.title; // Set snackbar text
    },
    // Translation helper is provided globally via `eventBus` plugin.
  }
};
</script>

<style scoped>
/* --- App Bar and Drawer Styling --- */
/* Styles related to the main application bar and the side navigation drawer. */

/* Adds a subtle bottom border to the app bar for visual separation. */
.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}

/* Sets a secondary text color, typically a lighter shade of black. */
.text-secondary {
  color: rgba(0, 0, 0, 0.6) !important;
}

/* Custom styling for the navigation drawer, including background and transition effects. */
.drawer-custom {
  background-color: var(--surface-secondary);
  transition: var(--transition-normal);
}

/* Styling for the header section of the expanded navigation drawer. */
.drawer-header {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 var(--dynamic-md);
}

/* Styling for the header section of the mini (collapsed) navigation drawer. */
.drawer-header-mini {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 64px;
}

/* Styling for the company name text within the drawer header. */
.drawer-company {
  margin-left: var(--dynamic-sm);
  flex: 1;
  font-weight: 500;
  font-size: 1rem;
  color: var(--text-primary);
}

/* Styling for icons within the navigation drawer list items. */
.drawer-icon {
  font-size: 24px;
  color: var(--primary-start);
}

/* Styling for the title text of navigation drawer list items. */
.drawer-item-title {
  margin-left: var(--dynamic-xs);
  font-weight: 500;
  color: var(--text-primary);
}

/* Hover effect for all list items in the navigation drawer. */
.v-list-item:hover {
  background-color: var(--table-row-hover) !important;
}

/* Styling for the actively selected list item in the navigation drawer. */
.active-item {
  background-color: rgba(var(--primary-start), 0.2) !important;
}

/* --- User Menu Styling --- */
/* Styles specific to the user actions dropdown menu. */

/* Styling for the main "Menu" button that activates the dropdown. */
.user-menu-btn {
  text-transform: none;
  padding: var(--dynamic-xs) var(--dynamic-sm);
  font-weight: 500;
}

/* Styling for the card that contains the dropdown menu list. */
.user-menu-card {
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

/* Padding for the list within the user menu card. */
.user-menu-list {
  padding-top: var(--dynamic-xs);
  padding-bottom: var(--dynamic-xs);
}

/* Padding for individual list items within the user menu. */
.user-menu-item {
  padding: calc(var(--dynamic-xs) + 2px) var(--dynamic-md);
}

/* Minimum width for icons within user menu list items to ensure alignment. */
.user-menu-item .v-list-item-icon {
  min-width: 36px;
}

/* Margin for dividers within the user menu list. */
.user-menu-card .v-divider {
  margin: 8px 0;
}

/* --- Status Indicator Styling --- */
.status-btn {
  transition: all 0.3s ease;
}

.status-btn:hover {
  transform: scale(1.1);
}

.status-tooltip {
  padding: 4px 0;
  text-align: center;
}

.status-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.status-detail {
  font-size: 0.8rem;
  opacity: 0.9;
}

.status-warning {
  font-size: 0.8rem;
  color: #ff9800;
  margin-top: 4px;
}

/* --- Sync Info Styling --- */
.sync-chip {
  cursor: pointer;
  transition: all 0.3s ease;
}

.sync-chip:hover {
  transform: scale(1.05);
}

.sync-text {
  font-size: 0.75rem;
  white-space: nowrap;
}

/* Enhanced Navbar Styling */
.navbar-enhanced {
  background-image: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  background-color: #ffffff !important;
  border-bottom: 2px solid #e3f2fd !important;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  padding-bottom: 4px !important;
  /* Reduced bottom padding */
}

.navbar-enhanced:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
}

/* Logo and Brand Styling */
.navbar-title {
  text-decoration: none !important;
  border-bottom: none !important;
}

.navbar-title:hover {
  text-decoration: none !important;
}

.logo-container {
  margin: 0 8px;
  /* Reduced margin */
  padding: 2px;
  /* Reduced padding */
  border-radius: 8px;
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-img {
  filter: brightness(0) invert(1);
  transition: transform 0.3s ease;
}

.logo-container:hover .logo-img {
  transform: scale(1.1);
}

.brand-title {
  font-size: 1.5rem !important;
  font-weight: 700 !important;
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: all 0.3s ease;
  text-decoration: none !important;
}

.brand-title:hover {
  transform: scale(1.05);
  text-decoration: none !important;
}

.brand-pos {
  font-weight: 300;
}

.brand-awesome {
  font-weight: 800;
}

/* Navigation Icon */
.nav-icon {
  border-radius: 12px;
  padding: 6px;
  /* Reduced padding */
  transition: all 0.3s ease;
}

.nav-icon:hover {
  background-color: rgba(25, 118, 210, 0.1);
  transform: scale(1.1);
}

/* Profile Section */
.profile-section {
  margin: 0 8px;
  /* Reduced margin */
}

.profile-chip {
  font-weight: 500;
  padding: 6px 12px;
  /* Reduced padding */
  border-radius: 20px;
  transition: all 0.3s ease;
}

.profile-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}


/* Enhanced Status Section */
.status-section-enhanced {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Reduced gap */
  margin-right: 8px;
  /* Reduced margin */
}

.status-btn-enhanced {
  background: rgba(25, 118, 210, 0.1) !important;
  border: 1px solid rgba(25, 118, 210, 0.3);
  transition: all 0.3s ease;
  padding: 4px;
  /* Reduced padding */
}

.status-btn-enhanced:hover {
  background: rgba(25, 118, 210, 0.2) !important;
  transform: scale(1.05);
}

.status-info-always-visible {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 120px;
}

.status-title-inline {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  transition: color 0.3s ease;
}

.status-title-inline.status-connected {
  color: #4caf50;
}

.status-title-inline.status-offline {
  color: #f44336;
}

.status-detail-inline {
  font-size: 11px;
  color: #666;
  line-height: 1.2;
  margin-top: 2px;
}

/* Compact Menu Button - Better Navbar Integration */
.menu-btn-compact {
  margin-left: 8px;
  margin-right: 4px;
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 600;
  text-transform: none;
  font-size: 13px;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
  min-width: 90px;
  height: 36px;
}

.menu-btn-compact:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
  background: linear-gradient(135deg, #1565c0 0%, #1976d2 100%);
}

/* Compact Menu Card - Smaller and Better Positioned */
.menu-card-compact {
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  border: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
  min-width: 260px;
  max-width: 280px;
  margin-top: 2px;
}

/* Compact Menu Header */
.menu-header-compact {
  padding: 12px 16px 10px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(25, 118, 210, 0.06);
}

.menu-header-text-compact {
  font-size: 14px;
  font-weight: 600;
  color: #1976d2;
  letter-spacing: 0.3px;
}

/* Compact Menu List */
.menu-list-compact {
  padding: 8px 6px 12px;
  background: #ffffff;
}

/* Compact Menu Items */
.menu-item-compact {
  border-radius: 12px;
  margin: 3px 0;
  padding: 12px 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-item-compact::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  transition: all 0.3s ease;
  z-index: 0;
  border-radius: 12px;
}

.menu-item-compact:hover::before {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(66, 165, 245, 0.08) 100%);
}

.menu-item-compact:hover {
  transform: translateX(3px) scale(1.01);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
}

/* Compact Icon Wrapper */
.menu-icon-wrapper-compact {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

/* Compact Content Wrapper */
.menu-content-compact {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  z-index: 1;
}

/* Compact Icon Colors */
.primary-icon {
  background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.2);
}

.secondary-icon {
  background: linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%);
  box-shadow: 0 2px 6px rgba(123, 31, 162, 0.2);
}

.info-icon {
  background: linear-gradient(135deg, #0288d1 0%, #4fc3f7 100%);
  box-shadow: 0 2px 6px rgba(2, 136, 209, 0.2);
}

.neutral-icon {
  background: linear-gradient(135deg, #616161 0%, #9e9e9e 100%);
  box-shadow: 0 2px 6px rgba(97, 97, 97, 0.2);
}

.danger-icon {
  background: linear-gradient(135deg, #d32f2f 0%, #f44336 100%);
  box-shadow: 0 2px 6px rgba(211, 47, 47, 0.2);
}

/* Compact Text Styling */
.menu-item-title-compact {
  font-weight: 600;
  font-size: 14px;
  color: #212121;
  line-height: 1.2;
  margin-bottom: 1px;
}

.menu-item-subtitle-compact {
  font-size: 11px;
  color: #666666;
  line-height: 1.3;
  font-weight: 400;
}

/* Compact Section Divider */
.menu-section-divider-compact {
  margin: 8px 10px;
  opacity: 0.12;
  border-color: #1976d2;
}

/* Compact Hover Effects */
.primary-action:hover .primary-icon {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 3px 8px rgba(25, 118, 210, 0.25);
}

.secondary-action:hover .secondary-icon {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 0 3px 8px rgba(123, 31, 162, 0.25);
}

.info-action:hover .info-icon {
  transform: scale(1.1) rotate(360deg);
  box-shadow: 0 3px 8px rgba(2, 136, 209, 0.25);
}

.neutral-action:hover .neutral-icon {
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(97, 97, 97, 0.25);
}

.danger-action:hover .danger-icon {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 0 3px 8px rgba(211, 47, 47, 0.25);
}

.danger-action:hover::before {
  background: linear-gradient(135deg, rgba(211, 47, 47, 0.05) 0%, rgba(244, 67, 54, 0.08) 100%) !important;
}

.warning-icon {
  background: linear-gradient(135deg, #ff9800 0%, #ffc107 100%);
  box-shadow: 0 2px 6px rgba(255, 152, 0, 0.2);
}

.warning-action:hover .warning-icon {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 0 3px 8px rgba(255, 152, 0, 0.25);
}

.warning-action:hover::before {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 193, 7, 0.08) 100%) !important;
}

/* Compact Responsive Design */
@media (max-width: 768px) {
  .menu-card-compact {
    min-width: 240px;
    max-width: 260px;
    border-radius: 14px;
  }

  .menu-item-compact {
    padding: 10px 14px;
    min-height: 52px;
    gap: 10px;
  }

  .menu-icon-wrapper-compact {
    width: 30px;
    height: 30px;
  }

  .menu-header-compact {
    padding: 10px 14px 8px;
  }

  .menu-btn-compact {
    margin-left: 6px;
    padding: 5px 14px;
    min-width: 85px;
    height: 34px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .menu-card-compact {
    min-width: 220px;
    max-width: 240px;
  }

  .menu-item-compact {
    padding: 9px 12px;
    min-height: 48px;
    gap: 9px;
  }

  .menu-header-compact {
    padding: 9px 12px 7px;
  }

  .menu-btn-compact {
    min-width: 80px;
    height: 32px;
  }
}

/* Compact Animation for Menu Appearance */
.v-overlay__content {
  animation: menuSlideInCompact 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes menuSlideInCompact {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Compact Focus States */
.menu-item-compact:focus-visible {
  outline: 1px solid #1976d2;
  outline-offset: 1px;
}

.menu-btn-compact:focus-visible {
  outline: 1px solid #1976d2;
  outline-offset: 2px;
}

/* Offline Invoices Button Enhancement */
.offline-invoices-btn {
  position: relative;
  transition: all 0.3s ease;
  padding: 4px;
  /* Reduced padding */
}

.offline-invoices-btn:hover {
  transform: scale(1.05);
}

.offline-invoices-btn.has-pending {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
  }

  70% {
    box-shadow: 0 0 0 8px rgba(244, 67, 54, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
  }
}

/* Remove any text decoration globally for navbar */
.navbar-enhanced * {
  text-decoration: none !important;
}

.navbar-enhanced a {
  text-decoration: none !important;
}

.navbar-enhanced a:hover {
  text-decoration: none !important;
}

/* Responsive Design */
@media (max-width: 768px) {
  .brand-title {
    font-size: 1.2rem !important;
  }

  .profile-section {
    margin: 0 8px;
  }

  .profile-chip {
    padding: 6px 12px;
  }

  .menu-btn-enhanced {
    padding: 6px 16px;
  }

  .status-info-always-visible {
    display: none;
  }

  .status-section-enhanced {
    margin-right: 4px;
    /* Further reduced for mobile */
  }
}

@media (max-width: 480px) {
  .logo-container {
    margin: 0 8px;
  }

  .brand-title {
    font-size: 1rem !important;
  }
}

/* About Dialog - Improved Compact Styling */
.about-dialog-card-improved {
  border-radius: 16px !important;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
  max-height: 90vh;
}

/* Improved Header with Better Spacing */
.about-header-improved {
  background: white;
  color: #1a1a1a;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
  min-height: auto !important;
}

.about-header-improved::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #1976d2 0%, #42a5f5 100%);
}

.header-content-improved {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-right: 60px;
  /* Space for close button */
}

.header-icon-wrapper-improved {
  background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
  border-radius: 14px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
}

.header-icon {
  color: white;
}

.header-text-improved {
  flex: 1;
}

.header-title-improved {
  margin: 0 0 4px 0;
  font-weight: 600;
  color: #1a1a1a;
  font-size: 1.25rem;
  line-height: 1.2;
}

.header-subtitle-improved {
  margin: 0;
  font-size: 14px;
  color: #666;
  font-weight: 400;
  line-height: 1.2;
}

.header-stats-improved {
  display: flex;
  gap: 8px;
}

.status-chip-improved {
  font-weight: 600;
  border-radius: 10px;
  height: 28px !important;
}

.close-btn-improved {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #666 !important;
}

.white-background {
  background: white;
}

/* Improved Content */
.content-container-improved {
  padding: 20px;
  max-height: 55vh;
  overflow-y: auto;
}

.empty-state-improved {
  padding: 30px;
}

/* Apps List - Improved Grid Layout */
.apps-list-improved {
  width: 100%;
}

.apps-header-improved {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.apps-grid-improved {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  max-height: 350px;
  overflow-y: auto;
}

.app-item-improved {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.app-item-improved:hover {
  background: #e3f2fd;
  border-color: #1976d2;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);
}

.app-icon-improved {
  background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
}

.app-details-improved {
  flex: 1;
  min-width: 0;
}

.app-name-improved {
  font-weight: 500;
  font-size: 14px;
  color: #1a1a1a;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-version-improved {
  font-size: 12px;
  color: #666;
  font-weight: 400;
  line-height: 1.3;
  margin-top: 2px;
}

/* Improved Footer */
.dialog-actions-improved {
  background: #f8f9fa;
  border-top: 1px solid #f0f0f0;
  min-height: auto !important;
}

.footer-info-improved {
  display: flex;
  align-items: center;
}

.footer-text-improved {
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.close-btn-action-improved {
  border-radius: 10px;
  font-weight: 600;
  text-transform: none;
  height: 36px;
  padding: 0 20px;
}

/* Responsive Design */
@media (max-width: 700px) {
  .about-dialog-card-improved {
    margin: 16px;
    max-height: 85vh;
  }

  .apps-grid-improved {
    grid-template-columns: 1fr;
    max-height: 300px;
  }

  .header-content-improved {
    gap: 12px;
    padding-right: 50px;
  }

  .content-container-improved {
    padding: 16px;
    max-height: 50vh;
  }
}

/* Scrollbar Styling */
.content-container-improved::-webkit-scrollbar,
.apps-grid-improved::-webkit-scrollbar {
  width: 6px;
}

.content-container-improved::-webkit-scrollbar-track,
.apps-grid-improved::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.content-container-improved::-webkit-scrollbar-thumb,
.apps-grid-improved::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.content-container-improved::-webkit-scrollbar-thumb:hover,
.apps-grid-improved::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Modern Theme Toggle Switch - Enhanced Size and Visibility */
.modern-theme-toggle {
  position: relative;
  cursor: pointer;
  user-select: none;
  touch-action: pan-x;
  -webkit-tap-highlight-color: transparent;
  margin: 0 12px;
  display: flex;
  align-items: center;
}

.toggle-track {
  width: 64px;
  /* Increased from 50px */
  height: 32px;
  /* Increased from 24px */
  padding: 0;
  border-radius: 30px;
  background-color: #4D4D4D;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.1);
  /* Added border for better visibility */
}

.toggle-track.dark-active {
  background-color: #BB86FC;
  border-color: rgba(255, 255, 255, 0.2);
  /* Lighter border in dark mode */
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 28px;
  /* Increased from 20px */
  height: 28px;
  /* Increased from 20px */
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  /* Enhanced shadow */
  transition: all 0.25s ease;
  z-index: 1;
}

.toggle-thumb.dark-active {
  transform: translateX(32px);
  /* Adjusted for new width */
}

.toggle-moon,
.toggle-sun {
  width: 24px;
  /* Increased from 16px */
  height: 24px;
  /* Increased from 16px */
  position: absolute;
  top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.25s ease;
}

.toggle-moon {
  right: 8px;
  /* Adjusted position */
  opacity: 0;
  color: #fff;
}

.toggle-sun {
  left: 8px;
  /* Adjusted position */
  opacity: 1;
  color: #fff;
}

.toggle-track.dark-active .toggle-moon {
  opacity: 1;
}

.toggle-track.dark-active .toggle-sun {
  opacity: 0;
}

/* Add hover and focus effects */
.modern-theme-toggle:hover .toggle-track {
  background-color: #555;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
  /* Added glow effect on hover */
}

.modern-theme-toggle:hover .toggle-track.dark-active {
  background-color: #9D6FE7;
  box-shadow: 0 0 8px rgba(187, 134, 252, 0.4);
  /* Purple glow in dark mode */
}

.modern-theme-toggle:focus-visible {
  outline: 2px solid #BB86FC;
  outline-offset: 2px;
  border-radius: 30px;
}

/* Animation for the icons */
.toggle-moon svg,
.toggle-sun svg {
  width: 20px;
  /* Increased from default */
  height: 20px;
  /* Increased from default */
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

.modern-theme-toggle:hover .toggle-moon svg,
.modern-theme-toggle:hover .toggle-sun svg {
  transform: rotate(12deg) scale(1.1);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modern-theme-toggle {
    width: 46px;
    height: 24px;
  }

  .toggle-track {
    width: 40px;
    height: 20px;
  }

  .toggle-thumb {
    width: 16px;
    height: 16px;
  }

  .toggle-thumb.dark-active {
    transform: translateX(18px);
  }

  .toggle-sun,
  .toggle-moon {
    width: 14px;
    height: 14px;
  }
}

/* --- Dark Theme Adjustments --- */
/* Navbar and Drawer styling when dark mode is active */
:deep(.dark-theme) .navbar-enhanced,
:deep(.v-theme--dark) .navbar-enhanced,
::v-deep(.dark-theme) .navbar-enhanced,
::v-deep(.v-theme--dark) .navbar-enhanced {
  background-color: var(--surface-primary) !important;
  background-image: none !important;
  border-bottom-color: var(--divider) !important;
  color: var(--text-primary) !important;
}

:deep(.dark-theme) .v-app-bar,
:deep(.v-theme--dark) .v-app-bar {
  background-color: var(--surface-primary) !important;
  color: var(--text-primary) !important;
}

:deep(.dark-theme) .v-app-bar .v-btn,
:deep(.v-theme--dark) .v-app-bar .v-btn {
  color: var(--text-primary) !important;
}

:deep(.dark-theme) .drawer-custom,
:deep(.v-theme--dark) .drawer-custom,
::v-deep(.dark-theme) .drawer-custom,
::v-deep(.v-theme--dark) .drawer-custom {
  background-color: var(--background) !important;
}

:deep(.dark-theme) .drawer-item-title,
:deep(.v-theme--dark) .drawer-item-title,
::v-deep(.dark-theme) .drawer-item-title,
::v-deep(.v-theme--dark) .drawer-item-title {
  color: var(--text-secondary) !important;
}

:deep(.dark-theme) .drawer-header .drawer-company,
:deep(.v-theme--dark) .drawer-header .drawer-company,
::v-deep(.dark-theme) .drawer-header .drawer-company,
::v-deep(.v-theme--dark) .drawer-header .drawer-company {
  color: var(--text-secondary) !important;
}
</style>
