export const responsiveMixin = {
  data() {
    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      baseWidth: window.innerWidth, // Automatically set to current width
      baseHeight: window.innerHeight, // Automatically set to current height
    }
  },
  
  computed: {
    // Dynamic scaling factors
    widthScale() {
      return this.windowWidth / this.baseWidth;
    },
    heightScale() {
      return this.windowHeight / this.baseHeight;
    },
    averageScale() {
      return (this.widthScale + this.heightScale) / 2;
    },
    
    // Dynamic spacing values
    dynamicSpacing() {
      const baseSpacing = {
        xs: 4,   // 4px base
        sm: 8,   // 8px base
        md: 16,  // 16px base
        lg: 24,  // 24px base
        xl: 32   // 32px base
      };
      
      return {
        xs: Math.max(2, Math.round(baseSpacing.xs * this.averageScale)),
        sm: Math.max(4, Math.round(baseSpacing.sm * this.averageScale)),
        md: Math.max(8, Math.round(baseSpacing.md * this.averageScale)),
        lg: Math.max(12, Math.round(baseSpacing.lg * this.averageScale)),
        xl: Math.max(16, Math.round(baseSpacing.xl * this.averageScale))
      };
    },
    
    // Dynamic CSS variables
    responsiveStyles() {
      // Calculate responsive card height based on screen size and available space
      let cardHeightVh;
      
      if (this.windowWidth <= 480) {
        // Mobile: smaller height to accommodate touch interface
        cardHeightVh = Math.round(45 * this.heightScale);
      } else if (this.windowWidth <= 768) {
        // Tablet: medium height
        cardHeightVh = Math.round(55 * this.heightScale);
      } else {
        // Desktop: full height
        cardHeightVh = Math.round(60 * this.heightScale);
      }
      
      // Ensure minimum and maximum bounds
      cardHeightVh = Math.max(30, Math.min(cardHeightVh, 70));
      
      return {
        '--dynamic-xs': `${this.dynamicSpacing.xs}px`,
        '--dynamic-sm': `${this.dynamicSpacing.sm}px`,
        '--dynamic-md': `${this.dynamicSpacing.md}px`,
        '--dynamic-lg': `${this.dynamicSpacing.lg}px`,
        '--dynamic-xl': `${this.dynamicSpacing.xl}px`,
        '--container-height': `${Math.round(68 * this.heightScale)}vh`,
        '--card-height': `${cardHeightVh}vh`,
        '--font-scale': this.averageScale.toFixed(2)
      };
    }
  },
  
  mounted() {
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  },
  
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },
  
  methods: {
    handleResize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
    }
  }
};