# -*- coding: utf-8 -*-
"""Expose API functions for POS Awesome."""

from .items import (
    get_items,
    get_items_groups,
    get_items_details,
    get_item_detail,
    get_items_from_barcode,
    get_item_attributes,
)

from .customers import (
    get_customer_names,
    get_customer_info,
    create_customer,
    set_customer_info,
    get_customer_addresses,
    make_address,
    get_sales_person_names,
)

from .invoices import (
    update_invoice,
    submit_invoice,
    delete_invoice,
    get_draft_invoices,
    search_invoices_for_return,
    validate_return_items,
)

from .shifts import (
    get_opening_dialog_data,
    create_opening_voucher,
    check_opening_shift,
)

from .payments import (
    create_payment_request,
    get_available_credit,
)

from .sales_orders import search_orders

from .offers import (
    get_pos_coupon,
    get_active_gift_coupons,
    get_offers,
    get_applicable_delivery_charges,
)

from .utilities import (
    get_version,
    get_app_branch,
    get_selling_price_lists,
    get_app_info,
    get_language_options,
    get_translation_dict,
)

