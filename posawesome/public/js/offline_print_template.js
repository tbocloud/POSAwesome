export default function generateOfflineInvoiceHTML(invoice) {
  if (!invoice) return '';

  const itemsRows = (invoice.items || [])
    .map(it => {
      const sn = it.serial_no ? `<br><b>SR.No:</b><br>${it.serial_no.replace(/\n/g, ', ')}` : '';
      return `<tr>
        <td>${it.item_code}${it.item_name && it.item_name !== it.item_code ? `<br>${it.item_name}` : ''}${sn}</td>
        <td style="text-align:right">${it.qty} ${it.uom || ''}<br>@ ${it.rate}</td>
        <td style="text-align:right">${it.amount}</td>
      </tr>`;
    })
    .join('');

  const taxesRows = (invoice.taxes || [])
    .map(row => `<tr>
      <td class="text-right" style="width:70%">${row.description}@${row.rate}%</td>
      <td class="text-right">${row.tax_amount}</td>
    </tr>`)
    .join('');

  const discountRow = invoice.discount_amount ? `<tr>
      <td class="text-right" style="width:75%">Discount</td>
      <td class="text-right">${invoice.discount_amount}</td>
    </tr>` : '';

  const changeRow = invoice.change_amount ? `<tr>
      <td class="text-right" style="width:75%">Change Amount</td>
      <td class="text-right">${invoice.change_amount}</td>
    </tr>` : '';

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Invoice ${invoice.name || ''}</title>
    <style>
      table, tr, td, div, p { line-height:120%; vertical-align:middle; font-size:10px; }
      .print-format { width:3.5in; padding:0.1in; min-height:7in; }
      .text-right { text-align:right; }
    </style>
  </head>
  <body class="print-format">
    <div style="text-align:center; margin-bottom:0"><h5 style="margin:0; font-size:11px;">${invoice.is_duplicate ? 'Duplicate' : 'Original'}</h5></div>
    <p style="margin-top:0">
      <b>Invoice Status:</b> ${invoice.status || ''}<br>
      <b>Receipt No:</b> ${invoice.name || ''}<br>
      <b>Customer:</b> ${invoice.customer_name || invoice.customer || ''}<br>
      <b>Mobile:</b> ${invoice.contact_mobile || ''}<br>
      <b>Date:</b> ${invoice.posting_date || ''}
      <b>Time:</b> ${invoice.posting_time || ''}<br>
    </p>
    <p style="margin-top:3px;"><b>Additional Note:</b> <strong>${invoice.posa_notes || ''}</strong></p>
    <table cellpadding="0" cellspacing="0" style="width:100%">
      <thead>
        <tr><th width="50%"><b>Item</b></th><th width="25%" class="text-right"><b>Qty</b></th><th width="25%" class="text-right"><b>Amount</b></th></tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%">
      <tbody>
        <tr><td class="text-right" style="width:70%"><b>Total</b></td><td class="text-right">${invoice.total}</td></tr>
        ${taxesRows}
        ${discountRow}
        <tr><td class="text-right" style="width:70%"><b>Grand Total</b></td><td class="text-right">${invoice.grand_total}</td></tr>
        <tr><td class="text-right" style="width:75%"><b>Paid Amount</b></td><td class="text-right">${invoice.paid_amount}</td></tr>
        ${changeRow}
      </tbody>
    </table>
    <p class="text-center" style="margin-top:3px;">Thank you, please visit again.</p>
  </body>
  </html>`;
  return html;
}
