import { useDark, useToggle } from '@vueuse/core'

export default {
    install(app, { vuetify }) {
        const isDark = useDark({
            selector: 'html',
            attribute: 'class',
            valueDark: 'dark-theme',
            valueLight: '',
            storageKey: 'posawesome-theme',
            onChanged: (dark) => {
                // Update Vuetify theme when dark mode changes
                vuetify.theme.global.name.value = dark ? 'dark' : 'light';
            },
        });
        
        const toggleDark = useToggle(isDark);
        
        // Initialize theme based on stored preference
        const current = isDark.value ? 'dark' : 'light';
        vuetify.theme.global.name.value = current;
        
        app.config.globalProperties.$theme = {
            get current() {
                return vuetify.theme.global.name.value;
            },
            toggle: () => toggleDark(),
            isDark,
        };
    }
};
