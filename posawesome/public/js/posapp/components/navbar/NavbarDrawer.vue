<template>
  <v-navigation-drawer 
    v-model="drawerOpen" 
    :mini-variant="mini" 
    expand-on-hover 
    width="220" 
    class="drawer-custom"
    @mouseleave="handleMouseLeave"
    temporary
    location="left"
    :scrim="true"
  >
    <div v-if="!mini" class="drawer-header">
      <v-avatar size="40">
        <v-img :src="companyImg" alt="Company logo" />
      </v-avatar>
      <span class="drawer-company">{{ company }}</span>
    </div>
    <div v-else class="drawer-header-mini">
      <v-avatar size="40">
        <v-img :src="companyImg" alt="Company logo" />
      </v-avatar>
    </div>

    <v-divider />

    <v-list dense nav>
      <v-list-item-group v-model="activeItem" active-class="active-item">
        <v-list-item 
          v-for="(item, index) in items" 
          :key="item.text" 
          @click="changePage(item.text)" 
          class="drawer-item"
        >
          <template v-slot:prepend>
            <v-icon class="drawer-icon">{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title class="drawer-item-title">{{ item.text }}</v-list-item-title>
        </v-list-item>
      </v-list-item-group>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
export default {
  name: 'NavbarDrawer',
  props: {
    drawer: Boolean,
    company: String,
    companyImg: String,
    items: Array,
    item: Number,
    isDark: Boolean
  },
  data() {
    return {
      mini: false,
      drawerOpen: this.drawer,
      activeItem: this.item
    };
  },
  watch: {
    drawer(val) {
      console.log('Drawer prop changed to:', val);
      this.drawerOpen = val;
      if (val) {
        this.mini = false;
      }
    },
    drawerOpen(val) {
      console.log('DrawerOpen changed to:', val);
      this.$emit('update:drawer', val);
    },
    item(val) {
      this.activeItem = val;
    },
    activeItem(val) {
      this.$emit('update:item', val);
    }
  },
  mounted() {
    console.log('NavbarDrawer mounted with:');
    console.log('- Drawer:', this.drawer);
    console.log('- Company:', this.company);
    console.log('- Items:', this.items);
    console.log('- Company Image:', this.companyImg);
  },
  methods: {
    handleMouseLeave() {
      if (!this.drawerOpen) return;
      clearTimeout(this._closeTimeout);
      this._closeTimeout = setTimeout(() => {
        this.drawerOpen = false;
        this.mini = true;
      }, 250);
    },
    changePage(key) {
      console.log('Changing page to:', key);
      this.$emit('change-page', key);
      // Close drawer after selection
      if (window.innerWidth < 1024) {
        this.closeDrawer();
      }
    },
    closeDrawer() {
      this.drawerOpen = false;
      this.mini = true;
    }
  }
};
</script>

<style scoped>
/* Custom styling for the navigation drawer */
.drawer-custom {
  background-color: var(--surface-secondary, #ffffff);
  transition: var(--transition-normal, all 0.3s ease);
  z-index: 1005 !important; /* Higher than navbar but lower than dialogs */
}

/* Styling for the header section of the expanded navigation drawer */
.drawer-header {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* Styling for the header section of the mini navigation drawer */
.drawer-header-mini {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 64px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* Styling for the company name text within the drawer header */
.drawer-company {
  margin-left: 12px;
  flex: 1;
  font-weight: 500;
  font-size: 1rem;
  color: var(--text-primary, #333);
  font-family: 'Roboto', sans-serif;
}

/* Styling for icons within the navigation drawer list items */
.drawer-icon {
  font-size: 24px;
  color: var(--primary-start, #1976d2);
}

/* Styling for the title text of navigation drawer list items */
.drawer-item-title {
  margin-left: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  color: #000000 !important;
  font-family: 'Roboto', sans-serif;
}

/* Hover effect for all list items in the navigation drawer */
.v-list-item:hover {
  background-color: rgba(25, 118, 210, 0.08) !important;
}

/* Styling for the actively selected list item in the navigation drawer */
.active-item {
  background-color: rgba(25, 118, 210, 0.12) !important;
  border-right: 3px solid #1976d2;
}

/* Dark Theme Adjustments */
:deep(.dark-theme) .drawer-custom,
:deep(.v-theme--dark) .drawer-custom {
  background-color: var(--surface-primary, #1e1e1e) !important;
  color: var(--text-primary, #ffffff) !important;
}

:deep(.dark-theme) .drawer-header,
:deep(.dark-theme) .drawer-header-mini,
:deep(.v-theme--dark) .drawer-header,
:deep(.v-theme--dark) .drawer-header-mini {
  background: linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

:deep(.dark-theme) .drawer-item-title,
:deep(.v-theme--dark) .drawer-item-title {
  color: #000000 !important;
  font-weight: 500;
  font-size: 0.95rem;
  font-family: 'Roboto', sans-serif;
}

:deep(.dark-theme) .drawer-company,
:deep(.v-theme--dark) .drawer-company {
  color: var(--text-primary, #ffffff) !important;
  font-weight: 500;
  font-size: 1rem;
  font-family: 'Roboto', sans-serif;
}

:deep(.dark-theme) .drawer-icon,
:deep(.v-theme--dark) .drawer-icon {
  color: var(--primary-light, #90caf9) !important;
  font-size: 24px;
}

:deep(.dark-theme) .v-list-item:hover,
:deep(.v-theme--dark) .v-list-item:hover {
  background-color: rgba(144, 202, 249, 0.08) !important;
}

:deep(.dark-theme) .active-item,
:deep(.v-theme--dark) .active-item {
  background-color: rgba(144, 202, 249, 0.12) !important;
  border-right: 3px solid #90caf9;
}

:deep(.dark-theme) .v-divider,
:deep(.v-theme--dark) .v-divider {
  border-color: rgba(255, 255, 255, 0.12) !important;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .drawer-custom {
    width: 280px !important;
  }
  
  :deep(.dark-theme) .drawer-custom,
  :deep(.v-theme--dark) .drawer-custom {
    background-color: var(--surface-primary, #1e1e1e) !important;
  }
}
</style>