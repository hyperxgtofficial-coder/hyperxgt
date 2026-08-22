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
  setTimeout(() => t.classList.remove("show"), 1800);
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

// RENDER ADMIN PRODUCT TABLE
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
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#888">No matching products found in database.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td><strong>${p.id}</strong></td>
      <td><img src="${p.image}" alt="${esc(p.name)}"></td>
      <td><code style="background:#edf2f7;padding:3px 7px;border-radius:6px;font-size:11px">${esc(p.sku)}</code></td>
      <td><strong style="color:#111;display:block;max-width:320px">${esc(p.name)}</strong></td>
      <td><span style="background:#eef4ff;color:#1488d8;font-weight:800;padding:3px 8px;border-radius:6px;font-size:10px">${esc(p.category)}</span></td>
      <td><strong style="color:#2e7d32">${INR(p.price)}</strong></td>
      <td><del style="color:#999">${INR(p.mrp)}</del></td>
      <td>${esc(p.scale || '1:16')}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-icon edit" title="Edit Product" onclick="openEditModal(${p.id})">✏️</button>
          <button class="btn-icon delete" title="Delete Product" onclick="deleteProduct(${p.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// RENDER ADMIN ORDERS TABLE
function renderAdminOrders() {
  const tbody = $("#adminOrdersBody");
  if (!tbody) return;

  const sampleOrders = [
    { id: "HX-948210", cust: "Rahul Verma (Bangalore)", items: "1:7 Citroen WRC Rally Car × 1", total: 69999, method: "Razorpay / UPI", status: "Processing" },
    { id: "HX-832104", cust: "Vikram Sharma (Mumbai)", items: "1:10 Rock Crawler 4WD × 1", total: 32999, method: "Razorpay / UPI", status: "Dispatched" },
    { id: "HX-741092", cust: "Anish Patel (Delhi)", items: "1:16 SCY Brushless Drift Car × 2", total: 16998, method: "Cash on Delivery", status: "Delivered" }
  ];

  tbody.innerHTML = sampleOrders.map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${esc(o.cust)}</td>
      <td>${esc(o.items)}</td>
      <td><strong>${INR(o.total)}</strong></td>
      <td><span style="background:#f4f6ff;color:#1488d8;font-weight:700;padding:3px 8px;border-radius:6px;font-size:10px">${esc(o.method)}</span></td>
      <td><span style="background:${o.status==='Delivered'?'#e8f5e9':'#fff3e0'};color:${o.status==='Delivered'?'#2e7d32':'#e65100'};font-weight:800;padding:3px 8px;border-radius:6px;font-size:10px">${esc(o.status)}</span></td>
      <td><button class="btn" style="height:32px;min-height:0;padding:0 10px;font-size:10px" onclick="toast('Order ${o.id} status updated')">Update</button></td>
    </tr>
  `).join("");
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

// OPEN ADD MODAL
function openAddModal() {
  $("#modalTitle").textContent = "Add New Product to Database";
  $("#formProdId").value = "";
  $("#productForm").reset();
  $("#formImgPreview").src = "assets/products/H104020-R.webp";
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
  $("#formPrice").value = p.price || "";
  $("#formMrp").value = p.mrp || "";
  $("#formScale").value = p.scale || "1:16";
  $("#formSpeed").value = p.speed || "35 KM/H";
  $("#formDrive").value = p.drive || "4WD";
  $("#formImage").value = p.image || "";
  if ($("#formImgPreview")) $("#formImgPreview").src = p.image || "";

  $("#formShortDesc").value = p.short_description || "";
  $("#formFullDesc").value = p.full_description || "";

  openModal("productModal");
}

// SAVE PRODUCT (ADD OR UPDATE)
async function saveProduct(e) {
  e.preventDefault();

  const idVal = $("#formProdId").value;
  const name = $("#formName").value.trim();
  const sku = $("#formSku").value.trim();
  const category = $("#formCat").value;
  const price = Number($("#formPrice").value) || 1999;
  const mrp = Number($("#formMrp").value) || Math.round(price * 1.25);
  const scale = $("#formScale").value.trim() || "1:16";
  const speed = $("#formSpeed").value.trim() || "35 KM/H";
  const drive = $("#formDrive").value;
  const image = $("#formImage").value.trim() || "assets/products/H104020-R.webp";
  const short_description = $("#formShortDesc").value.trim();
  const full_description = $("#formFullDesc").value.trim() || short_description;

  const discount = Math.max(5, Math.min(60, Math.round(((mrp - price) / mrp) * 100)));

  if (idVal) {
    // UPDATE EXISTING PRODUCT
    const id = Number(idVal);
    const p = P.find(x => x.id === id);
    if (p) {
      p.name = name;
      p.sku = sku;
      p.category = category;
      p.price = price;
      p.mrp = mrp;
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
      
      toast(`Product #${p.id} (${p.sku}) updated successfully!`);
    }
  } else {
    // ADD NEW PRODUCT
    const newId = Math.max(0, ...P.map(x => x.id || 0)) + 1;
    const newProd = {
      id: newId,
      sku: sku,
      name: name,
      category: category,
      price: price,
      mrp: mrp,
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

  $("#adminSearch")?.addEventListener("input", renderAdminProducts);
  $("#adminCatFilter")?.addEventListener("change", renderAdminProducts);
  $("#btnOpenAddModal")?.addEventListener("click", openAddModal);
  $("#productForm")?.addEventListener("submit", saveProduct);
});
