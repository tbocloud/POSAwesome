export default {
    data() {
        return {
            float_precision: 2,
            currency_precision: 2
        };
    },
    methods: {
        flt(value, precision, number_format, rounding_method) {
            if (!precision && precision != 0) {
                precision = this.currency_precision || 2;
            }
            if (!rounding_method) {
                rounding_method = "Banker's Rounding (legacy)";
            }
            return flt(value, precision, number_format, rounding_method);
        },
        formatCurrency(value, precision) {
            if (value === null || value === undefined) {
                value = 0;
            }
            let number = Number(String(value).replace(/,/g, ""));
            if (isNaN(number)) number = 0;
            const prec = precision != null ? precision : this.currency_precision || 2;
            return number.toLocaleString('en-US', {
                minimumFractionDigits: prec,
                maximumFractionDigits: prec
            });
        },
        formatFloat(value, precision) {
            if (value === null || value === undefined) {
                value = 0;
            }
            let number = Number(String(value).replace(/,/g, ""));
            if (isNaN(number)) number = 0;
            const prec = precision != null ? precision : this.float_precision || 2;
            return number.toLocaleString('en-US', {
                minimumFractionDigits: prec,
                maximumFractionDigits: prec
            });
        },
        setFormatedCurrency(el, field_name, precision, no_negative = false, $event) {
            let input_val = $event && $event.target ? $event.target.value : $event;
            if (typeof input_val === 'string') {
                input_val = input_val.replace(/,/g, '');
            }
            let value = parseFloat(input_val);
            if (isNaN(value)) {
                value = 0;
            } else if (no_negative && value < 0) {
                value = Math.abs(value);
            }
            if (typeof el === "object") {
                el[field_name] = value;
            } else {
                this[field_name] = value;
            }
            return this.formatCurrency(value, precision);
        },
        setFormatedFloat(el, field_name, precision, no_negative = false, $event) {
            let input_val = $event && $event.target ? $event.target.value : $event;
            if (typeof input_val === 'string') {
                input_val = input_val.replace(/,/g, '');
            }
            let value = parseFloat(input_val);
            if (isNaN(value)) {
                value = 0;
            } else if (no_negative && value < 0) {
                value = Math.abs(value);
            }
            if (typeof el === "object") {
                el[field_name] = value;
            } else {
                this[field_name] = value;
            }
            return this.formatFloat(value, precision);
        },
        currencySymbol(currency) {
            return get_currency_symbol(currency);
        },
        isNumber(value) {
            const pattern = /^-?(\d+|\d{1,3}(\.\d{3})*)(,\d+)?$/;
            return pattern.test(value) || "invalid number";

        }
    },
    mounted() {
        this.float_precision =
            frappe.defaults.get_default('float_precision') || 2;
        this.currency_precision =
            frappe.defaults.get_default('currency_precision') || 2;

        const updatePrecision = (data) => {
            const profile = data.pos_profile || data;
            const prec = parseInt(profile.posa_decimal_precision);
            if (!isNaN(prec)) {
                this.float_precision = prec;
                this.currency_precision = prec;
            }
        };

        if (this.eventBus && this.eventBus.on) {
            this.eventBus.on('register_pos_profile', updatePrecision);
            this.eventBus.on('payments_register_pos_profile', updatePrecision);
        }
    }
};
