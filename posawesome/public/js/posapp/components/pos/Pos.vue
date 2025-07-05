<template>
  <div class="pos-main-container dynamic-container" :style="responsiveStyles">
    <ClosingDialog></ClosingDialog>
    <Drafts></Drafts>
    <SalesOrders></SalesOrders>
    <Returns></Returns>
    <NewAddress></NewAddress>
    <MpesaPayments></MpesaPayments>
    <Variants></Variants>
    <OpeningDialog v-if="dialog" :dialog="dialog"></OpeningDialog>
    <v-row v-show="!dialog" dense class="ma-0 dynamic-main-row">
      <v-col v-show="!payment && !offers && !coupons" xl="5" lg="5" md="5" sm="5" cols="12" class="pos dynamic-col">
        <ItemsSelector></ItemsSelector>
      </v-col>
      <v-col v-show="offers" xl="5" lg="5" md="5" sm="5" cols="12" class="pos dynamic-col">
        <PosOffers></PosOffers>
      </v-col>
      <v-col v-show="coupons" xl="5" lg="5" md="5" sm="5" cols="12" class="pos dynamic-col">
        <PosCoupons></PosCoupons>
      </v-col>
      <v-col v-show="payment" xl="5" lg="5" md="5" sm="5" cols="12" class="pos dynamic-col">
        <Payments></Payments>
      </v-col>

      <v-col xl="7" lg="7" md="7" sm="7" cols="12" class="pos dynamic-col">
        <Invoice></Invoice>
      </v-col>
    </v-row>
  </div>
</template>

<script>

import ItemsSelector from './ItemsSelector.vue';
import Invoice from './Invoice.vue';
import OpeningDialog from './OpeningDialog.vue';
import Payments from './Payments.vue';
import PosOffers from './PosOffers.vue';
import PosCoupons from './PosCoupons.vue';
import Drafts from './Drafts.vue';
import SalesOrders from "./SalesOrders.vue";
import ClosingDialog from './ClosingDialog.vue';
import NewAddress from './NewAddress.vue';
import Variants from './Variants.vue';
import Returns from './Returns.vue';
import MpesaPayments from './Mpesa-Payments.vue';
import { getCachedOffers, saveOffers, getOpeningStorage, setOpeningStorage, clearOpeningStorage, initPromise } from '../../../offline/index.js';
// Import the cache cleanup function
import { clearExpiredCustomerBalances } from "../../../offline/index.js";
import { responsiveMixin } from '../../mixins/responsive.js';

export default {
  mixins: [responsiveMixin],
  data: function () {
    return {
      dialog: false,
      pos_profile: '',
      pos_opening_shift: '',
      payment: false,
      offers: false,
      coupons: false,
    };
  },

  components: {
    ItemsSelector,
    Invoice,
    OpeningDialog,
    Payments,
    Drafts,
    ClosingDialog,

    Returns,
    PosOffers,
    PosCoupons,
    NewAddress,
    Variants,
    MpesaPayments,
    SalesOrders,
  },

  methods: {
    async check_opening_entry() {
      await initPromise;
      return frappe
        .call('posawesome.posawesome.api.shifts.check_opening_shift', {
          user: frappe.session.user,
        })
        .then((r) => {
          if (r.message) {
            this.pos_profile = r.message.pos_profile;
            this.pos_opening_shift = r.message.pos_opening_shift;
            this.get_offers(this.pos_profile.name);
            this.eventBus.emit('register_pos_profile', r.message);
            this.eventBus.emit('set_company', r.message.company);
            try {
              frappe.realtime.emit('pos_profile_registered');
            } catch (e) {
              console.warn('Realtime emit failed', e);
            }
            console.info('LoadPosProfile');
            try {
              setOpeningStorage(r.message);
            } catch (e) {
              console.error('Failed to cache opening data', e);
            }
          } else {
            const data = getOpeningStorage();
            if (data) {
              this.pos_profile = data.pos_profile;
              this.pos_opening_shift = data.pos_opening_shift;
              this.get_offers(this.pos_profile.name);
              this.eventBus.emit('register_pos_profile', data);
              this.eventBus.emit('set_company', data.company);
              try {
                frappe.realtime.emit('pos_profile_registered');
              } catch (e) {
                console.warn('Realtime emit failed', e);
              }
              console.info('LoadPosProfile (cached)');
              return;
            }
            this.create_opening_voucher();
          }
        })
        .catch(() => {
          const data = getOpeningStorage();
          if (data) {
            this.pos_profile = data.pos_profile;
            this.pos_opening_shift = data.pos_opening_shift;
            this.get_offers(this.pos_profile.name);
            this.eventBus.emit('register_pos_profile', data);
            this.eventBus.emit('set_company', data.company);
            try {
              frappe.realtime.emit('pos_profile_registered');
            } catch (e) {
              console.warn('Realtime emit failed', e);
            }
            console.info('LoadPosProfile (cached)');
            return;
          }
          this.create_opening_voucher();
        });
    },
    create_opening_voucher() {
      this.dialog = true;
    },
    get_closing_data() {
      return frappe
        .call(
          'posawesome.posawesome.doctype.pos_closing_shift.pos_closing_shift.make_closing_shift_from_opening',
          {
            opening_shift: this.pos_opening_shift,
          }
        )
        .then((r) => {
          if (r.message) {
            this.eventBus.emit('open_ClosingDialog', r.message);
          } else {
            // console.log(r);
          }
        });
    },
    submit_closing_pos(data) {
      frappe
        .call(
          'posawesome.posawesome.doctype.pos_closing_shift.pos_closing_shift.submit_closing_shift',
          {
            closing_shift: data,
          }
        )
        .then((r) => {
          if (r.message) {
            // Clear the cached opening shift data
            this.pos_opening_shift = null;
            this.pos_profile = null;

            // Clear from local storage
            clearOpeningStorage();

            this.eventBus.emit('show_message', {
              title: `POS Shift Closed`,
              color: 'success',
            });
            this.check_opening_entry();
          } else {
            console.log(r);
          }
        });
    },
    get_offers(pos_profile) {
      // Load cached offers if available
      if (this.pos_profile && this.pos_profile.posa_local_storage) {
        const cached = getCachedOffers();
        if (cached.length) {
          this.eventBus.emit('set_offers', cached);
        }
      }

      return frappe
        .call('posawesome.posawesome.api.offers.get_offers', {
          profile: pos_profile,
        })
        .then((r) => {
          if (r.message) {
            console.info('LoadOffers');
            saveOffers(r.message);
            this.eventBus.emit('set_offers', r.message);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch offers:', err);
          const cached = getCachedOffers();
          if (cached.length) {
            this.eventBus.emit('set_offers', cached);
          }
        });
    },
    get_pos_setting() {
      frappe.db.get_doc('POS Settings', undefined).then((doc) => {
        this.eventBus.emit('set_pos_settings', doc);
      });
    },
  },

  mounted: function () {
    this.$nextTick(function () {
      this.check_opening_entry();
      this.get_pos_setting();
      this.eventBus.on('close_opening_dialog', () => {
        this.dialog = false;
      });
      this.eventBus.on('register_pos_data', (data) => {
        this.pos_profile = data.pos_profile;
        this.get_offers(this.pos_profile.name);
        this.pos_opening_shift = data.pos_opening_shift;
        this.eventBus.emit('register_pos_profile', data);
        console.info('LoadPosProfile');
      });
      this.eventBus.on('show_payment', (data) => {
        this.payment = true ? data === 'true' : false;
        this.offers = false ? data === 'true' : false;
        this.coupons = false ? data === 'true' : false;
      });
      this.eventBus.on('show_offers', (data) => {
        this.offers = true ? data === 'true' : false;
        this.payment = false ? data === 'true' : false;
        this.coupons = false ? data === 'true' : false;
      });
      this.eventBus.on('show_coupons', (data) => {
        this.coupons = true ? data === 'true' : false;
        this.offers = false ? data === 'true' : false;
        this.payment = false ? data === 'true' : false;
      });
      this.eventBus.on('open_closing_dialog', () => {
        this.get_closing_data();
      });
      this.eventBus.on('submit_closing_pos', (data) => {
        this.submit_closing_pos(data);
      });
    });
  },
  beforeUnmount() {
    this.eventBus.off('close_opening_dialog');
    this.eventBus.off('register_pos_data');
    this.eventBus.off('LoadPosProfile');
    this.eventBus.off('show_offers');
    this.eventBus.off('show_coupons');
    this.eventBus.off('open_closing_dialog');
    this.eventBus.off('submit_closing_pos');
  },
  // In the created() or mounted() lifecycle hook
  created() {
    // Clean up expired customer balance cache on POS load
    clearExpiredCustomerBalances();
  },
};
</script>

<style scoped>
.dynamic-container {
  /* add space for the navbar with better spacing */
  padding-top: calc(25px + var(--dynamic-lg));
  /* Navbar height (25px) + larger spacing */
  transition: all 0.3s ease;
}

.dynamic-main-row {
  padding: 0;
  margin: 0;
}

.dynamic-col {
  padding: var(--dynamic-sm);
  transition: padding 0.3s ease;
  margin-top: var(--dynamic-sm);
  /* Add top margin for better separation */
}

@media (max-width: 768px) {
  .dynamic-container {
    padding-top: calc(56px + var(--dynamic-md));
    /* Consistent navbar height + medium spacing */
  }

  .dynamic-col {
    padding: var(--dynamic-xs);
    margin-top: var(--dynamic-xs);
  }
}
</style>
