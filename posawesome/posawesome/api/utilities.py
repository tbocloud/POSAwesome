# -*- coding: utf-8 -*-
# Copyright (c) 2020, Youssef Restom and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import json
import frappe
from frappe.utils import cstr
from typing import List, Dict


def get_version():
	branch_name = get_app_branch("erpnext")
	if "12" in branch_name:
		return 12
	elif "13" in branch_name:
		return 13
	else:
		return 13


def get_app_branch(app):
	"""Returns branch of an app"""
	import subprocess

	try:
		branch = subprocess.check_output(
			"cd ../apps/{0} && git rev-parse --abbrev-ref HEAD".format(app), shell=True
		)
		branch = branch.decode("utf-8")
		branch = branch.strip()
		return branch
	except Exception:
		return ""


def get_root_of(doctype):
	"""Get root element of a DocType with a tree structure"""
	result = frappe.db.sql(
		"""select t1.name from `tab{0}` t1 where
		(select count(*) from `tab{1}` t2 where
			t2.lft < t1.lft and t2.rgt > t1.rgt) = 0
		and t1.rgt > t1.lft""".format(doctype, doctype)
	)
	return result[0][0] if result else None


def get_child_nodes(group_type, root):
	lft, rgt = frappe.db.get_value(group_type, root, ["lft", "rgt"])
	return frappe.get_all(
		group_type,
		filters={"lft": [">=", lft], "rgt": ["<=", rgt]},
		fields=["name", "lft", "rgt"],
		order_by="lft",
	)


def get_item_group_condition(pos_profile):
	cond = " and 1=1"
	item_groups = get_item_groups(pos_profile)
	if item_groups:
		cond = " and item_group in (%s)" % (", ".join(["%s"] * len(item_groups)))

	return cond % tuple(item_groups)


def add_taxes_from_tax_template(item, parent_doc):
	accounts_settings = frappe.get_cached_doc("Accounts Settings")
	add_taxes_from_item_tax_template = accounts_settings.add_taxes_from_item_tax_template
	if item.get("item_tax_template") and add_taxes_from_item_tax_template:
		item_tax_template = item.get("item_tax_template")
		taxes_template_details = frappe.get_all(
			"Item Tax Template Detail",
			filters={"parent": item_tax_template},
			fields=["tax_type"],
		)

		for tax_detail in taxes_template_details:
			tax_type = tax_detail.get("tax_type")

			found = any(tax.account_head == tax_type for tax in parent_doc.taxes)
			if not found:
				tax_row = parent_doc.append("taxes", {})
				tax_row.update(
					{
						"description": str(tax_type).split(" - ")[0],
						"charge_type": "On Net Total",
						"account_head": tax_type,
					}
				)

				if parent_doc.doctype == "Purchase Order":
					tax_row.update({"category": "Total", "add_deduct_tax": "Add"})
				tax_row.db_insert()


def set_batch_nos_for_bundels(doc, warehouse_field, throw=False):
	"""Automatically select `batch_no` for outgoing items in item table"""
	for d in doc.packed_items:
		qty = d.get("stock_qty") or d.get("transfer_qty") or d.get("qty") or 0
		has_batch_no = frappe.db.get_value("Item", d.item_code, "has_batch_no")
		warehouse = d.get(warehouse_field, None)
		if has_batch_no and warehouse and qty > 0:
			if not d.batch_no:
				d.batch_no = get_batch_no(d.item_code, warehouse, qty, throw, d.serial_no)
			else:
				batch_qty = get_batch_qty(batch_no=d.batch_no, warehouse=warehouse)
				if flt(batch_qty, d.precision("qty")) < flt(qty, d.precision("qty")):
					frappe.throw(
						_(
							"Row #{0}: The batch {1} has only {2} qty. Please select another batch which has {3} qty available or split the row into multiple rows, to deliver/issue from multiple batches"
						).format(d.idx, d.batch_no, batch_qty, qty)
					)


def get_company_domain(company):
	return frappe.get_cached_value("Company", cstr(company), "domain")


@frappe.whitelist()
def get_selling_price_lists():
	"""Return all selling price lists"""
	return frappe.get_all(
		"Price List",
		filters={"selling": 1},
		fields=["name"],
		order_by="name",
	)


@frappe.whitelist()
def get_app_info() -> Dict[str, List[Dict[str, str]]]:
	"""
	Return a list of installed apps and their versions.
	"""
	# Get installed apps using Frappe's built-in function
	installed_apps = frappe.get_installed_apps()

	# Get app versions
	apps_info = []
	for app_name in installed_apps:
		try:
			# Get app version from hooks or __init__.py
			app_version = frappe.get_attr(f"{app_name}.__version__") or "Unknown"
		except (AttributeError, ImportError):
			app_version = "Unknown"

		apps_info.append({"app_name": app_name, "installed_version": app_version})

	return {"apps": apps_info}


def ensure_child_doctype(doc, table_field, child_doctype):
	"""Ensure child rows have the correct doctype set."""
	for row in doc.get(table_field, []):
		if not row.get("doctype"):
			row.doctype = child_doctype


@frappe.whitelist()
def get_sales_person_names():
	import json

	print("Fetching sales persons...")
	try:
		sales_persons = frappe.get_list(
			"Sales Person",
			filters={"enabled": 1},
			fields=["name", "sales_person_name"],
			limit_page_length=100000,
		)
		print(f"Found {len(sales_persons)} sales persons: {json.dumps(sales_persons)}")
		return sales_persons
	except Exception as e:
		print(f"Error fetching sales persons: {str(e)}")
		frappe.log_error(f"Error fetching sales persons: {str(e)}", "POS Sales Person Error")
		return []


@frappe.whitelist()
def get_language_options():
    """Return newline separated language codes from translations directories of all apps.

    Always include English (``en``) in the list so that users can explicitly
    select it in the POS profile.
    """
    import os

    languages = {"en"}

    def normalize(code: str) -> str:
        """Return language code normalized for comparison."""
        return code.strip().lower().replace("_", "-")

    # Collect languages from translation CSV files
    for app in frappe.get_installed_apps():
        translations_path = frappe.get_app_path(app, "translations")
        if os.path.exists(translations_path):
            for filename in os.listdir(translations_path):
                if filename.endswith(".csv"):
                    languages.add(normalize(os.path.splitext(filename)[0]))

    # Also include languages from the Translation doctype, if available
    if frappe.db.table_exists("Translation"):
        rows = frappe.db.sql("SELECT DISTINCT language FROM `tabTranslation` WHERE language IS NOT NULL")
        for (language,) in rows:
            languages.add(normalize(language))

    # Normalize to lowercase and deduplicate, then sort for consistent order
    return "\n".join(sorted(languages))


@frappe.whitelist()
def get_translation_dict(lang: str) -> dict:
	"""Return translations for the given language from all installed apps."""
	from frappe.translate import get_translations_from_csv

	if lang == "en":
		# English is the base language and does not have a separate
		# translation file. Return an empty dict to avoid file lookups.
		return {}

	translations = {}

	for app in frappe.get_installed_apps():
		try:
			messages = get_translations_from_csv(lang, app) or {}
			translations.update(messages)
		except Exception:
			pass

	# Include translations stored in the Translation doctype, if present
	if frappe.db.table_exists("Translation"):
		rows = frappe.db.sql(
			"""
	        SELECT source_text, translated_text
	        FROM `tabTranslation`
	        WHERE language = %s
	    """,
			(lang,),
		)
		for source, target in rows:
			translations[source] = target

	return translations
