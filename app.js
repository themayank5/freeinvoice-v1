const KEY = 'gst_invoice_v1';
const CUSTOMER_KEY = `${KEY}_customers`;
const RESET_KEY = `${KEY}_reset`;
const SETUP_KEY = `${KEY}_setup_complete`;
const SETUP_STARTED_KEY = `${KEY}_setup_started`;
const WELCOME_KEY = `${KEY}_welcome_seen`;
const STATES = [['01', 'Jammu & Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'], ['05', 'Uttarakhand'], ['06', 'Haryana'], ['07', 'Delhi'], ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'], ['10', 'Bihar'], ['11', 'Sikkim'], ['12', 'Arunachal Pradesh'], ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'], ['16', 'Tripura'], ['17', 'Meghalaya'], ['18', 'Assam'], ['19', 'West Bengal'], ['20', 'Jharkhand'], ['21', 'Odisha'], ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'], ['24', 'Gujarat'], ['26', 'Dadra & Nagar Haveli and Daman & Diu'], ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'], ['31', 'Lakshadweep'], ['32', 'Kerala'], ['33', 'Tamil Nadu'], ['34', 'Puducherry'], ['35', 'Andaman & Nicobar'], ['36', 'Telangana'], ['37', 'Andhra Pradesh'], ['38', 'Ladakh']];
const LABELS = ['ORIGINAL FOR RECIPIENT', 'DUPLICATE FOR TRANSPORTER', 'TRIPLICATE FOR SUPPLIER'];
const QUANTITY_UNITS = ['Nos', 'Kg', 'Gm', 'Litre', 'Metre', 'Sq. metre', 'Box', 'Packet', 'Set', 'Pair', 'Dozen'];
const REQUIRED_TERM = 'Goods once sold cannot be taken back or exchanged.';
const GST_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/* ---------- demo customer directory ---------- */
const DEMO_CUSTOMERS = [
 { name: 'Ananya Iyer', gstin: '33AABCA7890T1Z2', phone: '9678901234', email: 'ananya.iyer@example.com', billing: '15, Anna Salai Chennai, TAMIL NADU, 600002', shipSame: true, shipping: '' },
  { name: 'Karan Kapoor', gstin: '03AAACK2345R1Z6', phone: '9567890123', email: 'karan.kapoor@example.com', billing: '56, MG Road Amritsar, PUNJAB, 143001', shipSame: true, shipping: '' },
  { name: 'Meera Nair', gstin: '32AABCM6789L1Z0', phone: '9456789012', email: 'meera.nair@example.com', billing: '78, Marine Drive Kochi, KERALA, 682011', shipSame: true, shipping: '' },
  { name: 'Rohan Das', gstin: '19AABCR3456P1Z4', phone: '9345678901', email: 'rohan.das@example.com', billing: '34, Park Street Kolkata, WEST BENGAL, 700016', shipSame: true, shipping: '' },
  { name: 'Deepika Joshi', gstin: '29AABCD8901N1Z7', phone: '9234567890', email: 'deepika.joshi@example.com', billing: '22, MG Road Bangalore, KARNATAKA, 560001', shipSame: true, shipping: '' }
];

/* ---------- demo item catalog ---------- */
const DEMO_ITEMS = [
  { name: 'Air Filter Element', hsn: '84212300', rate: 600 },
  
];

const EMPTY_STATE = {
  seller: { name: '', gstin: '', addr: '', mobile: '', email: '', state: '', logo: null },
  meta: { no: '', date: '', due: '', pos: '' },
  customer: { name: '', gstin: '', phone: '', email: '', billing: '', shipSame: true, shipping: '', shippingPhone: '', shippingEmail: '' },
  items: [{ name: '', hsn: '', rate: '', qty: '', unit: 'Nos', unitExplicit: false, gst: '', disc: '' }],
  bank: { bank: '', acc: '', ifsc: '', branch: '', upi: '', qrAmt: false },
  sign: { sig: null, companyName: '' },
  terms: { list: [REQUIRED_TERM] },
  priceMode: 'excl', round: false, copies: 1
};
const DEMO_DATA = {
  ...structuredClone(EMPTY_STATE),
  seller: {
    ...EMPTY_STATE.seller,
    name: 'ABC Traders (Demo)',
    gstin: '27AAAAA0000A1Z5',
    addr: '123 Market Road new delhi, Delhi, 110092',
    mobile: '9876543210',
    email: 'seller@example.com',
    state: '27',
    logo: 'img/company%20logo.png'
  },
  meta: {
    no: 'INV-001',
    date: new Date().toISOString().slice(0, 10),
    due: '',
    pos: '07'
  },
  customer: {
    name: 'Sample Customer',
    gstin: '',
    phone: '9876543210',
    email: 'customer@example.com',
    billing: '456 Example Street new delhi, Delhi, 110092',
    shipSame: true,
    shipping: '',
    shippingPhone: '',
    shippingEmail: ''
  },
  bank: {
    bank: 'Demo Bank',
    acc: '0000000000',
    ifsc: 'DEMO0000001',
    branch: 'Pune',
    upi: 'demo@example',
    qrAmt: false
  },
  sign: {
    sig: 'img/signature.png',
    companyName: 'ABC Traders (Demo)'
  },
  terms: {
    list: [
      REQUIRED_TERM,
      'This is a demo invoice. Replace these terms with your own.',
    ]
  }
};

let hasSavedInvoice = false;
let S = load();
let printing = false;
let openCustomQuantityRow = -1;
let importedCustomers = loadImportedCustomers();
let customerCsvHandle = null;

function load() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (!isBlankInvoice(data)) {
        hasSavedInvoice = true;
        return normalizeTerms(data);
      }
    }
  } catch (e) {
    console.warn('Could not load saved invoice; showing demo data instead.', e);
  }
  return structuredClone(DEMO_DATA);
}
function normalizeTerms(data) {
  const savedTerms = Array.isArray(data.terms?.list)
    ? data.terms.list
    : (typeof data.terms?.text === 'string' ? data.terms.text.split(/\r?\n/).map(term => term.trim()).filter(Boolean) : []);
  const additionalTerms = savedTerms
    .map(term => String(term ?? '').trim())
    .filter(term => term && term !== REQUIRED_TERM)
    .slice(0, 4);
  return {
    ...data,
    terms: {
      ...data.terms,
      list: [REQUIRED_TERM, ...additionalTerms]
    }
  };
}
function isBlankInvoice(data) {
  const fields = [
    data.seller?.name, data.seller?.gstin, data.seller?.addr, data.seller?.mobile, data.seller?.email, data.seller?.state,
    data.meta?.no, data.meta?.date, data.meta?.due, data.meta?.pos,
    data.customer?.name, data.customer?.gstin, data.customer?.phone, data.customer?.email, data.customer?.billing,
    data.customer?.shipping, data.customer?.shippingPhone, data.customer?.shippingEmail,
    data.bank?.bank, data.bank?.acc, data.bank?.ifsc, data.bank?.branch, data.bank?.upi,
    data.sign?.companyName,
    Array.isArray(data.terms?.list) ? data.terms.list.join(' ') : data.terms?.text
  ];
  return fields.every(value => !String(value ?? '').trim())
    && !data.seller?.logo
    && !data.sign?.sig
    && (data.items || []).every(item => !String(item.name ?? '').trim() && !String(item.hsn ?? '').trim()
      && !Number(item.rate) && !Number(item.qty) && !Number(item.disc));
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
    localStorage.removeItem(RESET_KEY);
    return true;
  } catch (e) {
    console.warn('Could not save (storage full?)', e);
    return false;
  }
}

  function loadImportedCustomers() {
    try {
      const saved = localStorage.getItem(CUSTOMER_KEY);
      if (!saved) return [];
      const customers = JSON.parse(saved);
      if (!Array.isArray(customers)) throw new Error('Saved customer list is not an array.');
      return customers.filter(customer => customer && typeof customer.name === 'string' && customer.name.trim())
        .map(customer => ({
          name: String(customer.name || ''),
          gstin: String(customer.gstin || ''),
          phone: String(customer.phone || ''),
          email: String(customer.email || ''),
          billing: String(customer.billing || ''),
          shipSame: true,
          shipping: '',
          shippingPhone: '',
          shippingEmail: ''
        }));
    } catch (error) {
      console.warn('Could not load saved customers.', error);
      return [];
    }
  }

  function saveImportedCustomers(customers) {
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customers));
      return true;
    } catch (error) {
      console.error('Could not save imported customers.', error);
      return false;
    }
  }

  function customerOptions() {
    return [...DEMO_CUSTOMERS, ...importedCustomers];
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let quoteClosed = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"' && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
          quoteClosed = true;
        } else {
          field += char;
        }
        continue;
      }
      if (char === '"' && !field.trim() && !quoteClosed) {
        field = '';
        inQuotes = true;
      } else if (char === ',' || char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        row.push(field.trim());
        field = '';
        quoteClosed = false;
        if (char !== ',') {
          if (row.some(value => value)) rows.push(row);
          row = [];
        }
      } else if (quoteClosed && !/\s/.test(char)) {
        throw new Error('Unexpected character after a quoted CSV value.');
      } else {
        field += char;
      }
    }

    if (inQuotes) throw new Error('The CSV file contains an unclosed quoted value.');
    row.push(field.trim());
    if (row.some(value => value)) rows.push(row);
    return rows;
  }

  function parseCustomerCsv(text) {
    const rows = parseCsv(text);
    if (!rows.length) throw new Error('The CSV file is empty.');

    const normalizeHeader = value => value.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const headers = rows[0].map(normalizeHeader);
    const findColumn = (...names) => headers.findIndex(header => names.includes(header));
    const columns = {
      name: findColumn('name', 'customername', 'businessname'),
      address: findColumn('address', 'billing', 'billingaddress'),
      phone: findColumn('phone', 'mobile', 'phonenumber', 'mobilenumber'),
      email: findColumn('email', 'emailid'),
      gstin: findColumn('gstin')
    };

    if (columns.name < 0) throw new Error('A "name" column is required.');
    if (columns.address < 0) throw new Error('An "address" or "billing address" column is required.');
    if (rows.length < 2) return { customers: [], invalidRows: 0 };

    const customers = [];
    let invalidRows = 0;
    rows.slice(1).forEach(values => {
      if (values.length > headers.length) {
        invalidRows++;
        return;
      }
      const value = key => columns[key] < 0 ? '' : String(values[columns[key]] || '').trim();
      const name = value('name');
      if (!name) {
        invalidRows++;
        return;
      }
      customers.push({
        name,
        gstin: value('gstin'),
        phone: value('phone'),
        email: value('email'),
        billing: value('address'),
        shipSame: true,
        shipping: '',
        shippingPhone: '',
        shippingEmail: ''
      });
    });
    if (!customers.length) throw new Error('No valid customer rows were found. Each row needs a customer name.');
    return { customers, invalidRows };
  }

  function customerDirectoryHTML() {
    const list = importedCustomers.length
      ? importedCustomers.map((customer, index) => `
        <tr>
          <td>${esc(customer.name)}</td>
          <td>${esc(customer.billing)}</td>
          <td>${esc(customer.phone)}</td>
          <td>${esc(customer.email)}</td>
          <td>${esc(customer.gstin)}</td>
          <td><button type="button" class="btn btn-sm btn-outline-danger" data-customer-remove="${index}" aria-label="Remove ${esc(customer.name)}">Remove</button></td>
        </tr>`).join('')
      : '<tr><td colspan="6" class="customer-directory-empty">No customers added or imported yet.</td></tr>';
    return `
      <div class="customer-import-controls">
        <div class="customer-import-heading">
          <div><strong>Customer CSV file</strong><div class="form-text">Connect the customers.csv file in the invoice app folder. Changes will update that same file.</div></div>
          <button class="btn btn-sm ${customerCsvHandle ? 'btn-success' : 'btn-primary'}" type="button" data-customer-connect>${customerCsvHandle ? 'CSV file connected' : 'Choose customers.csv'}</button>
        </div>
        <div class="customer-import-heading">
          <div><strong>Import customers from another CSV</strong><div class="form-text">Imported rows are added to the connected customers.csv. Required: name and address. Optional: phone, email, gstin. Duplicate customers are skipped.</div></div>
          <button class="btn btn-sm btn-outline-secondary" type="button" data-customer-template>Download CSV template</button>
        </div>
        <label class="visually-hidden" for="customerCsvFile">Choose a CSV file</label>
        <input class="form-control" type="file" id="customerCsvFile" accept=".csv,text/csv">
      </div>
      <div class="customer-import-status" id="customerImportStatus" role="status" aria-live="polite"></div>
      <form id="customerAddForm" class="customer-add-form">
        <div class="customer-directory-heading"><strong>Add a customer</strong></div>
        <div class="customer-add-grid">
          <label class="customer-field">Customer name<input class="form-control" name="name" required maxlength="200" autocomplete="organization"></label>
          <label class="customer-field">Address<input class="form-control" name="address" required maxlength="500" autocomplete="street-address"></label>
          <label class="customer-field">Phone<input class="form-control" name="phone" type="tel" maxlength="50" autocomplete="tel"></label>
          <label class="customer-field">Email<input class="form-control" name="email" type="email" maxlength="254" autocomplete="email"></label>
          <label class="customer-field">GSTIN<input class="form-control" name="gstin" maxlength="30"></label>
          <div class="customer-add-action"><button type="submit" class="btn btn-primary">Add Customer</button></div>
        </div>
      </form>
      <div class="customer-directory-heading"><strong>Customer list</strong><div class="customer-directory-tools"><span>${importedCustomers.length}</span></div></div>
      <div class="customer-directory-table-wrap">
        <table class="table table-sm table-striped align-middle customer-directory-table">
          <thead><tr><th>Name</th><th>Address</th><th>Phone</th><th>Email</th><th>GSTIN</th><th>Action</th></tr></thead>
          <tbody>${list}</tbody>
        </table>
      </div>`;
  }

  function customerDuplicateKey(customer) {
    const gstin = String(customer.gstin || '').trim().toLowerCase();
    return gstin
      ? `gstin:${gstin}`
      : `details:${[customer.name, customer.phone, customer.billing].map(value => String(value || '').trim().toLowerCase()).join('|')}`;
  }

  function customerCsvContent(customers) {
    const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return `\uFEFFname,address,phone,email,gstin\r\n${customers.map(customer => [
      customer.name, customer.billing, customer.phone, customer.email, customer.gstin
    ].map(escapeCsv).join(',')).join('\r\n')}\r\n`;
  }

  async function writeCustomerCsvFile(handle, customers) {
    const writable = await handle.createWritable();
    try {
      await writable.write(customerCsvContent(customers));
      await writable.close();
    } catch (error) {
      try {
        await writable.abort();
      } catch (abortError) {
        console.warn('Could not abort the failed CSV write.', abortError);
      }
      throw error;
    }
  }

  async function persistCustomerList(customers, requireFile = false) {
    if (requireFile && !customerCsvHandle) {
      throw new Error('Choose customers.csv in the invoice app folder before saving customer changes.');
    }
    const previousCustomers = importedCustomers;
    if (!saveImportedCustomers(customers)) {
      throw new Error('Could not save customer details in browser storage.');
    }
    importedCustomers = customers;
    try {
      if (customerCsvHandle) await writeCustomerCsvFile(customerCsvHandle, customers);
    } catch (error) {
      importedCustomers = previousCustomers;
      if (!saveImportedCustomers(previousCustomers)) {
        console.error('Could not restore the customer list after a CSV write failure.');
      }
      throw new Error(`Could not update customers.csv: ${error.message}`);
    }
  }

  async function connectCustomerCsv() {
    const status = $('#customerImportStatus');
    if (typeof window.showOpenFilePicker !== 'function') {
      status.className = 'customer-import-status error';
      status.textContent = 'Direct CSV updates are not supported in this browser. Use the latest Chrome or Edge to connect customers.csv.';
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Customer CSV file', accept: { 'text/csv': ['.csv'] } }]
      });
      if (handle.name.toLowerCase() !== 'customers.csv') {
        throw new Error('Select the customers.csv file inside the invoice app folder.');
      }
      let permission = await handle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') permission = await handle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') throw new Error('Write permission was not granted for customers.csv.');

      const file = await handle.getFile();
      const { customers: fileCustomers } = parseCustomerCsv(await file.text());
      const mergedCustomers = [...fileCustomers];
      const seen = new Set(mergedCustomers.map(customerDuplicateKey));
      importedCustomers.forEach(customer => {
        const key = customerDuplicateKey(customer);
        if (!seen.has(key)) {
          seen.add(key);
          mergedCustomers.push(customer);
        }
      });
      if (!saveImportedCustomers(mergedCustomers)) {
        throw new Error('Could not save customer details in browser storage.');
      }
      const previousCustomers = importedCustomers;
      const previousHandle = customerCsvHandle;
      customerCsvHandle = handle;
      importedCustomers = mergedCustomers;
      try {
        await writeCustomerCsvFile(handle, mergedCustomers);
      } catch (error) {
        customerCsvHandle = previousHandle;
        importedCustomers = previousCustomers;
        if (!saveImportedCustomers(previousCustomers)) {
          console.error('Could not restore the customer list after a CSV connection failure.');
        }
        throw error;
      }
      render();
      openEditor('customerDirectory');
      const result = $('#customerImportStatus');
      result.classList.add('success');
      result.textContent = 'customers.csv is connected. Customer changes will update this file directly.';
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Could not connect customers.csv.', error);
      status.className = 'customer-import-status error';
      status.textContent = error.message || 'Could not connect customers.csv.';
    }
  }

  function downloadCustomerCsv(customers, filename = 'customers-template.csv') {
    const blob = new Blob([customerCsvContent(customers)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function addCustomerFromForm(form) {
    const formData = new FormData(form);
    const customer = {
      name: String(formData.get('name') || '').trim(),
      billing: String(formData.get('address') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      gstin: String(formData.get('gstin') || '').trim(),
      shipSame: true,
      shipping: '',
      shippingPhone: '',
      shippingEmail: ''
    };
    const status = $('#customerImportStatus');
    status.className = 'customer-import-status';
    status.textContent = '';
    if (!customerCsvHandle) {
      status.classList.add('error');
      status.textContent = 'Choose customers.csv in the invoice app folder before adding a customer.';
      return;
    }
    if (!customer.name || !customer.billing) {
      status.classList.add('error');
      status.textContent = 'Customer name and address are required.';
      return;
    }
    const duplicateKeys = new Set(customerOptions().map(customerDuplicateKey));
    if (duplicateKeys.has(customerDuplicateKey(customer))) {
      status.classList.add('error');
      status.textContent = 'This customer is already in the customer list.';
      return;
    }
    const updatedCustomers = [...importedCustomers, customer];
    try {
      await persistCustomerList(updatedCustomers, true);
    } catch (error) {
      console.error('Could not save the customer.', error);
      status.classList.add('error');
      status.textContent = error.message;
      return;
    }
    render();
    openEditor('customerDirectory');
    const result = $('#customerImportStatus');
    result.classList.add('success');
    result.textContent = 'Customer saved to customers.csv.';
  }

  async function importCustomerCsv(file) {
    const status = $('#customerImportStatus');
    if (!file) return;
    status.className = 'customer-import-status';
    status.textContent = '';
    try {
      if (!customerCsvHandle) {
        throw new Error('Choose customers.csv in the invoice app folder before importing customer records.');
      }
      if (!/\.csv$/i.test(file.name)) throw new Error('Choose a CSV file.');
      const { customers, invalidRows } = parseCustomerCsv(await file.text());
      const seen = new Set(importedCustomers.map(customerDuplicateKey));
      const additions = customers.filter(customer => {
        const key = customerDuplicateKey(customer);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!additions.length) {
        status.classList.add('error');
        status.textContent = `No new customers to add. ${invalidRows ? `${invalidRows} invalid row(s) skipped.` : 'All valid rows were already imported.'}`;
        return;
      }
      const updatedCustomers = [...importedCustomers, ...additions];
      await persistCustomerList(updatedCustomers, true);
      render();
      openEditor('customerDirectory');
      const result = $(`#edBody #customerImportStatus`);
      result.classList.add('success');
      result.textContent = `${additions.length} customer(s) imported and saved to customers.csv. ${customers.length - additions.length} duplicate(s) skipped.${invalidRows ? ` ${invalidRows} invalid row(s) skipped.` : ''}`;
    } catch (error) {
      console.error('Could not import customer CSV.', error);
      status.classList.add('error');
      status.textContent = error.message || 'Could not read the CSV file.';
    }
  }

  async function removeCustomer(index) {
    const status = $('#customerImportStatus');
    const updatedCustomers = importedCustomers.filter((_, customerIndex) => customerIndex !== index);
    try {
      await persistCustomerList(updatedCustomers, true);
      render();
      openEditor('customerDirectory');
    } catch (error) {
      console.error('Could not remove customer.', error);
      status.className = 'customer-import-status error';
      status.textContent = error.message;
    }
  }

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ml = s => esc(s).replace(/\s*\n\s*/g, ' ');
const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = n => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rs = n => '₹' + fmt(n);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dt = v => { const p = (v || '').split('-'); return p.length === 3 ? `${+p[2]} ${MON[+p[1] - 1]} ${p[0]}` : ''; };
const stName = c => { const x = STATES.find(a => a[0] === c); return x ? x[1] : c; };

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = n => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
const three = n => { const h = Math.floor(n / 100), r = n % 100; return (h ? ONES[h] + ' Hundred' + (r ? ' And ' : '') : '') + (r ? two(r) : ''); };
function words(n) {
  if (!n) return 'Zero';
  const p = [], cr = Math.floor(n / 1e7), la = Math.floor(n % 1e7 / 1e5), th = Math.floor(n % 1e5 / 1e3), rest = n % 1e3;
  if (cr) p.push(three(cr) + ' Crore');
  if (la) p.push(two(la) + ' Lakh');
  if (th) p.push(two(th) + ' Thousand');
  if (rest) p.push((p.length && rest < 100 ? 'And ' : '') + three(rest));
  return p.join(', ');
}
function totalWords(t) {
  const r = Math.floor(t), ps = Math.round((t - r) * 100);
  return 'INR ' + words(r) + ' Rupees' + (ps ? ' And ' + two(ps) + ' Paise' : '') + ' Only.';
}

/* ---------- GST calculation ---------- */
function calc() {
  const intra = Boolean(S.seller.state && S.meta.pos && S.seller.state === S.meta.pos);
  const rows = S.items.map(i => {
    const g = +i.gst || 0, q = +i.qty || 0, r = +i.rate || 0, d = +i.disc || 0, base = r * q - d;
    let tx, tax, amt;
    if (S.priceMode === 'incl') { amt = round2(base); tx = round2(base / (1 + g / 100)); tax = round2(amt - tx); }
    else { tx = round2(base); tax = round2(tx * g / 100); amt = round2(tx + tax); }
    const unit = S.priceMode === 'incl' ? r / (1 + g / 100) : r;
    const filled = Boolean(String(i.name || '').trim() || String(i.hsn || '').trim() || +i.rate || q || +i.disc);
    return { ...i, g, q, unit, tx, tax, amt, filled };
  });
  const groups = {};
  rows.forEach(r => {
    if (r.filled) (groups[r.g] ||= { tax: 0 }).tax = round2(groups[r.g].tax + r.tax);
  });
  const taxable = round2(rows.reduce((a, r) => a + r.tx, 0));
  const sum = round2(rows.reduce((a, r) => a + r.amt, 0));
  const total = S.round ? Math.round(sum) : sum;
  return { intra, rows, groups, taxable, sum, total, roundoff: round2(total - sum) };
}

/* ---------- invoice markup ---------- */
function sheetHTML(label) {
  const C = calc(), s = S.seller, m = S.meta, c = S.customer, b = S.bank;
  const customers = customerOptions();
  const hasItems = C.rows.some(r => r.filled);
  const hasCustomerDetails = ['name', 'gstin', 'phone', 'email', 'billing', 'shipping', 'shippingPhone', 'shippingEmail']
    .some(key => String(c[key] || '').trim());
  const signName = S.sign.companyName || s.name;
  const eb = k => `<button class="eb no-print btn btn-sm btn-dark e me-0" data-edit="${k}">Edit</button>`;
  const row = (l, v) => `<div>${l}</div><div>${v}</div>`;
  const dateRow = (l, v, key) => `<div>${l}</div><div class="inv-date-cell"><input type="date" class="inv-date-input no-print" value="${v || ''}" data-meta="${key}"><span class="inv-date-text">${dt(v)}</span></div>`;
  const taxLabel = C.intra ? 'CGST+SGST' : 'IGST';

  let taxRows = '';
  let printTaxRows = '';
  Object.keys(C.groups).sort((a, b) => a - b).forEach(g => {
    const t = C.groups[g].tax;
    if (C.intra) {
      const h = round2(t / 2);
      const label = `GST ${g}% (CGST ${g / 2}% + SGST ${g / 2}%)`;
      const value = `${rs(t)} (${rs(h)} + ${rs(round2(t - h))})`;
      taxRows += `<div>${label}</div><div>${value}</div>`;
      printTaxRows += `<tr><td colspan="6">${label}</td><td colspan="2">${value}</td></tr>`;
    }
    else {
      const label = `IGST ${g}%`;
      const value = rs(t);
      taxRows += row(label, value);
      printTaxRows += `<tr><td colspan="6">${label}</td><td colspan="2">${value}</td></tr>`;
    }
  });
  const roundRow = S.round ? row('Round off', (C.roundoff < 0 ? '-' : '') + rs(Math.abs(C.roundoff))) : '';
  const printRoundRow = S.round
    ? `<tr><td colspan="6">Round off</td><td colspan="2">${(C.roundoff < 0 ? '-' : '') + rs(Math.abs(C.roundoff))}</td></tr>`
    : '';
  const printTotals = `<tr><td colspan="6">Taxable Amount</td><td colspan="2">${hasItems ? rs(C.taxable) : ''}</td></tr>${printTaxRows}${printRoundRow}<tr><td colspan="6">Total</td><td colspan="2"><b>${hasItems ? rs(C.total) : ''}</b></td></tr>`;
  const items = C.rows.map((r, i) => `<tr>
    <td class="c">${i + 1}</td><td ><b>${esc(r.name)}</b></td><td class="c">${esc(r.hsn)}</td>
    <td class="n">${rs(r.unit)}</td><td class="c">${r.q}</td><td class="n">${rs(r.tx)}</td>
    <td class="n">${rs(r.tax)}<br><b>${taxLabel} (${r.g}%)</b></td><td class="n">${rs(r.amt)}</td></tr>`).join('');

  let qr = '';
  if (b.upi && typeof qrcode !== 'undefined') {
    const q = qrcode(0, 'M');
    q.addData(`upi://pay?pa=${b.upi}&pn=${encodeURIComponent(s.name)}${b.qrAmt ? '&am=' + C.total.toFixed(2) : ''}&cu=INR`);
    q.make(); qr = q.createImgTag(3, 0);
  }
  const terms = S.terms.list.slice(0, 5).filter(term => term.trim()).map((term, i) => `${i + 1}. ${esc(term)}`).join('<br>');
  const ship = c.shipSame ? c.billing : c.shipping;
  const shipContact = c.shipSame
    ? `${c.phone ? '<br>Phone: ' + esc(c.phone) : ''}${c.email ? '<br>Email: ' + esc(c.email) : ''}${c.gstin ? '<br>GSTIN: ' + esc(c.gstin) : ''}`
    : `${c.shippingPhone ? '<br>Ph: ' + esc(c.shippingPhone) : ''}${c.shippingEmail ? '<br>Email: ' + esc(c.shippingEmail) : ''}`;

  return `<section class="sheet">
  <div class="top"><h1>TAX INVOICE</h1><span>${label}</span></div>

  <div class="blk two sellerrow border-bottom-0">
    <div class="cell align-items-center">${eb('seller')}
      <div><b class="comp-name">${esc(s.name)}</b><br>GSTIN ${esc(s.gstin)}<br><span class="address-text">${ml(s.addr)}</span><br>Mobile ${esc(s.mobile)}<br>Email ${esc(s.email)}</div>
      <div class="logo">${s.logo ? `<img src="${s.logo}" alt="Logo">` : ''}</div>
    </div>
    <div class="cell p0"><div class="meta sec">${eb('meta')}
      ${row('Invoice No', esc(m.no))}${dateRow('Invoice Date', m.date, 'date')}${row('Place of Supply', stName(m.pos))}${dateRow('Due Date', m.due, 'due')}
    </div></div>
  </div>

  <div class="blk two customer-block">
    <div class="cell cust-cell border-end-0"><div class="cust-header"><b class="cust-section-title cust-heading">Customer Details:</b>
      <div class="cust-picker-wrap no-print">
        <input type="text" class="cust-search-input dropdown-toggle" placeholder="Search or select customer…" value="${esc(c.name)}" data-custpick="1" data-bs-toggle="dropdown" aria-expanded="false" autocomplete="off">
        <div class="dropdown-menu cust-dropdown" id="custDropdown">
          <div class="cust-dropdown-list">
            ${customers.map((dc, i) => `<button type="button" class="dropdown-item cust-option" data-custidx="${i}">
            <span class="cust-opt-name">${esc(dc.name)}</span>
            <span class="cust-opt-loc">${esc(dc.billing.split('\n').pop())}</span>
            </button>`).join('')}
          </div>
        </div>
      </div>
      ${hasCustomerDetails ? eb('customer') : ''}
      ${hasCustomerDetails ? '<button type="button" class="btn btn-sm btn-outline-secondary no-print clear-customer" data-custclear>Clear</button>' : ''}
      <button type="button" class="cust-add-btn no-print ms-5" data-custedit="1" aria-label="Add custom customer" title="Add custom customer">Add Customer <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clip-rule="evenodd" />
          </svg></button>
      </div>
      <span class="cust-name-print">${esc(c.name)}</span>
      <b class="cust-section-title">Billing address:</b>
      <span class="cust-address fw-light"><span class="address-text">${ml(c.billing)}</span>${c.phone ? '<br>Phone: ' + esc(c.phone) : ''}${c.email ? '<br>Email: ' + esc(c.email) : ''}${c.gstin ? '<br>GSTIN: ' + esc(c.gstin) : ''}</span>
    </div>
    <div class="cell Shipping1 "><b>Shipping address:</b><br><span class="fw-light"><span class="address-text">${ml(ship)}</span>${shipContact}</span></div>
  </div>

  <div class="sec">
  <table class="items"><thead style="background: #e3e3e385;"><tr><th>#</th><th class="text-start">Item</th><th class="text-start">HSN/SAC</th><th class="text-start">Rate</th><th class="no-print text-start">Qty</th><th class="print-only-th">Qty</th><th class="text-start">Value</th><th class="no-print text-start">GST %</th><th class="text-start">Tax Amount</th><th class="text-end">Total Amount</th><th class="no-print">Delete</th></tr></thead>
  <tbody>${C.rows.map((r, i) => {
    const quantityUnit = QUANTITY_UNITS.includes(S.items[i].unit) ? S.items[i].unit : 'Nos';
    const rateFitsOneLine = Math.abs(r.unit) <= 10000000;
    const valueFitsOneLine = Math.abs(r.tx) <= 10000000;
    const taxFitsOneLine = Math.abs(r.tax) <= 10000000;
    const totalFitsOneLine = Math.abs(r.amt) <= 10000000;
    return `<tr>
    <td class="c">${i + 1}</td>
    <td class="item-name-cell">
      <span class="print-only-text"><b>${esc(r.name)}</b></span>
      <div class="item-picker-wrap no-print">
        <input type="text" class="item-search-input dropdown-toggle" placeholder="Search item…" value="${esc(r.name)}" data-itempick="${i}" data-bs-toggle="dropdown" aria-expanded="false" autocomplete="off">
        <div class="dropdown-menu item-dropdown">
          ${DEMO_ITEMS.map((di, j) => `<button type="button" class="dropdown-item item-dd-opt" data-itemidx="${j}" data-itemrow="${i}">
            <span class="item-dd-name">${esc(di.name)}</span>
            <span class="item-dd-info">HSN ${esc(di.hsn)} · ₹${fmt(di.rate)}</span>
          </button>`).join('')}
          <button type="button" class="dropdown-item item-dd-opt item-dd-custom" data-itemcustom="${i}">
            <span class="item-dd-name">Custom Item <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clip-rule="evenodd" /></span>
          </button>
        </div>
      </div>
    </td>
    <td class="c text-start">
      <input class="inline-item-field inline-hsn no-print" type="text" placeholder="HSN/SAC" value="${esc(r.hsn)}" data-ihsn="${i}" aria-label="HSN/SAC for item ${i + 1}">
      <span class="print-only-text">${esc(r.hsn)}</span>
    </td>
    <td class="n text-start ${rateFitsOneLine ? 'currency-one-line' : ''}">
      <span class="inline-money-field no-print"><span aria-hidden="true">₹</span><input class="inline-item-field inline-rate" type="number" min="0" step="any" placeholder="0.00" value="${+S.items[i].rate > 0 ? r.unit.toFixed(2) : ''}" data-irate="${i}" aria-label="Rate for item ${i + 1}"></span>
      <span class="print-only-text">${r.filled ? rs(r.unit) : ''}</span>
    </td>
    <td class="c no-print text-start"><div class="dropdown quantity-unit-picker">
      <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle quantity-unit-toggle" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false" aria-label="Quantity and unit for item ${i + 1}">${+S.items[i].qty > 0 ? r.q : 'Qty'} ${esc(quantityUnit)}</button>
      <div class="dropdown-menu quantity-unit-menu">
        <div class="quantity-unit-columns">
          <div class="quantity-unit-column quantity-unit-column1">
            <div class="quantity-unit-heading">Quantity</div>
            <div class="quantity-unit-options">
              <div class="quantity-custom-entry" data-custom-entry="${i}" ${openCustomQuantityRow === i ? '' : 'hidden'}>
                <input class="form-control form-control-sm" type="number" min="0.01" step="any" value="${openCustomQuantityRow === i && +S.items[i].qty > 0 ? esc(S.items[i].qty) : +S.items[i].qty > 20 ? esc(S.items[i].qty) : ''}" data-custom-quantity-input="${i}" aria-label="Custom quantity for item ${i + 1}" placeholder="Enter quantity">
                <div class="quantity-custom-error" data-custom-quantity-error="${i}" role="alert"></div>
              </div>
              <button type="button" class="dropdown-item quantity-unit-option quantity-custom-trigger ${+S.items[i].qty > 20 ? 'active' : ''}" data-custom-quantity="${i}" ${openCustomQuantityRow === i ? 'hidden' : ''}>Custom…</button>
              ${Array.from({ length: 100 }, (_, index) => index + 1).map(n => `<button type="button" class="dropdown-item quantity-unit-option ${+S.items[i].qty === n ? 'active' : ''}" data-quantity="${n}" data-row="${i}">${n}</button>`).join('')}
            </div>
          </div>
          <div class="quantity-unit-column">
            <div class="quantity-unit-heading">Unit</div>
            <div class="quantity-unit-options quantity-unit-list">${QUANTITY_UNITS.map(unit => `<button type="button" class="dropdown-item quantity-unit-option ${unit === quantityUnit ? 'active' : ''}" data-unit="${esc(unit)}" data-row="${i}">${esc(unit)}</button>`).join('')}</div>
          </div>
        </div>
      </div>
    </div></td>
    <td class="c print-only-td text-start">${+S.items[i].qty > 0 ? `${r.q} ${esc(quantityUnit)}` : ''}</td>
    <td class="n text-start ${valueFitsOneLine ? 'currency-one-line' : ''}">
      <span class="inline-money-field no-print"><span aria-hidden="true">₹</span><input class="inline-item-field inline-value" type="number" min="0" step="any" placeholder="Value" value="${r.filled ? r.tx.toFixed(2) : ''}" data-ivalue="${i}" aria-label="Taxable value for item ${i + 1}"></span>
      <span class="print-only-text">${r.filled ? rs(r.tx) : ''}</span>
    </td>
    <td class="c no-print text-start "><select class="inline-gst form-select form-select-sm" data-igst="${i}"><option value="" disabled ${S.items[i].gst === '' ? 'selected' : ''}>GST</option>${[0, 5, 12, 18, 28].map(g => `<option value="${g}" ${S.items[i].gst !== '' && g == r.g ? 'selected' : ''}>${g}%</option>`).join('')}</select></td>
    <td class="n text-start ${taxFitsOneLine ? 'currency-one-line' : ''}">${r.filled ? `${rs(r.tax)}<br><b>(${taxLabel} ${r.g}%)</b>` : ''}</td>
    <td class="n ${totalFitsOneLine ? 'currency-one-line' : ''}">${r.filled ? rs(r.amt) : ''}</td>
    <td class="c no-print"><button class="inline-del" data-idel="${i}" title="Remove">✕</button></td>
  </tr>`;
  }).join('')}</tbody>
  </table>
  <div class="no-print items-footer"><button class="inline-add-row" data-addrow="1">Add Row <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clip-rule="evenodd" />
          </svg></button><div class="inline-roundoff"><input type="checkbox" id="inlineRo" class="setting-checkbox me-1" ${S.round ? 'checked' : ''}><label for="inlineRo">Round off total</label></div></div>
  </div>

  <div class="blk tot no-print">${row('Taxable Amount', hasItems ? rs(C.taxable) : '')}${taxRows}${roundRow}<div>Total</div><div class="big">${hasItems ? rs(C.total) : ''}</div></div>
  <div class="invoice-summary">
  <table class="invoice-totals print-only-totals"><tbody>${printTotals}</tbody></table>
  ${hasItems ? `<div class="blk words text-end inword"><span class="fw-light me-2">Total amount (in words): </span>${totalWords(C.total)}</div>` : ''}

  <div class="blk two">
    <div class="cell">${eb('bank')}<div class="upi"><div><b>Bank Details: </b><br> <span class="fw-light">Bank: ${esc(b.bank)}<br>Account #: ${esc(b.acc)}<br>IFSC: ${esc(b.ifsc)}<br>Branch: ${esc(b.branch)}</span></div>
      <div><b>Pay using UPI:</b><div class="qr qr-code">${qr}</div></div></div></div>
    <div class="cell signbox">${eb('sign')}<b>Authorized Signatory</b>${S.sign.sig ? `<img src="${S.sign.sig}" alt="Signature">` : '<span style="height:60px"></span>'}${signName ? `<span>For ${esc(signName)}</span>` : ''}</div>
  </div>

  <div class="blk">
    <div class="cell terms-cell">${eb('terms')}<b>Terms and Conditions:</b><br> <span class="fw-light">${terms}</span></div>
  </div>
  </div>
  <div class="foot">Page 1 / 1 &nbsp; This is a digitally signed document.</div>
</section>`;
}

function preparePrintRows() {
  $('#sheets').querySelectorAll('.sheet').forEach(sheet => {
    const body = sheet.querySelector('.items tbody');
    const printRows = [];

    const descriptionLines = row => {
      const textNode = row.querySelector('.item-name-cell .print-only-text b')?.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !textNode.textContent) return [];
      const range = document.createRange();
      const lines = [];
      let line = '';
      let lineTop = null;
      for (let offset = 0; offset < textNode.length; offset++) {
        range.setStart(textNode, offset);
        range.setEnd(textNode, offset + 1);
        const rect = range.getBoundingClientRect();
        if (lineTop !== null && Math.abs(rect.top - lineTop) > 1) {
          lines.push(line.trim());
          line = '';
        }
        lineTop = rect.top;
        line += textNode.textContent[offset];
      }
      if (line.trim()) lines.push(line.trim());
      return lines.filter(Boolean);
    };

    [...body.querySelectorAll(':scope > tr')].forEach(sourceRow => {
      const lines = descriptionLines(sourceRow);
      if (lines.length < 2) {
        printRows.push(sourceRow);
        return;
      }

      lines.forEach((line, lineIndex) => {
        const row = sourceRow.cloneNode(true);
        const description = row.querySelector('.item-name-cell .print-only-text b');
        if (description) description.textContent = line;
        if (lineIndex > 0) {
          row.classList.add('item-description-continuation');
          [...row.cells].forEach((cell, cellIndex) => {
            if (cellIndex !== 1) cell.textContent = '';
          });
        }
        if (lineIndex < lines.length - 1) row.classList.add('item-description-fragment');
        printRows.push(row);
      });
    });

    body.replaceChildren(...printRows);
  });

  const printableHeight = 277 * 96 / 25.4;
  $('#sheets').querySelectorAll('.sheet').forEach(sheet => {
    const fitsOnPage = sheet.getBoundingClientRect().height <= printableHeight * 0.9;
    sheet.classList.toggle('invoice-single-page', fitsOnPage);
    if (!fitsOnPage) return;

    const body = sheet.querySelector('.items tbody');
    const lastRow = body.querySelector(':scope > tr:last-child');
    if (!lastRow) return;
    const filler = lastRow.cloneNode(true);
    filler.className = 'print-body-filler';
    [...filler.cells].forEach(cell => cell.replaceChildren());
    filler.style.height = '100%';
    body.append(filler);
  });
}

function render(n = 1) {
  $('#sheets').querySelectorAll('[data-bs-toggle="dropdown"]').forEach(toggle => {
    const dropdown = bootstrap.Dropdown.getInstance(toggle);
    if (!dropdown) return;
    dropdown.hide();
    dropdown.dispose();
  });
  $('#sheets').innerHTML = LABELS.slice(0, n).map(sheetHTML).join('');
  $('#pm').value = S.priceMode; $('#cp').value = S.copies;
}

/* ---------- section editor ---------- */
const stateOpts = v => `<option value="" disabled ${v ? '' : 'selected'}>Select a state</option>${STATES.map(([c, n]) => `<option value="${c}" ${c === v ? 'selected' : ''}>${c}-${n}</option>`).join('')}`;
const SECT = {
  seller: ['Seller', [['name', 'Business name'], ['gstin', 'GSTIN', 'text', GST_RE], ['addr', 'Address', 'area'], ['mobile', 'Mobile'], ['email', 'Email'], ['state', 'Seller state', 'state'], ['logo', 'Logo (shows beside the address)', 'file']]],
  meta: ['Invoice details', [['no', 'Invoice #'], ['date', 'Invoice date', 'date'], ['due', 'Due date', 'date'], ['pos', 'Place of supply', 'state']]],
  customer: ['Customer', [['name', 'Customer name'], ['gstin', 'Customer GSTIN (optional)', 'text', GST_RE], ['phone', 'Billing phone number'], ['email', 'Billing email address', 'email'], ['billing', 'Billing address', 'area'], ['shipSame', 'Shipping same as billing', 'check'], ['shipping', 'Shipping address', 'area'], ['shippingPhone', 'Shipping phone number'], ['shippingEmail', 'Shipping email address', 'email']]],
  bank: ['Bank and UPI', [['bank', 'Bank'], ['acc', 'Account #'], ['ifsc', 'IFSC', 'text', IFSC_RE], ['branch', 'Branch'], ['upi', 'UPI ID'], ['qrAmt', 'Include invoice total in QR', 'check']]],
  sign: ['Signature', [['sig', 'Signature image', 'file'], ['companyName', 'Name shown below signature']]],

};

function fieldHTML(sec, [k, label, type, re]) {
  const v = sec === 'sign' && k === 'companyName' ? (S.sign.companyName ?? S.seller.name) : (S[sec][k] ?? ''), a = `data-p="${sec}.${k}"`;
  if (type === 'check') return `<div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="f_${k}" ${a} ${v ? 'checked' : ''}><label class="form-check-label" for="f_${k}">${label}</label></div>`;
  const placeholders = {
    name: 'Enter business or customer name',
    gstin: 'Enter GSTIN (optional)',
    addr: 'Enter business address',
    mobile: 'Enter mobile number',
    email: 'Enter email address',
    no: 'Enter invoice number',
    phone: 'Enter phone number',
    billing: 'Enter billing address',
    shipping: 'Enter shipping address',
    shippingPhone: 'Enter shipping phone number',
    shippingEmail: 'Enter shipping email address',
    bank: 'Enter bank name',
    acc: 'Enter account number',
    ifsc: 'Enter IFSC code',
    branch: 'Enter bank branch',
    upi: 'Enter UPI ID',
    companyName: 'Enter name to show below signature',
    text: 'Enter one term per line'
  };
  let inp;
  if (type === 'area') inp = `<textarea class="form-control" rows="4" placeholder="${placeholders[k] || `Enter ${label.toLowerCase()}`}" ${a}>${esc(v)}</textarea>`;
  else if (type === 'state') inp = `<select class="form-select" ${a}>${stateOpts(v)}</select>`;
  else if (type === 'file') inp = `<input class="form-control" type="file" accept="image/*" ${a}>${v ? `<button class="btn btn-sm btn-link px-0" data-clear="${sec}.${k}">Remove image</button>` : '<div class="form-text">Upload a logo or signature image.</div>'}`;
  else inp = `<input class="form-control ${re && v && !re.test(String(v).toUpperCase()) ? 'is-invalid' : ''}" type="${type === 'date' || type === 'email' ? type : 'text'}" value="${esc(v)}" ${type !== 'date' ? `placeholder="${placeholders[k] || `Enter ${label.toLowerCase()}`}"` : `title="Select ${label.toLowerCase()}"`} ${a} ${re ? `data-re="${re === GST_RE ? 'g' : 'i'}"` : ''}>${re ? '<div class="invalid-feedback">Format looks wrong. Check it before sending.</div>' : ''}`;
  const hidden = sec === 'customer' && ['shippingPhone', 'shippingEmail'].includes(k) && S.customer.shipSame ? ' hidden' : '';
  return `<div class="mb-3"${hidden}><label class="form-label">${label}</label>${inp}</div>`;
}

function itemsEditor() {
  const gsts = [0, 5, 12, 18, 28];
  const inp = (i, k, l, t = 'text') => `<div class="col-6"><label class="form-label small mb-0">${l}</label><input class="form-control form-control-sm" type="${t}" step="any" placeholder="${k === 'hsn' ? 'Enter HSN / SAC code' : k === 'rate' ? 'Enter unit rate' : k === 'qty' ? 'Enter quantity' : 'Enter discount (optional)'}" value="${esc(S.items[i][k])}" data-i="${i}" data-k="${k}"></div>`;
  return S.items.map((it, i) => `<div class="border rounded p-2 mb-3"><div class="row g-2">
    <div class="col-12"><label class="form-label small mb-0">Item ${i + 1}</label><input class="form-control form-control-sm" placeholder="Enter item or service name" value="${esc(it.name)}" data-i="${i}" data-k="name"></div>
    ${inp(i, 'hsn', 'HSN / SAC')}${inp(i, 'rate', 'Rate (₹)', 'number')}${inp(i, 'qty', 'Qty', 'number')}${inp(i, 'disc', 'Discount (₹)', 'number')}
    <div class="col-6"><label class="form-label small mb-0">GST %</label><select class="form-select form-select-sm" data-i="${i}" data-k="gst"><option value="" disabled ${it.gst === '' ? 'selected' : ''}>Select GST %</option>${gsts.map(g => `<option value="${g}" ${it.gst !== '' && g == it.gst ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
    <div class="col-6 d-flex align-items-end justify-content-end"><button class="btn btn-sm btn-outline-danger" data-del="${i}">Remove item</button></div>
  </div></div>`).join('') + '<button class="btn btn-sm btn-outline-primary" data-add="1">Add item</button>';
}

function termsEditor() {
  const terms = (S.terms.list.length ? S.terms.list : ['']).slice(0, 5);
  const atTermLimit = S.terms.list.length >= 5;
  const fields = terms.map((term, index) => `
    <div class="terms-editor-row">
      <label class="form-label" for="term-${index}">Term ${index + 1}</label>
      <div class="terms-editor-input">
        <textarea class="form-control" id="term-${index}" rows="2" placeholder="Enter a term or condition" data-term-index="${index}" ${index === 0 ? 'required aria-required="true"' : ''}>${esc(term)}</textarea>
        ${index === 0 ? '' : `<button class="btn btn-outline-danger" type="button" aria-label="Remove term ${index + 1}" data-term-remove="${index}">Remove</button>`}
      </div>
    </div>`).join('');
  return `${fields}<button class="btn btn-outline-primary" type="button" data-term-add ${atTermLimit ? 'disabled' : ''}>${atTermLimit ? 'Maximum 5 terms' : 'Add more terms'}</button>`;
}

const SETUP_STEPS = [
  { section: 'seller', title: 'Seller information', intro: 'Add your business details. These appear at the top of every invoice.' },
  { section: 'bank', title: 'Bank & UPI', intro: 'Add payment details so customers know how to pay you.' },
  { section: 'sign', title: 'Signature', intro: 'Add a signature image and the name shown below it.' },
  { section: 'terms', title: 'Terms & conditions', intro: 'Add the terms that should appear on your invoices.' }
];
let edSec = null;
let setupWizard = false;
let setupStep = 0;

function highlightEditorSection(sec) {
  // Highlight matching sidebar nav item
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-edit="${sec}"]`);
  if (navBtn) navBtn.classList.add('active');
}

function openEditor(sec) {
  setupWizard = false;
  $('#ed').classList.remove('setup-wizard-open');
  $('#ed').querySelector('.editor-modal-dialog').classList.remove('modal-dialog-centered');
  edSec = sec;
  highlightEditorSection(sec);
  if (sec === 'items') { $('#edTitle').textContent = 'Items'; $('#edBody').innerHTML = itemsEditor(); }
  else if (sec === 'terms') { $('#edTitle').textContent = 'Terms and conditions'; $('#edBody').innerHTML = termsEditor(); }
  else if (sec === 'customerDirectory') { $('#edTitle').textContent = 'Customer Details'; $('#edBody').innerHTML = customerDirectoryHTML(); }
  else { $('#edTitle').textContent = SECT[sec][0]; $('#edBody').innerHTML = SECT[sec][1].map(f => fieldHTML(sec, f)).join(''); }
  bootstrap.Modal.getOrCreateInstance('#ed').show();
}

function renderSetupStep(message = '') {
  setupWizard = true;
  $('#ed').classList.add('setup-wizard-open');
  $('#ed').querySelector('.editor-modal-dialog').classList.add('modal-dialog-centered');
  const step = SETUP_STEPS[setupStep];
  edSec = step.section;
  highlightEditorSection(step.section);
  $('#edTitle').textContent = `Set up your invoice · ${setupStep + 1} of ${SETUP_STEPS.length}`;
  const fields = step.section === 'terms'
    ? termsEditor()
    : SECT[step.section][1].map(field => fieldHTML(step.section, field)).join('');
  const back = setupStep > 0 ? '<button class="btn btn-outline-secondary" type="button" data-setup-back>Back</button>' : '<span></span>';
  const forward = setupStep === SETUP_STEPS.length - 1
    ? '<button class="btn btn-primary" type="button" data-setup-finish>Finish setup</button>'
    : '<button class="btn btn-primary" type="button" data-setup-next>Next</button>';
  $('#edBody').innerHTML = `
    <div class="setup-wizard-content">
      <div class="setup-wizard-intro">${esc(step.intro)}</div>
      <div class="setup-wizard-progress" aria-label="Setup progress">
        ${SETUP_STEPS.map((item, index) => `<span class="${index <= setupStep ? 'active' : ''}"></span>`).join('')}
      </div>
      ${fields}
    </div>
    <div class="setup-wizard-footer">
      <div class="setup-wizard-error" role="alert">${esc(message)}</div>
      <div class="setup-wizard-actions">${back}<button class="btn btn-link" type="button" data-setup-later>Do this later</button>${forward}</div>
    </div>
  `;
  bootstrap.Modal.getOrCreateInstance('#ed').show();
}

function showSetupStepError(message, section = setupStep) {
  if (section !== setupStep) setupStep = section;
  renderSetupStep(message);
  if (setupStep === 0) $('#edBody [data-p="seller.name"]').focus();
}

function validateSetupStep() {
  const invalidPattern = [...$('#edBody').querySelectorAll('[data-re]')].find(input => {
    if (!input.value) return false;
    const pattern = input.dataset.re === 'g' ? GST_RE : IFSC_RE;
    const invalid = !pattern.test(input.value.toUpperCase());
    input.classList.toggle('is-invalid', invalid);
    return invalid;
  });
  if (invalidPattern) {
    invalidPattern.focus();
    $('#edBody .setup-wizard-error').textContent = 'Check the highlighted GSTIN or IFSC format before continuing.';
    return false;
  }
  if (setupStep === 0) {
    const required = ['seller.name', 'seller.addr', 'seller.state'];
    const missing = required.map(path => $(`#edBody [data-p="${path}"]`)).filter(input => !input?.value.trim());
    if (missing.length) {
      missing.forEach(input => input?.classList.add('is-invalid'));
      missing[0]?.focus();
      $('#edBody .setup-wizard-error').textContent = 'Enter your business name, address, and seller state to continue.';
      return false;
    }
  }
  return true;
}

function openSetupWizard() {
  setupStep = 0;
  try {
    localStorage.setItem(SETUP_STARTED_KEY, '1');
  } catch (error) {
    console.warn('Could not save setup progress status.', error);
  }
  renderSetupStep();
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('#btnSetup')) openSetupWizard();
  if (t.closest('[data-setup-back]')) {
    setupStep = Math.max(0, setupStep - 1);
    renderSetupStep();
  }
  if (t.closest('[data-setup-next]')) {
    if (validateSetupStep()) {
      setupStep = Math.min(SETUP_STEPS.length - 1, setupStep + 1);
      renderSetupStep();
    }
  }
  if (t.closest('[data-setup-finish]')) {
    if (!validateSetupStep()) return;
    const missingSeller = ['name', 'addr', 'state'].some(key => !String(S.seller[key] ?? '').trim());
    if (missingSeller) {
      showSetupStepError('Complete your business name, address, and seller state before finishing.', 0);
      return;
    }
    if (!save()) {
      $('#edBody .setup-wizard-error').textContent = 'Your setup could not be saved. Check browser storage and try again.';
      return;
    }
    try {
      localStorage.setItem(SETUP_KEY, '1');
    } catch (error) {
      console.warn('Could not save setup completion status.', error);
      $('#edBody .setup-wizard-error').textContent = 'Your details were saved, but setup completion could not be recorded. Please try again.';
      return;
    }
    setupWizard = false;
    bootstrap.Modal.getOrCreateInstance('#ed').hide();
    render();
  }
  if (t.closest('[data-setup-later]')) {
    setupWizard = false;
    bootstrap.Modal.getOrCreateInstance('#ed').hide();
  }
  if (t.closest('[data-term-add]')) {
    if (S.terms.list.length >= 5) return;
    S.terms.list.push('');
    save();
    render();
    if (setupWizard) renderSetupStep();
    else openEditor('terms');
  }
  if (t.closest('[data-term-remove]')) {
    const index = +t.closest('[data-term-remove]').dataset.termRemove;
    if (index === 0) return;
    S.terms.list.splice(index, 1);
    save();
    render();
    if (setupWizard) renderSetupStep();
    else openEditor('terms');
  }
  if (t.closest('[data-customer-remove]')) {
    const index = +t.closest('[data-customer-remove]').dataset.customerRemove;
    removeCustomer(index);
    return;
  }
  if (t.closest('[data-customer-connect]')) {
    connectCustomerCsv();
    return;
  }
  if (t.closest('[data-customer-template]')) {
    try {
      downloadCustomerCsv([], 'customers-template.csv');
    } catch (error) {
      console.error('Could not download the customer CSV template.', error);
      const status = $('#customerImportStatus');
      status.className = 'customer-import-status error';
      status.textContent = 'Could not download the CSV template.';
    }
  }
  const editTrigger = t.closest('[data-edit]');
  if (editTrigger) openEditor(editTrigger.dataset.edit);
  if (t.dataset.add) { S.items.push({ name: '', hsn: '', rate: 0, qty: 0, unit: S.items[0]?.unit || 'Nos', unitExplicit: false, gst: 18, disc: 0 }); save(); render(); openEditor('items'); }
  if (t.dataset.del) { S.items.splice(+t.dataset.del, 1); save(); render(); openEditor('items'); }
  if (t.dataset.clear) {
    const [a, k] = t.dataset.clear.split('.');
    S[a][k] = null;
    save();
    render();
    if (setupWizard) renderSetupStep();
    else openEditor(edSec);
  }

  // Customer dropdown: select a saved customer
  if (t.closest('[data-custidx]')) {
    const idx = +t.closest('[data-custidx]').dataset.custidx;
    const dc = customerOptions()[idx];
    if (!dc) return;
    S.customer = structuredClone(dc);
    save(); render();
  }
  // Customer dropdown: add custom (clear fields first)
  if (t.closest('[data-custedit]')) {
    S.customer = { name: '', gstin: '', phone: '', email: '', billing: '', shipSame: true, shipping: '', shippingPhone: '', shippingEmail: '' };
    save(); render();
    openEditor('customer');
  }
  if (t.closest('[data-custclear]')) {
    S.customer = structuredClone(EMPTY_STATE.customer);
    save();
    render();
  }

  const quantityOption = t.closest('[data-quantity]');
  const customQuantityTrigger = t.closest('[data-custom-quantity]:not(input)');
  const unitOption = t.closest('[data-unit][data-row]');
  if (customQuantityTrigger) {
    const row = +customQuantityTrigger.dataset.customQuantity;
    const entry = document.querySelector(`[data-custom-entry="${row}"]`);
    if (entry) {
      openCustomQuantityRow = row;
      entry.hidden = false;
      customQuantityTrigger.hidden = true;
      entry.querySelector('input').focus();
    }
    return;
  }
  if (quantityOption || unitOption) {
    const option = quantityOption || unitOption;
    const row = +option.dataset.row;
    if (!S.items[row]) return;
    const unitWasInherited = row > 0
      && !S.items[row].unitExplicit
      && S.items.slice(0, row).some(item => item.unitExplicit && item.unit === S.items[row].unit);
    const currentToggle = document.querySelectorAll('.quantity-unit-toggle')[row];
    const unitFollowedQuantity = unitOption && currentToggle?.dataset.quantityBeforeUnit === 'true';
    const quantityNeedsUnit = quantityOption && !S.items[row].unitExplicit && !unitWasInherited;
    if (quantityOption) {
      S.items[row].qty = +quantityOption.dataset.quantity;
      openCustomQuantityRow = -1;
    } else {
      const unit = unitOption.dataset.unit;
      S.items[row].unit = unit;
      S.items[row].unitExplicit = true;
      S.items.forEach(item => {
        if (!item.unitExplicit) item.unit = unit;
      });
    }
    save();
    render();
    if (quantityNeedsUnit || (unitOption && !unitFollowedQuantity)) {
      const toggle = document.querySelectorAll('.quantity-unit-toggle')[row];
      if (toggle) {
        if (quantityNeedsUnit) toggle.dataset.quantityBeforeUnit = 'true';
        bootstrap.Dropdown.getOrCreateInstance(toggle).show();
      }
    }
    return;
  }

  // Item dropdown: select a demo item
  if (t.closest('[data-itemidx]')) {
    const el = t.closest('[data-itemidx]');
    const j = +el.dataset.itemidx;
    const row = +el.dataset.itemrow;
    const di = DEMO_ITEMS[j];
    S.items[row].name = di.name;
    S.items[row].hsn = di.hsn;
    S.items[row].rate = di.rate;
    save(); render();
  }
  // Item dropdown: custom item
  if (t.closest('[data-itemcustom]')) {
    const row = +t.closest('[data-itemcustom]').dataset.itemcustom;
    S.items[row] = { name: '', hsn: '', rate: 0, qty: S.items[row]?.qty || 0, unit: S.items[row]?.unit || S.items[0]?.unit || 'Nos', unitExplicit: S.items[row]?.unitExplicit || false, gst: S.items[row]?.gst || 18, disc: 0 };
    save(); render();
    openEditor('items');
  }

  // Inline add row
  if (t.dataset.addrow || t.closest('[data-addrow]')) {
    S.items.push({ name: '', hsn: '', rate: 0, qty: '', unit: S.items[0]?.unit || 'Nos', unitExplicit: false, gst: 18, disc: 0 });
    save(); render();
  }

  // Inline delete row
  if (t.dataset.idel !== undefined || t.closest('[data-idel]')) {
    const el = t.dataset.idel !== undefined ? t : t.closest('[data-idel]');
    const idx = +el.dataset.idel;
    S.items.splice(idx, 1);
    if (S.items.length === 0) S.items.push({ name: '', hsn: '', rate: 0, qty: '', unit: S.items[0]?.unit || 'Nos', unitExplicit: false, gst: 18, disc: 0 });
    save(); render();
  }

  // Close all dropdowns if clicking outside
});

function showPickerDropdown(input) {
  bootstrap.Dropdown.getOrCreateInstance(input).show();
}

// Open/filter customer dropdown
document.addEventListener('input', e => {
  if (e.target.dataset.customQuantityInput !== undefined) {
    const input = e.target;
    const row = +input.dataset.customQuantityInput;
    const value = Number(input.value);
    const error = document.querySelector(`[data-custom-quantity-error="${row}"]`);
    if (!Number.isFinite(value) || value <= 0) {
      if (error) error.textContent = input.value ? 'Enter a quantity greater than zero.' : '';
      return;
    }

    if (error) error.textContent = '';
    S.items[row].qty = value;
    save();
    const toggle = document.querySelectorAll('.quantity-unit-toggle')[row];
    const printQuantity = document.querySelectorAll('.print-only-td')[row];
    const unit = QUANTITY_UNITS.includes(S.items[row].unit) ? S.items[row].unit : 'Nos';
    if (toggle) toggle.textContent = `${value} ${unit}`;
    if (printQuantity) printQuantity.textContent = `${value} ${unit}`;
    return;
  }
  if (e.target.dataset.custpick) {
    const val = e.target.value.toLowerCase();
    const dd = e.target.nextElementSibling;
    showPickerDropdown(e.target);
    dd.querySelectorAll('.cust-option[data-custidx]').forEach(opt => {
      const name = (customerOptions()[+opt.dataset.custidx]?.name || '').toLowerCase();
      opt.style.display = name.includes(val) ? '' : 'none';
    });
  }
  // Open/filter item dropdown
  if (e.target.dataset.itempick !== undefined) {
    const row = +e.target.dataset.itempick;
    S.items[row].name = e.target.value;
    save();
    const val = e.target.value.toLowerCase();
    const dd = e.target.nextElementSibling;
    showPickerDropdown(e.target);
    dd.querySelectorAll('.item-dd-opt[data-itemidx]').forEach(opt => {
      const name = DEMO_ITEMS[+opt.dataset.itemidx].name.toLowerCase();
      opt.style.display = name.includes(val) ? '' : 'none';
    });
  }
});

document.addEventListener('focusout', e => {
  if (e.target.dataset.customQuantityInput === undefined) return;
  const row = +e.target.dataset.customQuantityInput;
  setTimeout(() => {
    const input = document.querySelector(`[data-custom-quantity-input="${row}"]`);
    if (!input || document.querySelector('.quantity-unit-menu.show')) return;
    openCustomQuantityRow = -1;
    render();
  }, 0);
});

// Show dropdown on focus
document.addEventListener('focusin', e => {
  if (e.target.dataset.custpick) {
    const dd = e.target.nextElementSibling;
    dd.querySelectorAll('.cust-option[data-custidx]').forEach(opt => {
      const name = (customerOptions()[+opt.dataset.custidx]?.name || '').toLowerCase();
      opt.style.display = name.includes(e.target.value.toLowerCase()) ? '' : 'none';
    });
  }
  if (e.target.dataset.itempick !== undefined) {
    const dd = e.target.nextElementSibling;
    const value = e.target.value.toLowerCase();
    dd.querySelectorAll('.item-dd-opt[data-itemidx]').forEach(opt => {
      opt.style.display = DEMO_ITEMS[+opt.dataset.itemidx].name.toLowerCase().includes(value) ? '' : 'none';
    });
  }
});

document.addEventListener('keydown', e => {
  const input = e.target;
  if (e.key === 'Enter' && input.dataset.customQuantityInput !== undefined) {
    e.preventDefault();
    const row = +input.dataset.customQuantityInput;
    const value = Number(input.value);
    const error = document.querySelector(`[data-custom-quantity-error="${row}"]`);
    if (!Number.isFinite(value) || value <= 0) {
      if (error) error.textContent = 'Enter a quantity greater than zero.';
      input.focus();
      return;
    }
    S.items[row].qty = value;
    openCustomQuantityRow = -1;
    save();
    render();
    return;
  }
  if (e.key !== 'Escape' || !(input.dataset.custpick || input.dataset.itempick !== undefined)) return;
  bootstrap.Dropdown.getOrCreateInstance(input).hide();
  input.focus();
});

// Inline qty and GST changes
document.addEventListener('change', e => {
  if (e.target.dataset.ihsn !== undefined) {
    S.items[+e.target.dataset.ihsn].hsn = e.target.value;
    save(); render();
  }
  if (e.target.dataset.irate !== undefined) {
    const item = S.items[+e.target.dataset.irate];
    const displayedRate = e.target.value === '' ? '' : +e.target.value;
    item.rate = displayedRate === '' ? '' : displayedRate * (S.priceMode === 'incl' ? 1 + (+item.gst || 0) / 100 : 1);
    save(); render();
  }
  if (e.target.dataset.ivalue !== undefined) {
    const item = S.items[+e.target.dataset.ivalue];
    if (e.target.value === '') {
      item.rate = '';
    } else if (!(+item.qty > 0)) {
      $('#messageTitle').textContent = 'Cannot edit item value';
      $('#messageBody').textContent = 'Set the item quantity before editing its value.';
      bootstrap.Modal.getOrCreateInstance('#messageModal').show();
      render();
      return;
    } else {
      const taxableValue = +e.target.value;
      const amountBeforeTax = S.priceMode === 'incl'
        ? taxableValue * (1 + (+item.gst || 0) / 100)
        : taxableValue;
      item.rate = (amountBeforeTax + (+item.disc || 0)) / +item.qty;
    }
    save(); render();
  }
  if (e.target.dataset.igst !== undefined) {
    S.items[+e.target.dataset.igst].gst = +e.target.value;
    save(); render();
  }
  if (e.target.dataset.meta) {
    S.meta[e.target.dataset.meta] = e.target.value;
    save(); render();
  }
});

$('#edBody').addEventListener('submit', e => {
  if (e.target.id !== 'customerAddForm') return;
  e.preventDefault();
  if (!e.target.reportValidity()) return;
  addCustomerFromForm(e.target);
});

$('#edBody').addEventListener('input', e => {
  const t = e.target;
  if (t.type === 'file') return;
  const v = t.type === 'checkbox' ? t.checked : t.value;
  if (t.dataset.termIndex !== undefined) {
    const termIndex = +t.dataset.termIndex;
    if (termIndex === 0 && !String(v).trim()) {
      t.value = REQUIRED_TERM;
      S.terms.list[0] = REQUIRED_TERM;
    } else {
      S.terms.list[termIndex] = v;
    }
  } else if (t.dataset.i !== undefined) {
    const num = ['rate', 'qty', 'disc', 'gst'].includes(t.dataset.k);
    S.items[+t.dataset.i][t.dataset.k] = num ? (v === '' ? 0 : +v) : v;
  } else if (t.dataset.p) {
    const [a, k] = t.dataset.p.split('.');
    S[a][k] = v;
    if (t.dataset.re) t.classList.toggle('is-invalid', !!v && !(t.dataset.re === 'g' ? GST_RE : IFSC_RE).test(v.toUpperCase()));
    if (setupWizard && v && !t.classList.contains('is-invalid')) t.classList.remove('is-invalid');
    if (setupWizard && t.value.trim()) $('#edBody .setup-wizard-error').textContent = '';
  }
  save(); render();
});

$('#edBody').addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'customerCsvFile') {
    importCustomerCsv(t.files[0]);
    t.value = '';
    return;
  }
  if (t.dataset.p === 'customer.shipSame') {
    S.customer.shipSame = t.checked;
    save();
    render();
    ['shippingPhone', 'shippingEmail'].forEach(field => {
      const input = $(`#edBody [data-p="customer.${field}"]`);
      if (input) input.parentElement.hidden = t.checked;
    });
    return;
  }
  if (t.type !== 'file' || !t.files[0]) return;
  const [a, k] = t.dataset.p.split('.');
  const fr = new FileReader();
  fr.onload = () => {
    S[a][k] = fr.result;
    save();
    render();
    if (setupWizard) renderSetupStep();
    else openEditor(edSec);
  };
  fr.readAsDataURL(t.files[0]);
});

$('#pm').onchange = e => { S.priceMode = e.target.value; save(); render(); };
$('#cp').onchange = e => { S.copies = +e.target.value; save(); };

// Inline round off checkbox
document.addEventListener('change', e => {
  if (e.target.id === 'inlineRo') {
    S.round = e.target.checked;
    save(); render();
  }
});



$('#btnPrint').onclick = () => {
  document.body.classList.add('printing');
  render(S.copies);
  printing = true;
  requestAnimationFrame(() => {
    preparePrintRows();
    window.print();
  });
};
window.onafterprint = () => {
  if (printing) {
    printing = false;
    document.body.classList.remove('printing');
    render(1);
  }
};

$('#btnNew').onclick = () => {
  bootstrap.Modal.getOrCreateInstance('#newInvoiceModal').show();
};

$('#btnConfirmNewInvoice').onclick = () => {
  bootstrap.Modal.getOrCreateInstance('#newInvoiceModal').hide();
  S.meta.no = S.meta.no.replace(/\d+$/, n => String(+n + 1).padStart(n.length, '0'));
  S.meta.date = new Date().toISOString().slice(0, 10);
  S.meta.due = '';
  S.customer = { name: '', gstin: '', phone: '', email: '', billing: '', shipSame: true, shipping: '', shippingPhone: '', shippingEmail: '' };
  S.items = [{ name: '', hsn: '', rate: 0, qty: 1, unit: 'Nos', gst: 18, disc: 0 }];
  save(); render();
};

$('#btnReset').onclick = () => {
  bootstrap.Modal.getOrCreateInstance('#resetConfirmModal').show();
};

$('#btnClearSavedData').onclick = () => {
  $('#clearDataError').hidden = true;
  $('#clearDataError').textContent = '';
  bootstrap.Modal.getOrCreateInstance('#clearDataModal').show();
};

function clearSavedData() {
  try {
    const appKeys = Object.keys(localStorage).filter(key => key === KEY || key.startsWith(`${KEY}_`));
    appKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Could not clear saved invoice data.', error);
    $('#clearDataError').textContent = 'Saved data could not be cleared. Check browser storage permissions and try again.';
    $('#clearDataError').hidden = false;
    bootstrap.Modal.getOrCreateInstance('#clearDataModal').show();
    return;
  }

  hasSavedInvoice = false;
  importedCustomers = [];
  S = structuredClone(DEMO_DATA);
  render();
  const showWelcome = () => bootstrap.Modal.getOrCreateInstance('#welcomeModal').show();
  const editor = $('#ed');
  if (editor.classList.contains('show')) {
    editor.addEventListener('hidden.bs.modal', showWelcome, { once: true });
    bootstrap.Modal.getOrCreateInstance('#ed').hide();
  } else {
    showWelcome();
  }
}

$('#btnConfirmClearData').onclick = () => {
  $('#clearDataModal').dataset.confirmed = 'true';
  bootstrap.Modal.getOrCreateInstance('#clearDataModal').hide();
};

$('#clearDataModal').addEventListener('hidden.bs.modal', () => {
  if (!$('#clearDataModal').dataset.confirmed) return;
  delete $('#clearDataModal').dataset.confirmed;
  clearSavedData();
});

function resetInvoiceToDemo() {
  S = structuredClone(DEMO_DATA);
  save();
  render();
  openSetupWizard();
}

$('#btnConfirmReset').onclick = () => {
  $('#resetConfirmModal').dataset.confirmed = 'true';
  bootstrap.Modal.getOrCreateInstance('#resetConfirmModal').hide();
};

$('#btnWelcomeSetup').onclick = () => {
  $('#welcomeModal').dataset.startSetup = 'true';
  bootstrap.Modal.getOrCreateInstance('#welcomeModal').hide();
};

function markWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_KEY, '1');
  } catch (error) {
    console.warn('Could not save welcome message status.', error);
  }
}

$('#welcomeModal').addEventListener('hidden.bs.modal', () => {
  markWelcomeSeen();
  if (!$('#welcomeModal').dataset.startSetup) {
    try {
      localStorage.setItem(SETUP_KEY, '1');
    } catch (error) {
      console.warn('Could not save welcome dismissal status.', error);
    }
    return;
  }
  delete $('#welcomeModal').dataset.startSetup;
  openSetupWizard();
});

$('#resetConfirmModal').addEventListener('hidden.bs.modal', () => {
  if (!$('#resetConfirmModal').dataset.confirmed) return;
  delete $('#resetConfirmModal').dataset.confirmed;
  const editor = $('#ed');
  if (editor.classList.contains('show')) {
    editor.addEventListener('hidden.bs.modal', resetInvoiceToDemo, { once: true });
    bootstrap.Modal.getOrCreateInstance('#ed').hide();
    return;
  }
  resetInvoiceToDemo();
});

render();
try {
  if (localStorage.getItem(SETUP_KEY) !== '1') {
    const setupStarted = localStorage.getItem(SETUP_STARTED_KEY) === '1';
    if (hasSavedInvoice && !setupStarted) {
      localStorage.setItem(SETUP_KEY, '1');
    } else if (!hasSavedInvoice && localStorage.getItem(WELCOME_KEY) !== '1') {
      bootstrap.Modal.getOrCreateInstance('#welcomeModal').show();
    } else {
      openSetupWizard();
    }
  }
} catch (error) {
  console.warn('Could not check setup status.', error);
  if (!hasSavedInvoice) bootstrap.Modal.getOrCreateInstance('#welcomeModal').show();
}

// Clear sidebar active state when editor modal is dismissed
document.getElementById('ed').addEventListener('hidden.bs.modal', () => {
  document.getElementById('ed').classList.remove('setup-wizard-open');
  document.getElementById('ed').querySelector('.editor-modal-dialog').classList.remove('modal-dialog-centered');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
});
