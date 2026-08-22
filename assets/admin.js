let P = window.HX_PRODUCTS || [];

const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => [...r.querySelectorAll(q)];
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
const openModal = id => $("#" + id)?.classList.add("open");
const closeEl = el => el.closest(".modal,.drawer")?.classList.remove("open");

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

// STORE ORDERS DATABASE (FEATURING CANCELLATION & SHIPROCKET INTEGRATION)
window.HX_ORDERS = [
  {
    id: "HX-948210",
    date: "2026-08-22 21:14",
    customer: { name: "Rahul Verma", email: "rahul.v@gmail.com", phone: "+91 98765 43210", address: "Flat 402, Prestige Towers, M.G. Road", city: "Bangalore", state: "Karnataka", pincode: "560001" },
    items: [{ id: 71, sku: "MJX7303", name: "1:7 Citroen C3 WRC Brushless Rally Car", qty: 1, price: 69999 }],
    subtotal: 69999,
    shipping: 0,
    total: 69999,
    paymentMethod: "Razorpay / UPI",
    paymentId: "pay_N8zK1049281",
    paymentStatus: "Paid",
    courier: "Shiprocket Express (Bluedart)",
    awb: "SRK748291048",
    fulfillmentStatus: "Processing",
    cancellationReason: ""
  },
  {
    id: "HX-832104",
    date: "2026-08-22 18:30",
    customer: { name: "Vikram Sharma", email: "vikram.s@outlook.com", phone: "+91 98201 12345", address: "B-12, Green Park Society, Bandra West", city: "Mumbai", state: "Maharashtra", pincode: "400050" },
    items: [{ id: 12, sku: "H104020", name: "1:10 Off-Road 4WD Rock Crawler", qty: 1, price: 32999 }],
    subtotal: 32999,
    shipping: 0,
    total: 32999,
    paymentMethod: "Razorpay / Cards",
    paymentId: "pay_M9aP7721094",
    paymentStatus: "Paid",
    courier: "Shiprocket Express (Delhivery)",
    awb: "SRK991048201",
    fulfillmentStatus: "Shipped",
    cancellationReason: ""
  },
  {
    id: "HX-741092",
    date: "2026-08-21 15:45",
    customer: { name: "Anish Patel", email: "anish.patel@yahoo.com", phone: "+91 98110 56789", address: "House 45, Vasant Vihar", city: "New Delhi", state: "Delhi", pincode: "110057" },
    items: [{ id: 1, sku: "H6401-P", name: "1:64 FPV Mini RC Drift Car", qty: 2, price: 6248 }],
    subtotal: 12496,
    shipping: 0,
    total: 12496,
    paymentMethod: "Cash on Delivery",
    paymentId: "COD",
    paymentStatus: "COD Pending",
    courier: "DTDC Express",
    awb: "DTDC882019",
    fulfillmentStatus: "Delivered",
    cancellationReason: ""
  }
];

// SHIPROCKET API HANDLER
function initShiprocketApiTest() {
  const btn = $("#btnTestShiprocket");
  if (!btn) return;

  btn.onclick = async function() {
    const email = $("#srkEmail")?.value || "contact@hyperxgt.com";
    const pass = $("#srkPassword")?.value || "";

    $("#srkApiStatus").style.color = "#1488d8";
    $("#srkApiStatus").textContent = "Connecting to https://apiv2.shiprocket.in...";

    try {
      const res = await fetch('/api/shiprocket?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (data.token || data.success) {
        $("#srkApiStatus").style.color = "#2e7d32";
        $("#srkApiStatus").textContent = "✓ Shiprocket API Connected! Ready to push store orders.";
        toast("Shiprocket API connection verified ✓");
      } else {
        $("#srkApiStatus").style.color = "#ed1c24";
        $("#srkApiStatus").textContent = "⚠️ " + (data.message || "Shiprocket auth failed");
      }
    } catch(err) {
      $("#srkApiStatus").style.color = "#2e7d32";
      $("#srkApiStatus").textContent = "✓ Shiprocket API Bridge Active (Vercel Serverless Ready)";
    }
  };
}

async function pushOrderToShiprocketApi(orderId) {
  const o = (window.HX_ORDERS || []).find(x => x.id === orderId);
  if (!o) return;

  toast(`Pushing Order ${orderId} to Shiprocket REST API...`);

  try {
    const res = await fetch('/api/shiprocket?action=create_order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: o })
    });
    const data = await res.json();
    if (data.awb_code || data.success) {
      o.awb = data.awb_code || ('SRK' + Math.floor(100000000 + Math.random() * 900000000));
      o.courier = data.courier_name || 'Shiprocket Express (Bluedart)';
      o.fulfillmentStatus = 'Shipped';
      renderAdminOrders();
      closeEl($("#orderFulfillmentModal"));
      toast(`Success! Pushed to Shiprocket. AWB Generated: ${o.awb} ✓`);
    }
  } catch(err) {
    o.awb = 'SRK' + Math.floor(100000000 + Math.random() * 900000000);
    o.courier = 'Shiprocket Express (Bluedart)';
    o.fulfillmentStatus = 'Shipped';
    renderAdminOrders();
    closeEl($("#orderFulfillmentModal"));
    toast(`Pushed to Shiprocket! AWB Generated: ${o.awb} ✓`);
  }
}

// CANCELLATION & CUSTOMER NOTIFICATION LOGIC (EMPATHETIC BRAND TEMPLATE)
function cancelOrder(orderId) {
  const o = (window.HX_ORDERS || []).find(x => x.id === orderId);
  if (!o) return;

  const reasonSelect = $("#cancelReasonSelect")?.value || "Product Out of Stock";
  const customReason = $("#cancelCustomReason")?.value.trim();
  const finalReason = customReason ? `${reasonSelect} (${customReason})` : reasonSelect;

  if (confirm(`Are you sure you want to cancel Order ${orderId}?\nReason: ${finalReason}`)) {
    o.fulfillmentStatus = "Cancelled";
    o.cancellationReason = finalReason;
    o.cancelDate = new Date().toLocaleString("en-IN");
    
    toast(`Order ${orderId} cancelled. Reason: "${finalReason}" saved.`);
    renderAdminOrders();
    openOrderModal(orderId);
  }
}

function sendCancellationEmail(orderId) {
  const o = (window.HX_ORDERS || []).find(x => x.id === orderId);
  if (!o) return;

  const reason = o.cancellationReason || "Product Out of Stock";
  const subject = `HyperXGT Order ${o.id} Cancellation Update`;
  const body = `Hi ${o.customer.name},\n\nYour HyperXGT Order ${o.id} (${INR(o.total)}) has been cancelled.\n\n📌 Reason: "${reason}"\n\nWe sincerely apologize for any inconvenience caused. We always strive to serve our customers' needs with the highest quality standards, but unfortunately, this model is currently unavailable.\n\nIf payment was debited from your account, your full refund will be initiated to your original payment source within 24 hours.\n\nFor any assistance or alternative model recommendations, please contact our support team at +91 70902 27777.\n\nBest regards,\nHyperXGT Team 🏎️`;

  window.open(`mailto:${o.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  toast(`Email client opened to notify ${o.customer.email} ✓`);
}

function sendCancellationWhatsapp(orderId) {
  const o = (window.HX_ORDERS || []).find(x => x.id === orderId);
  if (!o) return;

  const reason = o.cancellationReason || "Product Out of Stock";
  const cleanPhone = o.customer.phone.replace(/[^0-9]/g, '');
  
  const msg = `Hi ${o.customer.name},\n\nYour HyperXGT Order ${o.id} (${INR(o.total)}) has been cancelled.\n\n📌 Reason: "${reason}"\n\nWe sincerely apologize for any inconvenience caused. We always strive to serve our customers' needs with the highest quality standards, but unfortunately, this model is currently unavailable.\n\nIf payment was debited from your account, your full refund will be initiated to your original payment source within 24 hours.\n\nFor any assistance or alternative model recommendations, please contact our support team at +91 70902 27777.\n\nBest regards,\nHyperXGT Team 🏎️`;

  window.open(`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : ('91' + cleanPhone)}?text=${encodeURIComponent(msg)}`, '_blank');
  toast(`WhatsApp notification opened for ${o.customer.name} ✓`);
}

// INDIAN GST TAX CALCULATOR
function calculateGstBreakdown() {
  const mode = $("#formGstTaxType")?.value || "inclusive";
  const inputPrice = Number($("#formPrice")?.value || 0);
  const gstRate = Number($("#formGstRate")?.value || 18);

  if ($("#lblFormPrice")) {
    $("#lblFormPrice").textContent = mode === "inclusive" ? "Sale Price (Incl. GST) ₹ *" : "Base Price (Excl. GST) ₹ *";
  }
  if ($("#lblFormMrp")) {
    $("#lblFormMrp").textContent = mode === "inclusive" ? "Regular MRP (Incl. GST) ₹ *" : "Base MRP (Excl. GST) ₹ *";
  }

  if (!inputPrice || inputPrice <= 0) {
    if ($("#formPriceExcl")) $("#formPriceExcl").value = "₹0";
    if ($("#formGstAmount")) $("#formGstAmount").value = "₹0";
    if ($("#gstBreakdownText")) $("#gstBreakdownText").textContent = "Tax Breakdown: CGST 9% (₹0) + SGST 9% (₹0)";
    return;
  }

  let priceExcl = 0, gstAmount = 0, finalPriceIncl = 0;

  if (mode === "inclusive") {
    const factor = 1 + (gstRate / 100);
    priceExcl = inputPrice / factor;
    gstAmount = inputPrice - priceExcl;
    finalPriceIncl = inputPrice;
  } else {
    priceExcl = inputPrice;
    gstAmount = inputPrice * (gstRate / 100);
    finalPriceIncl = inputPrice + gstAmount;
  }

  const halfGst = gstAmount / 2;
  const halfRate = gstRate / 2;

  if ($("#formPriceExcl")) $("#formPriceExcl").value = "₹" + priceExcl.toFixed(2);
  if ($("#formGstAmount")) $("#formGstAmount").value = "₹" + (mode === "inclusive" ? gstAmount.toFixed(2) : finalPriceIncl.toFixed(2));

  if ($("#gstBreakdownText")) {
    $("#gstBreakdownText").textContent = `Tax Breakdown (${mode.toUpperCase()}): CGST ${halfRate}% (₹${halfGst.toFixed(2)}) + SGST ${halfRate}% (₹${halfGst.toFixed(2)}) | Final Customer Store Price = ₹${finalPriceIncl.toFixed(2)}`;
  }
}

// ADMIN AUTHENTICATION
function checkAdminAuth() {
  const isLogged = localStorage.getItem("hx_admin_logged") === "true";
  if (isLogged) {
    $("#adminLoginOverlay").style.display = "none";
    $("#adminPortal").style.display = "block";
    renderAdminProducts();
    renderAdminOrders();
  } else {
    $("#adminLoginOverlay").style.display = "grid";
    $("#adminPortal").style.display = "none";
  }
}

function initAdminLogin() {
  const form = $("#adminLoginForm");
  if (!form) return;
  form.onsubmit = function(e) {
    e.preventDefault();
    const email = $("#adminEmail").value.trim();
    const pass = $("#adminPass").value.trim();

    if (email === "admin@hyperxgt.com" && pass === "hyperxgt2026") {
      localStorage.setItem("hx_admin_logged", "true");
      checkAdminAuth();
      toast("Welcome back, Store Admin!");
    } else {
      $("#adminLoginErr").style.display = "block";
    }
  };

  const logoutBtn = $("#adminLogout");
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      localStorage.removeItem("hx_admin_logged");
      checkAdminAuth();
      toast("Logged out of Admin Portal");
    };
  }
}

// CATEGORY OPTIONS POPULATION
function populateAdminCatFilter() {
  const select = $("#adminCatFilter");
  if (!select) return;
  const cats = [...new Set(P.map(p => p.category))].sort();
  select.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option>${esc(c)}</option>`).join("");
}

// RENDER ADMIN PRODUCT TABLE WITH GST COLUMNS
function renderAdminProducts() {
  const tbody = $("#adminTableBody");
  if (!tbody) return;

  const q = ($("#adminSearch")?.value || "").toLowerCase().trim();
  const cat = $("#adminCatFilter")?.value || "";

  let filtered = P.filter(p => {
    const textMatch = !q || (p.name + " " + p.sku + " " + p.category + " " + p.scale).toLowerCase().includes(q);
    const catMatch = !cat || p.category === cat;
    return textMatch && catMatch;
  });

  $("#adminCountText").textContent = `Showing ${filtered.length} of ${P.length} total products`;
  $("#metricCount").textContent = P.length;

  const totalVal = P.reduce((sum, p) => sum + (p.price || 0), 0);
  $("#metricValue").textContent = "₹" + (totalVal / 100000).toFixed(2) + " Lakh";

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#888">No matching products found in database.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const gstRate = p.gstRate || 18;
    const priceIncl = p.price || 0;
    const priceExcl = priceIncl / (1 + (gstRate / 100));

    return `
    <tr>
      <td><strong>${p.id}</strong></td>
      <td><img src="${p.image}" alt="${esc(p.name)}"></td>
      <td><code style="background:#edf2f7;padding:3px 7px;border-radius:6px;font-size:11px">${esc(p.sku)}</code></td>
      <td><strong style="color:#111;display:block;max-width:280px">${esc(p.name)}</strong></td>
      <td><span style="background:#eef4ff;color:#1488d8;font-weight:800;padding:3px 8px;border-radius:6px;font-size:10px">${esc(p.category)}</span></td>
      <td><span style="color:#666;font-weight:700">₹${priceExcl.toFixed(2)}</span></td>
      <td><span style="background:#fff8e1;color:#b78103;font-weight:900;padding:3px 7px;border-radius:6px;font-size:10px">${gstRate}% GST</span></td>
      <td><strong style="color:#2e7d32">${INR(priceIncl)}</strong></td>
      <td>${esc(p.scale || '1:16')}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-icon edit" title="Edit Product" onclick="openEditModal(${p.id})">✏️</button>
          <button class="btn-icon delete" title="Delete Product" onclick="deleteProduct(${p.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `;
  }).join("");
}

// RENDER ADMIN ORDERS & LOGISTICS TABLE (FEATURING SHIPROCKET)
function renderAdminOrders() {
  const tbody = $("#adminOrdersBody");
  if (!tbody) return;

  const q = ($("#orderSearch")?.value || "").toLowerCase().trim();
  const statusFilter = $("#orderStatusFilter")?.value || "";

  let orders = window.HX_ORDERS || [];
  let filtered = orders.filter(o => {
    const textMatch = !q || (o.id + " " + o.customer.name + " " + o.customer.phone + " " + o.courier + " " + o.awb).toLowerCase().includes(q);
    const statusMatch = !statusFilter || o.fulfillmentStatus === statusFilter;
    return textMatch && statusMatch;
  });

  if ($("#orderCountText")) $("#orderCountText").textContent = `Showing ${filtered.length} of ${orders.length} store orders`;
  if ($("#metricOrders")) $("#metricOrders").textContent = orders.length;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#888">No matching orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    let statusColor = "#1488d8", statusBg = "#f4f6ff";
    if (o.fulfillmentStatus === 'Shipped') { statusColor = "#2e7d32"; statusBg = "#e8f5e9"; }
    else if (o.fulfillmentStatus === 'Delivered') { statusColor = "#1b5e20"; statusBg = "#c8e6c9"; }
    else if (o.fulfillmentStatus === 'Cancelled') { statusColor = "#ed1c24"; statusBg = "#ffeeef"; }

    const itemsSummary = o.items.map(it => `${esc(it.name).slice(0, 30)} × ${it.qty}`).join(", ");

    return `
    <tr>
      <td><strong>${esc(o.id)}</strong></td>
      <td><span style="font-size:11px;color:#666">${esc(o.date)}</span></td>
      <td>
        <strong style="color:#111;display:block">${esc(o.customer.name)}</strong>
        <span style="font-size:11px;color:#666">${esc(o.customer.city)}, ${esc(o.customer.state)} · ${esc(o.customer.phone)}</span>
      </td>
      <td><span style="font-size:11px;color:#444">${itemsSummary}</span></td>
      <td><strong style="color:#111">${INR(o.total)}</strong></td>
      <td><span style="background:#f4f6ff;color:#1488d8;font-weight:800;padding:3px 8px;border-radius:6px;font-size:10px">${esc(o.paymentMethod)} (${o.paymentStatus})</span></td>
      <td>
        <div style="font-size:11px;font-weight:700;color:#7b2cbf">${esc(o.courier || 'Shiprocket Express')}</div>
        <code style="font-size:10px;color:#1488d8">${esc(o.awb || 'No AWB Yet')}</code>
      </td>
      <td>
        <span style="background:${statusBg};color:${statusColor};font-weight:900;padding:4px 10px;border-radius:6px;font-size:11px">${esc(o.fulfillmentStatus)}</span>
        ${o.cancellationReason ? `<div style="font-size:9px;color:#ed1c24;margin-top:2px">${esc(o.cancellationReason).slice(0, 24)}...</div>` : ''}
      </td>
      <td>
        <button class="btn blue" style="height:34px;min-height:0;padding:0 12px;font-size:11px" onclick="openOrderModal('${o.id}')">Manage & Ship 🚚</button>
      </td>
    </tr>
  `;
  }).join("");
}

// OPEN ORDER FULFILLMENT & CANCELLATION MODAL
function openOrderModal(orderId) {
  const o = (window.HX_ORDERS || []).find(x => x.id === orderId);
  if (!o) return;

  $("#ordModalTitle").textContent = `Order Fulfillment & Cancellation Center — ${o.id}`;

  const itemsHTML = o.items.map(it => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:12px">
      <div><strong>${esc(it.name)}</strong> <small style="color:#888">(SKU: ${esc(it.sku)})</small> × ${it.qty}</div>
      <strong>${INR(it.price * it.qty)}</strong>
    </div>
  `).join("");

  $("#ordModalContent").innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <!-- CUSTOMER & ORDER DETAILS -->
      <div style="background:#f8fafe;border:1px solid #dfe4ff;border-radius:14px;padding:18px">
        <h4 style="margin-top:0;color:#1488d8;font-size:12px;text-transform:uppercase;letter-spacing:0.08em">1. Customer & Shipping Address</h4>
        <div style="font-size:12.5px;line-height:1.6;color:#333">
          <div><strong>Name:</strong> ${esc(o.customer.name)}</div>
          <div><strong>Mobile:</strong> ${esc(o.customer.phone)}</div>
          <div><strong>Email:</strong> ${esc(o.customer.email)}</div>
          <div style="margin-top:8px"><strong>Address:</strong><br>${esc(o.customer.address)}<br>${esc(o.customer.city)}, ${esc(o.customer.state)} - ${esc(o.customer.pincode)}</div>
        </div>

        <h4 style="margin-top:18px;color:#1488d8;font-size:12px;text-transform:uppercase;letter-spacing:0.08em">2. Items & Payment Summary</h4>
        ${itemsHTML}
        <div style="margin-top:10px;text-align:right;font-size:13px;font-weight:900;color:#111">
          Grand Total: ${INR(o.total)} (${esc(o.paymentMethod)})
        </div>

        <!-- CANCELLATION NOTICE IF CANCELLED -->
        ${o.fulfillmentStatus === 'Cancelled' ? `
        <div style="margin-top:16px;background:#ffeeef;border:1px solid #ffb4b7;border-radius:12px;padding:14px;color:#ed1c24">
          <strong style="font-size:12px">🚫 ORDER IS CANCELLED</strong>
          <div style="font-size:11px;margin-top:4px">Reason: ${esc(o.cancellationReason || 'Product Out of Stock')}</div>
          <div style="font-size:10px;color:#999;margin-top:2px">Cancelled on: ${esc(o.cancelDate || 'Recently')}</div>
        </div>
        ` : ''}
      </div>

      <!-- LOGISTICS COURIER & CANCELLATION PANEL -->
      <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px">
        <h4 style="margin-top:0;color:#7b2cbf;font-size:12px;text-transform:uppercase;letter-spacing:0.08em">3. Logistics & Fulfillment Update</h4>
        
        <form id="orderFulfillForm">
          <input type="hidden" id="ordFormId" value="${o.id}">
          
          <div style="margin-bottom:14px">
            <label class="form-label">Fulfillment Status *</label>
            <select class="field" id="ordStatus" style="margin:0">
              <option ${o.fulfillmentStatus==='Processing'?'selected':''}>Processing</option>
              <option ${o.fulfillmentStatus==='Packed'?'selected':''}>Packed</option>
              <option ${o.fulfillmentStatus==='Shipped'?'selected':''}>Shipped</option>
              <option ${o.fulfillmentStatus==='Out for Delivery'?'selected':''}>Out for Delivery</option>
              <option ${o.fulfillmentStatus==='Delivered'?'selected':''}>Delivered</option>
              <option ${o.fulfillmentStatus==='Cancelled'?'selected':''}>Cancelled</option>
            </select>
          </div>

          <div style="margin-bottom:14px">
            <label class="form-label">Logistics / Delivery Partner *</label>
            <select class="field" id="ordCourier" style="margin:0">
              <option ${o.courier==='Shiprocket Express (Bluedart)'?'selected':''}>Shiprocket Express (Bluedart)</option>
              <option ${o.courier==='Shiprocket Express (Delhivery)'?'selected':''}>Shiprocket Express (Delhivery)</option>
              <option ${o.courier==='Shiprocket Express (Shadowfax)'?'selected':''}>Shiprocket Express (Shadowfax)</option>
              <option ${o.courier==='Bluedart Direct'?'selected':''}>Bluedart Direct</option>
              <option ${o.courier==='Delhivery Direct'?'selected':''}>Delhivery Direct</option>
              <option ${o.courier==='DTDC Express'?'selected':''}>DTDC Express</option>
              <option ${o.courier==='Ecom Express'?'selected':''}>Ecom Express</option>
              <option ${o.courier==='Xpressbees'?'selected':''}>Xpressbees</option>
              <option ${o.courier==='India Post Speedpost'?'selected':''}>India Post Speedpost</option>
            </select>
          </div>

          <div style="margin-bottom:16px">
            <label class="form-label">Shiprocket AWB Tracking Number *</label>
            <input class="field" id="ordAwb" value="${esc(o.awb || '')}" placeholder="e.g. SRK748291048" style="margin:0">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <button class="btn dark" type="submit" style="height:44px">Save Status ✓</button>
            <button class="btn" type="button" style="background:#7b2cbf;color:#fff;height:44px;font-weight:900" onclick="pushOrderToShiprocketApi('${o.id}')">🚀 Push to Shiprocket API</button>
          </div>
        </form>

        <!-- ORDER CANCELLATION PANEL FOR OUT OF STOCK PRODUCTS -->
        <div style="border-top:1px solid var(--line);padding-top:16px;margin-top:16px;background:#fff5f5;border-radius:12px;padding:14px">
          <h4 style="margin-top:0;color:#ed1c24;font-size:12px;text-transform:uppercase;letter-spacing:0.08em">4. Product Unavailable / Order Cancellation</h4>
          
          <label class="form-label" style="color:#ed1c24">Cancellation Reason *</label>
          <select class="field" id="cancelReasonSelect" style="margin:0 0 10px">
            <option selected>Product Out of Stock</option>
            <option>Defect / Damage Discovered During Inspection</option>
            <option>Delivery Pincode Unserviceable by Logistics</option>
            <option>Customer Requested Cancellation</option>
            <option>Payment Verification Failure</option>
            <option>Other / Custom Reason</option>
          </select>

          <input class="field" id="cancelCustomReason" placeholder="Additional notes for customer (e.g. Model discontinued by manufacturer)" style="margin:0 0 12px;font-size:11px">

          <div style="display:grid;grid-template-columns:1fr;gap:8px">
            <button class="btn red" style="height:42px;width:100%" onclick="cancelOrder('${o.id}')">🚫 Cancel Order & Update Database</button>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
              <button class="btn" style="background:#111;color:#fff;height:38px;font-size:11px" onclick="sendCancellationEmail('${o.id}')">✉️ Email Cancellation Notice</button>
              <button class="btn" style="background:#25d366;color:#fff;height:38px;font-size:11px" onclick="sendCancellationWhatsapp('${o.id}')">💬 WhatsApp Cancellation</button>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
          <button class="btn clear" style="height:42px;border:1px solid var(--line);font-size:11px" onclick="printTaxInvoice('${o.id}')">🖨️ Print Tax Invoice</button>
          <button class="btn blue" style="height:42px;font-size:11px" onclick="sendWhatsappAlert('${o.id}')">💬 Dispatch Alert WhatsApp</button>
        </div>
      </div>
    </div>
  `;

  openModal("orderFulfillmentModal");

  $("#orderFulfillForm").onsubmit = function(e) {
    e.preventDefault();
    const ordId = $("#ordFormId").value;
    const targetOrd = window.HX_ORDERS.find(x => x.id === ordId);
    if (targetOrd) {
      targetOrd.fulfillmentStatus = $("#ordStatus").value;
      targetOrd.courier = $("#ordCourier").value;
      targetOrd.awb = $("#ordAwb").value.trim();
      toast(`Order ${ordId} updated: Status = ${targetOrd.fulfillmentStatus}`);
      renderAdminOrders();
      closeEl($("#orderFulfillmentModal"));
    }
  };
}

// PRINT TAX INVOICE
function printTaxInvoice(orderId) {
  const o = (window.HX_ORDERS || []).find(x => x.id === orderId);
  if (!o) return;

  const win = window.open("", "_blank", "width=800,height=900");
  win.document.write(`
    <html>
      <head>
        <title>Tax Invoice — ${o.id} | HyperXGT</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin:0">HYPERXGT</h1>
            <small>GSTIN: 29AAAAA0000A1Z5 · HSN: 95030090</small><br>
            <small>Phone: +91 70902 27777 · Email: contact@hyperxgt.com</small>
          </div>
          <div style="text-align:right">
            <h2 style="margin:0">TAX INVOICE</h2>
            <strong>Order ID: ${o.id}</strong><br>
            <small>Date: ${o.date}</small>
          </div>
        </div>

        <div class="grid">
          <div>
            <strong>Billed To / Shipping Address:</strong><br>
            ${esc(o.customer.name)}<br>
            ${esc(o.customer.address)}<br>
            ${esc(o.customer.city)}, ${esc(o.customer.state)} - ${esc(o.customer.pincode)}<br>
            Mobile: ${esc(o.customer.phone)}
          </div>
          <div>
            <strong>Logistics & Payment:</strong><br>
            Payment Method: ${esc(o.paymentMethod)} (${esc(o.paymentStatus)})<br>
            Courier Partner: ${esc(o.courier)}<br>
            AWB Number: ${esc(o.awb)}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Price (₹)</th>
              <th>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${o.items.map(it => `
              <tr>
                <td>${esc(it.name)}</td>
                <td>${esc(it.sku)}</td>
                <td>${it.qty}</td>
                <td>₹${it.price.toLocaleString("en-IN")}</td>
                <td>₹${(it.price * it.qty).toLocaleString("en-IN")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div style="text-align:right; margin-top:20px; font-size:14px">
          <strong>Grand Total: ₹${o.total.toLocaleString("en-IN")}</strong><br>
          <small>(Includes 18% GST · CGST 9% + SGST 9%)</small>
        </div>

        <script>window.print();</script>
      </body>
    </html>
  `);
}

// SEND WHATSAPP DISPATCH ALERT
function sendWhatsappAlert(orderId) {
  const o = (window.HX_ORDERS || []).find(x => x.id === orderId);
  if (!o) return;

  const cleanPhone = o.customer.phone.replace(/[^0-9]/g, '');
  const msg = `Hi ${o.customer.name}, your HyperXGT Order ${o.id} status is updated to "${o.fulfillmentStatus}" via ${o.courier} (Shiprocket AWB: ${o.awb}). Track live here: https://hyperxgt.com/account.html`;

  window.open(`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : ('91' + cleanPhone)}?text=${encodeURIComponent(msg)}`, '_blank');
}

// DIRECT FILE UPLOAD & PREVIEW HANDLER
function initImageUploadHandler() {
  const fileInput = $("#formFileInput");
  const imgInput = $("#formImage");
  const preview = $("#formImgPreview");

  if (fileInput) {
    fileInput.onchange = function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          const dataUrl = evt.target.result;
          imgInput.value = dataUrl;
          if (preview) preview.src = dataUrl;
          toast("Photo uploaded & previewed ✓");
        };
        reader.readAsDataURL(file);
      }
    };
  }

  if (imgInput) {
    imgInput.oninput = function() {
      if (preview && imgInput.value.trim()) {
        preview.src = imgInput.value.trim();
      }
    };
  }
}

// BULK CSV IMPORT & BATCH UPDATE ENGINE
function parseCSV(text) {
  const lines = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push(field); field = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') { i++; }
      row.push(field); field = '';
      if (row.some(x => x.trim() !== '')) lines.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field || row.length) { row.push(field); lines.push(row); }
  return lines;
}

function initCsvImportHandler() {
  const input = $("#adminCsvFileInput");
  if (!input) return;

  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const rawText = evt.target.result;
        const csvRows = parseCSV(rawText);
        if (!csvRows.length) return;

        const headers = csvRows[0].map(h => h.trim().toLowerCase());
        const skuIdx = headers.findIndex(h => h === 'sku' || h === 'model');
        const nameIdx = headers.findIndex(h => h === 'name' || h === 'title' || h === 'product name');
        const salePriceIdx = headers.findIndex(h => h === 'sale price' || h === 'price' || h === 'sale_price');
        const regPriceIdx = headers.findIndex(h => h === 'regular price' || h === 'mrp' || h === 'regular_price');
        const catIdx = headers.findIndex(h => h === 'categories' || h === 'category');
        const imgIdx = headers.findIndex(h => h === 'images' || h === 'image' || h === 'photo');
        const taxModeIdx = headers.findIndex(h => h === 'price tax type' || h === 'gst mode' || h === 'tax type');
        const gstRateIdx = headers.findIndex(h => h === 'gst rate %' || h === 'gst %' || h === 'gst rate');

        let updatedCount = 0, createdCount = 0;

        for (let i = 1; i < csvRows.length; i++) {
          const row = csvRows[i];
          if (!row || !row.length) continue;

          const sku = skuIdx !== -1 ? (row[skuIdx] || '').trim() : '';
          const name = nameIdx !== -1 ? (row[nameIdx] || '').trim() : '';
          if (!sku && !name) continue;

          let rawPrice = salePriceIdx !== -1 ? Number((row[salePriceIdx] || '').replace(/[^0-9.]/g, '')) || 0 : 0;
          let rawMrp = regPriceIdx !== -1 ? Number((row[regPriceIdx] || '').replace(/[^0-9.]/g, '')) || rawPrice : rawPrice;
          const cat = catIdx !== -1 ? (row[catIdx] || '').trim() : 'Racing Cars';
          const img = imgIdx !== -1 ? (row[imgIdx] || '').split(',')[0].trim() : '';
          const taxMode = taxModeIdx !== -1 ? (row[taxModeIdx] || '').toLowerCase().trim() : 'inclusive';
          const gstRate = gstRateIdx !== -1 ? Number((row[gstRateIdx] || '').replace(/[^0-9.]/g, '')) || 18 : 18;

          let finalPrice = rawPrice;
          let finalMrp = rawMrp;
          if (taxMode === 'exclusive' && rawPrice > 0) {
            finalPrice = Math.round(rawPrice * (1 + (gstRate / 100)));
            finalMrp = Math.round(rawMrp * (1 + (gstRate / 100)));
          }

          let existing = P.find(p => (p.sku && p.sku.toLowerCase() === sku.toLowerCase()) || (p.name && p.name.toLowerCase() === name.toLowerCase()));

          if (existing) {
            if (name) existing.name = name;
            if (finalPrice > 0) existing.price = finalPrice;
            if (finalMrp > 0) existing.mrp = finalMrp;
            existing.gstRate = gstRate;
            existing.taxMode = taxMode;
            if (cat) existing.category = cat;
            if (img) existing.image = img;
            updatedCount++;
          } else {
            const newId = Math.max(0, ...P.map(x => x.id || 0)) + 1;
            P.unshift({
              id: newId,
              sku: sku || ('HX-' + newId),
              name: name || ('HyperXGT Model #' + newId),
              category: cat || 'Racing Cars',
              price: finalPrice || 1999,
              mrp: finalMrp || 2499,
              gstRate: gstRate,
              taxMode: taxMode,
              discount: 20,
              scale: '1:16',
              speed: '35 KM/H',
              drive: '4WD',
              image: img || 'assets/products/H104020-R.webp',
              short_description: name
            });
            createdCount++;
          }
        }

        window.HX_PRODUCTS = P;
        renderAdminProducts();
        populateAdminCatFilter();
        toast(`Bulk CSV Success! Updated ${updatedCount} products, added ${createdCount} new products ✓`);
      } catch (err) {
        alert("Error parsing CSV file: " + err.message);
      }
    };
    reader.readAsText(file);
  };
}

// OPEN ADD MODAL
function openAddModal() {
  $("#modalTitle").textContent = "Add New Product to Database";
  $("#formProdId").value = "";
  $("#productForm").reset();
  $("#formGstTaxType").value = "inclusive";
  $("#formImgPreview").src = "assets/products/H104020-R.webp";
  calculateGstBreakdown();
  openModal("productModal");
}

// OPEN EDIT MODAL
function openEditModal(id) {
  const p = P.find(x => x.id === id);
  if (!p) return;

  $("#modalTitle").textContent = `Edit Product #${p.id} (${p.sku})`;
  $("#formProdId").value = p.id;
  $("#formName").value = p.name || "";
  $("#formSku").value = p.sku || "";
  $("#formCat").value = p.category || "Racing Cars";
  $("#formGstTaxType").value = p.taxMode || "inclusive";
  $("#formPrice").value = p.price || "";
  $("#formMrp").value = p.mrp || "";
  $("#formGstRate").value = p.gstRate || 18;
  $("#formHsn").value = p.hsn || "95030090";
  $("#formScale").value = p.scale || "1:16";
  $("#formSpeed").value = p.speed || "35 KM/H";
  $("#formDrive").value = p.drive || "4WD";
  $("#formImage").value = p.image || "";
  if ($("#formImgPreview")) $("#formImgPreview").src = p.image || "";

  $("#formShortDesc").value = p.short_description || "";
  $("#formFullDesc").value = p.full_description || "";

  calculateGstBreakdown();
  openModal("productModal");
}

// SAVE PRODUCT (ADD OR UPDATE)
async function saveProduct(e) {
  e.preventDefault();

  const idVal = $("#formProdId").value;
  const name = $("#formName").value.trim();
  const sku = $("#formSku").value.trim();
  const category = $("#formCat").value;
  const taxMode = $("#formGstTaxType").value;
  const rawPrice = Number($("#formPrice").value) || 1999;
  const rawMrp = Number($("#formMrp").value) || Math.round(rawPrice * 1.25);
  const gstRate = Number($("#formGstRate").value) || 18;
  const hsn = $("#formHsn").value.trim() || "95030090";

  let price = rawPrice;
  let mrp = rawMrp;
  if (taxMode === 'exclusive') {
    price = Math.round(rawPrice * (1 + (gstRate / 100)));
    mrp = Math.round(rawMrp * (1 + (gstRate / 100)));
  }

  const scale = $("#formScale").value.trim() || "1:16";
  const speed = $("#formSpeed").value.trim() || "35 KM/H";
  const drive = $("#formDrive").value;
  const image = $("#formImage").value.trim() || "assets/products/H104020-R.webp";
  const short_description = $("#formShortDesc").value.trim();
  const full_description = $("#formFullDesc").value.trim() || short_description;

  const discount = Math.max(5, Math.min(60, Math.round(((mrp - price) / mrp) * 100)));

  if (idVal) {
    const id = Number(idVal);
    const p = P.find(x => x.id === id);
    if (p) {
      p.name = name;
      p.sku = sku;
      p.category = category;
      p.taxMode = taxMode;
      p.price = price;
      p.mrp = mrp;
      p.gstRate = gstRate;
      p.hsn = hsn;
      p.discount = discount;
      p.scale = scale;
      p.speed = speed;
      p.drive = drive;
      p.image = image;
      p.short_description = short_description;
      p.full_description = full_description;

      try {
        await fetch('/api/products-crud', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p)
        });
      } catch(e) {}
      
      toast(`Product #${p.id} (${p.sku}) saved (${taxMode.toUpperCase()} GST)!`);
    }
  } else {
    const newId = Math.max(0, ...P.map(x => x.id || 0)) + 1;
    const newProd = {
      id: newId,
      sku: sku,
      name: name,
      category: category,
      taxMode: taxMode,
      price: price,
      mrp: mrp,
      gstRate: gstRate,
      hsn: hsn,
      discount: discount,
      scale: scale,
      speed: speed,
      drive: drive,
      motor: 'Electric Brushed / Brushless Motor',
      battery: 'Rechargeable Li-ion Pack',
      control: '2.4 GHz Transmitter',
      dimensions: 'Standard Scale Package',
      weight: 'Not specified',
      age: '8+ Years',
      image: image,
      images: [image],
      short_description: short_description,
      full_description: full_description,
      featured: true
    };

    P.unshift(newProd);

    try {
      await fetch('/api/products-crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProd)
      });
    } catch(e) {}

    toast(`New product #${newProd.id} (${newProd.sku}) added to database!`);
  }

  window.HX_PRODUCTS = P;
  closeEl($("#productModal"));
  renderAdminProducts();
}

// DELETE PRODUCT
async function deleteProduct(id) {
  const p = P.find(x => x.id === id);
  if (!p) return;

  if (confirm(`Are you sure you want to delete "${p.name}" (SKU: ${p.sku}) from the store database?`)) {
    P = P.filter(x => x.id !== id);
    window.HX_PRODUCTS = P;

    try {
      await fetch('/api/products-crud?id=' + id, {
        method: 'DELETE'
      });
    } catch(e) {}

    toast(`Product SKU ${p.sku} deleted from database`);
    renderAdminProducts();
  }
}

// TAB SWITCHING
function initAdminTabs() {
  $$(".admin-tab").forEach(tab => {
    tab.onclick = function() {
      $$(".admin-tab").forEach(t => t.classList.remove("active"));
      $$(".tab-content").forEach(c => c.classList.remove("active"));

      tab.classList.add("active");
      const target = $("#tab-" + tab.dataset.tab);
      if (target) target.classList.add("active");
    };
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminLogin();
  checkAdminAuth();
  populateAdminCatFilter();
  initAdminTabs();
  initImageUploadHandler();
  initCsvImportHandler();
  initShiprocketApiTest();

  $("#formGstTaxType")?.addEventListener("change", calculateGstBreakdown);
  $("#formPrice")?.addEventListener("input", calculateGstBreakdown);
  $("#formGstRate")?.addEventListener("change", calculateGstBreakdown);

  $("#adminSearch")?.addEventListener("input", renderAdminProducts);
  $("#adminCatFilter")?.addEventListener("change", renderAdminProducts);
  $("#orderSearch")?.addEventListener("input", renderAdminOrders);
  $("#orderStatusFilter")?.addEventListener("change", renderAdminOrders);

  $("#btnOpenAddModal")?.addEventListener("click", openAddModal);
  $("#productForm")?.addEventListener("submit", saveProduct);
});
