// Copyright (c) 20201 Youssef Restom and contributors
// For license information, please see license.txt

frappe.ui.form.on('POS Profile', {
    setup: function (frm) {
        frm.set_query("posa_cash_mode_of_payment", function (doc) {
            return {
                filters: { 'type': 'Cash' }
            };
        });

        frappe.call({
            method: "posawesome.posawesome.api.utilities.get_language_options",
            callback: function(r) {
                if (!r.exc) {
                    frm.fields_dict["posa_language"].df.options = r.message;
                    frm.refresh_field("posa_language");
                }
            }
        });
    },
});