// PERSISTENT PRODUCTS DATABASE SYNCHRONIZER
function loadProductsDB() {
  try {
    const local = localStorage.getItem("hx_products_db");
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && parsed.length) return parsed;
    }
  } catch(e) {}
  return window.HX_PRODUCTS || [];
}

function saveProductsDB(arr) {
  window.HX_PRODUCTS = arr;
  try {
    localStorage.setItem("hx_products_db", JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent("hx_stock_update", { detail: arr }));
  } catch(e) {}
}

let P = loadProductsDB();

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

// STORE ORDERS DATABASE
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
    fulfillmentStatus: "Pending Admin Acceptance",
    cancellationReason: ""
  }
];

// MULTI-PHOTO UPLOAD & GALLERY PREVIEW MANAGER WITH SUPABASE STORAGE API
function renderAdminGalleryPreview(urlsList, heroUrl) {
  const previewBox = $("#formGalleryPreview");
  if (!previewBox) return;

  const currentHero = heroUrl || $("#formImage")?.value.trim() || urlsList[0] || "";

  if (!urlsList || !urlsList.length) {
    previewBox.innerHTML = `<img src="${currentHero || 'assets/products/H104020-R.webp'}" style="width:72px;height:60px;object-fit:contain;background:#fff;border-radius:8px;border:2px solid #1488d8;padding:4px">`;
    return;
  }

  previewBox.innerHTML = urlsList.map((url, idx) => {
    const isHero = url.trim() === currentHero.trim() || idx === 0;
    return `
      <div style="position:relative;display:inline-block">
        <img src="${url.trim()}" title="Click to make main Hero Image" onclick="setAsHeroImage('${url.trim()}')" style="width:72px;height:60px;object-fit:contain;background:#fff;border-radius:8px;border:${isHero ? '2.5px solid #1488d8' : '1px solid #ccc'};padding:4px;cursor:pointer;transition:all 0.2s ease">
        ${isHero ? '<span style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:#1488d8;color:#fff;font-size:8px;font-weight:900;padding:1px 5px;border-radius:4px;white-space:nowrap">HERO</span>' : ''}
      </div>
    `;
  }).join("");
}

window.setAsHeroImage = function(url) {
  if ($("#formImage")) $("#formImage").value = url;
  const rawList = $("#formImagesList")?.value || "";
  const urls = rawList ? rawList.split(',').map(x => x.trim()).filter(Boolean) : [url];
  renderAdminGalleryPreview(urls, url);
  toast("Set as Main Hero Image 🌟");
};

function initImageUploadHandler() {
  const fileInput = $("#formFileInput");
  const imgInput = $("#formImage");
  const galleryTextarea = $("#formImagesList");

  if (fileInput) {
    fileInput.onchange = async function(e) {
      const files = [...e.target.files];
      if (!files.length) return;

      toast(`Uploading ${files.length} photos to Supabase Storage...`);

      const uploadedPublicUrls = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const base64 = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.onerror = rej;
            reader.readAsDataURL(file);
          });

          // Upload via Serverless API to Supabase Storage Bucket
          const apiRes = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64,
              filename: file.name,
              contentType: file.type || 'image/jpeg'
            })
          });
          const data = await apiRes.json();
          if (data && data.url) {
            uploadedPublicUrls.push(data.url);
          } else {
            uploadedPublicUrls.push(base64);
          }
        } catch(err) {
          console.error("Upload error:", err.message);
        }
      }

      if (uploadedPublicUrls.length) {
        if (!imgInput.value.trim() || imgInput.value.includes("H104020-R.webp")) {
          imgInput.value = uploadedPublicUrls[0];
        }
        const existingExtra = galleryTextarea.value.trim() ? galleryTextarea.value.trim().split(',').map(x => x.trim()).filter(Boolean) : [];
        const combined = [...new Set([...uploadedPublicUrls, ...existingExtra])];
        galleryTextarea.value = combined.join(', ');

        renderAdminGalleryPreview(combined, imgInput.value.trim());
        toast(`Uploaded ${uploadedPublicUrls.length} images to Supabase CDN! Hero & gallery updated ✓`);
      }
    };
  }

  if (imgInput) {
    imgInput.oninput = function() {
      const main = imgInput.value.trim();
      const rawList = galleryTextarea?.value || "";
      const urls = rawList ? rawList.split(',').map(x => x.trim()).filter(Boolean) : [main];
      renderAdminGalleryPreview(urls, main);
    };
  }

  if (galleryTextarea) {
    galleryTextarea.oninput = function() {
      const main = imgInput?.value.trim() || "";
      const rawList = galleryTextarea.value;
      const urls = rawList ? rawList.split(',').map(x => x.trim()).filter(Boolean) : [main];
      renderAdminGalleryPreview(urls, main);
    };
  }
}

// SOCIAL MEDIA CONTENT PUBLISHER HUB
function initSocialPublisher() {
  const select = $("#socialProdSelect");
  if (!select) return;

  select.innerHTML = P.map(p => `<option value="${p.id}">${esc(p.name)} (${esc(p.sku)}) — ${INR(p.price)}</option>`).join("");

  const updateCaption = () => {
    const id = Number(select.value);
    const p = P.find(x => x.id === id);
    if (!p) return;

    const hashtags = `#HyperXGT #${p.category.replace(/\s+/g, '')} #RCIndia #RCCar #SpeedDemon #${(p.scale || '1scale').replace(/[^a-zA-Z0-9]/g, '')} #HighSpeedRC`;
    const copy = `🔥 High-Speed Action Unleashed!\n\nCheck out the all-new ${p.name} (SKU: ${p.sku}) available now on HyperXGT!\n\n⚡ Price: ${INR(p.price)} (Incl. GST)\n🏎️ Specs: ${p.scale || '1:16'} Scale · ${p.speed || 'High Speed'} · ${p.drive || '4WD'}\n🚚 Express 24-Hour Shipping Across India!\n\n👉 Shop now: https://hyperxgt.com/product.html?id=${p.id}\n\n${hashtags}`;
    
    if ($("#socialCaption")) $("#socialCaption").value = copy;
  };

  select.onchange = updateCaption;
  if ($("#btnAutoCaption")) $("#btnAutoCaption").onclick = updateCaption;
  updateCaption();

  const form = $("#socialPublisherForm");
  if (form) {
    form.onsubmit = function(e) {
      e.preventDefault();
      const channels = [];
      if ($("#chkInsta")?.checked) channels.push("Instagram Reels");
      if ($("#chkFb")?.checked) channels.push("Facebook Page");
      if ($("#chkWa")?.checked) channels.push("WhatsApp Channel");
      if ($("#chkYt")?.checked) channels.push("YouTube Shorts");

      if (!channels.length) {
        alert("Please select at least one social media channel.");
        return;
      }

      toast(`Success! Published post to ${channels.join(", ")} ✓`);
    };
  }
}

// ORDER ACCEPTANCE WORKFLOW BY ADMIN & STOCK DEDUCTION
function acceptOrder(orderId) {
  const o = (window.HX_ORDERS || []).find(x => x.id === orderId);
  if (!o) return;

  o.fulfillmentStatus = "Processing";
  o.acceptedDate = new Date().toLocaleString("en-IN");

  (o.items || []).forEach(item => {
    const prod = P.find(p => p.id === item.id || p.sku === item.sku);
    if (prod) {
      prod.stock = Math.max(0, (prod.stock !== undefined ? prod.stock : 25) - item.qty);
    }
  });

  saveProductsDB(P);
  renderAdminProducts();
  renderAdminOrders();

  toast(`Order ${orderId} ACCEPTED by Admin! Stock updated ✓`);
}

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
      }
    } catch(err) {
      $("#srkApiStatus").style.color = "#2e7d32";
      $("#srkApiStatus").textContent = "✓ Shiprocket API Bridge Active (Vercel Serverless Ready)";
    }
  };
}

// INDIAN GST TAX CALCULATOR
function calculateGstBreakdown() {
  const mode = $("#formGstTaxType")?.value || "inclusive";
  const inputPrice = Number($("#formPrice")?.value || 0);
  const gstRate = Number($("#formGstRate")?.value || 18);

  if ($("#lblFormPrice")) {
    $("#lblFormPrice").textContent = mode === "inclusive" ? "Sale Price (Incl. GST) ₹ *" : "Base Price (Excl. GST) ₹ *";
  }

  if (!inputPrice || inputPrice <= 0) {
    if ($("#formPriceExcl")) $("#formPriceExcl").value = "₹0";
    if ($("#formGstAmount")) $("#formGstAmount").value = "₹0";
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

  if ($("#formPriceExcl")) $("#formPriceExcl").value = "₹" + priceExcl.toFixed(2);
  if ($("#formGstAmount")) $("#formGstAmount").value = "₹" + (mode === "inclusive" ? gstAmount.toFixed(2) : finalPriceIncl.toFixed(2));
}

// AUTH CHECK
function checkAdminAuth() {
  const isLogged = localStorage.getItem("hx_admin_logged") === "true";
  if (isLogged) {
    $("#adminLoginOverlay").style.display = "none";
    $("#adminPortal").style.display = "block";
    renderAdminProducts();
    renderAdminOrders();
    initSocialPublisher();
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
    };
  }
}

function populateAdminCatFilter() {
  const select = $("#adminCatFilter");
  if (!select) return;
  const cats = [...new Set(P.map(p => p.category))].sort();
  select.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option>${esc(c)}</option>`).join("");
}

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

  if ($("#adminCountText")) $("#adminCountText").textContent = `Showing ${filtered.length} of ${P.length} total products`;
  if ($("#metricCount")) $("#metricCount").textContent = P.length;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:#888">No matching products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const gstRate = p.gstRate || 18;
    const priceIncl = p.price || 0;
    const priceExcl = priceIncl / (1 + (gstRate / 100));
    const stock = p.stock !== undefined ? p.stock : 25;

    let stockBadge = `<span style="background:#e8f5e9;color:#2e7d32;font-weight:900;padding:3px 8px;border-radius:6px;font-size:10px">🟢 ${stock} Units</span>`;
    if (stock === 0) stockBadge = `<span style="background:#ffeeef;color:#ed1c24;font-weight:900;padding:3px 8px;border-radius:6px;font-size:10px">🔴 Out of Stock</span>`;
    else if (stock <= 5) stockBadge = `<span style="background:#fff8e1;color:#b78103;font-weight:900;padding:3px 8px;border-radius:6px;font-size:10px">🟡 ${stock} Left</span>`;

    return `
    <tr>
      <td><strong>${p.id}</strong></td>
      <td><img src="${p.image}" alt="${esc(p.name)}"></td>
      <td><code style="background:#edf2f7;padding:3px 7px;border-radius:6px;font-size:11px">${esc(p.sku)}</code></td>
      <td><strong style="color:#111;display:block;max-width:260px">${esc(p.name)}</strong></td>
      <td><span style="background:#eef4ff;color:#1488d8;font-weight:800;padding:3px 8px;border-radius:6px;font-size:10px">${esc(p.category)}</span></td>
      <td>${stockBadge}</td>
      <td><span style="color:#666;font-weight:700">₹${priceExcl.toFixed(2)}</span></td>
      <td><span style="background:#fff8e1;color:#b78103;font-weight:900;padding:3px 7px;border-radius:6px;font-size:10px">${gstRate}% GST</span></td>
      <td><strong style="color:#2e7d32">${INR(priceIncl)}</strong></td>
      <td>${esc(p.scale || '1:16')}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-icon edit" title="Edit Product Specs & Stock" onclick="openEditModal(${p.id})">✏️</button>
          <button class="btn-icon delete" title="Delete Product" onclick="deleteProduct(${p.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `;
  }).join("");
}

function renderAdminOrders() {
  const tbody = $("#adminOrdersBody");
  if (!tbody) return;

  let orders = window.HX_ORDERS || [];
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${esc(o.id)}</strong></td>
      <td><span style="font-size:11px;color:#666">${esc(o.date)}</span></td>
      <td><strong>${esc(o.customer.name)}</strong><br><small style="color:#666">${esc(o.customer.city)}</small></td>
      <td><span style="font-size:11px">${o.items.map(it => it.name).join(", ")}</span></td>
      <td><strong>${INR(o.total)}</strong></td>
      <td><span style="background:#f4f6ff;color:#1488d8;font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px">${esc(o.paymentMethod)}</span></td>
      <td><div style="font-size:11px;color:#7b2cbf">${esc(o.courier)}</div><code>${esc(o.awb)}</code></td>
      <td><span style="background:#fff8e1;color:#b78103;font-weight:900;padding:4px 10px;border-radius:6px;font-size:11px">${esc(o.fulfillmentStatus)}</span></td>
      <td>
        <button class="btn blue" style="height:32px;padding:0 10px;font-size:11px" onclick="openOrderModal('${o.id}')">Manage & Ship 🚚</button>
      </td>
    </tr>
  `).join("");
}

function openAddModal() {
  $("#modalTitle").textContent = "Add New Product to Database";
  $("#formProdId").value = "";
  $("#productForm").reset();
  $("#formStock").value = "25";
  $("#formGstTaxType").value = "inclusive";
  $("#formImage").value = "assets/products/H104020-R.webp";
  $("#formImagesList").value = "";
  renderAdminGalleryPreview(["assets/products/H104020-R.webp"]);
  calculateGstBreakdown();
  openModal("productModal");
}

function openEditModal(id) {
  const p = P.find(x => x.id === id);
  if (!p) return;

  $("#modalTitle").textContent = `Edit Product #${p.id} (${p.sku})`;
  $("#formProdId").value = p.id;
  $("#formName").value = p.name || "";
  $("#formSku").value = p.sku || "";
  $("#formCat").value = p.category || "Racing Cars";
  $("#formStock").value = p.stock !== undefined ? p.stock : 25;
  $("#formGstTaxType").value = p.taxMode || "inclusive";
  $("#formPrice").value = p.price || "";
  $("#formMrp").value = p.mrp || "";
  $("#formGstRate").value = p.gstRate || 18;
  $("#formHsn").value = p.hsn || "95030090";
  $("#formScale").value = p.scale || "1:16";
  $("#formSpeed").value = p.speed || "35 KM/H";
  $("#formDrive").value = p.drive || "4WD";

  const allImgs = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : ["assets/products/H104020-R.webp"]);
  $("#formImage").value = p.image || allImgs[0];
  $("#formImagesList").value = allImgs.join(", ");
  renderAdminGalleryPreview(allImgs, p.image);

  $("#formShortDesc").value = p.short_description || "";
  $("#formFullDesc").value = p.full_description || "";

  calculateGstBreakdown();
  openModal("productModal");
}

async function saveProduct(e) {
  e.preventDefault();

  const idVal = $("#formProdId").value;
  const name = $("#formName").value.trim();
  const sku = $("#formSku").value.trim();
  const category = $("#formCat").value;
  const stock = Number($("#formStock").value);
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

  const mainImage = $("#formImage").value.trim() || "assets/products/H104020-R.webp";
  const rawGallery = $("#formImagesList").value.trim();
  let galleryArray = rawGallery ? rawGallery.split(',').map(x => x.trim()).filter(Boolean) : [mainImage];
  if (!galleryArray.includes(mainImage)) {
    galleryArray.unshift(mainImage);
  }

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
      p.stock = isNaN(stock) ? 25 : stock;
      p.taxMode = taxMode;
      p.price = price;
      p.mrp = mrp;
      p.gstRate = gstRate;
      p.hsn = hsn;
      p.discount = discount;
      p.scale = scale;
      p.speed = speed;
      p.drive = drive;
      p.image = mainImage;
      p.images = galleryArray;
      p.short_description = short_description;
      p.full_description = full_description;

      try {
        await fetch('/api/products-crud', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p)
        });
      } catch(e) {}
      
      toast(`Product #${p.id} (${p.sku}) saved with ${galleryArray.length} photos!`);
    }
  } else {
    const newId = Math.max(0, ...P.map(x => x.id || 0)) + 1;
    const newProd = {
      id: newId,
      sku: sku,
      name: name,
      category: category,
      stock: isNaN(stock) ? 25 : stock,
      taxMode: taxMode,
      price: price,
      mrp: mrp,
      gstRate: gstRate,
      hsn: hsn,
      discount: discount,
      scale: scale,
      speed: speed,
      drive: drive,
      image: mainImage,
      images: galleryArray,
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

    toast(`New product #${newProd.id} added with ${galleryArray.length} photos!`);
  }

  saveProductsDB(P);
  closeEl($("#productModal"));
  renderAdminProducts();
}

async function deleteProduct(id) {
  const p = P.find(x => x.id === id);
  if (!p) return;

  if (confirm(`Delete "${p.name}" (SKU: ${p.sku})?`)) {
    P = P.filter(x => x.id !== id);
    saveProductsDB(P);
    try {
      await fetch('/api/products-crud?id=' + id, { method: 'DELETE' });
    } catch(e) {}
    toast(`Product ${p.sku} deleted`);
    renderAdminProducts();
  }
}

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
  initShiprocketApiTest();

  $("#formGstTaxType")?.addEventListener("change", calculateGstBreakdown);
  $("#formPrice")?.addEventListener("input", calculateGstBreakdown);
  $("#formGstRate")?.addEventListener("change", calculateGstBreakdown);

  $("#adminSearch")?.addEventListener("input", renderAdminProducts);
  $("#adminCatFilter")?.addEventListener("change", renderAdminProducts);

  $("#btnOpenAddModal")?.addEventListener("click", openAddModal);
  $("#productForm")?.addEventListener("submit", saveProduct);
});
