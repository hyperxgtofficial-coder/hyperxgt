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
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#039;" }[m]));
const openModal = id => $("#" + id)?.classList.add("open");
const closeEl = el => el.closest(".modal,.drawer")?.classList.remove("open");

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

// ADMIN AUTHENTICATION CONTROLLER
function checkAdminAuth() {
  const overlay = $("#adminLoginOverlay");
  const portal = $("#adminPortal");
  const isLogged = localStorage.getItem("hx_admin_logged") === "true";

  if (isLogged) {
    if (overlay) overlay.style.display = "none";
    if (portal) portal.style.display = "block";
  } else {
    if (overlay) overlay.style.display = "flex";
    if (portal) portal.style.display = "none";
  }
}

function initAdminAuth() {
  checkAdminAuth();

  const loginForm = $("#adminLoginForm");
  if (loginForm) {
    loginForm.onsubmit = function(e) {
      e.preventDefault();
      const email = ($("#adminEmail")?.value || "").trim().toLowerCase();
      const pass = ($("#adminPass")?.value || "").trim();

      if ((email === "admin@hyperxgt.com" || email === "contact@hyperxgt.com") && (pass === "hyperxgt2026" || pass === "admin123")) {
        localStorage.setItem("hx_admin_logged", "true");
        if ($("#adminLoginErr")) $("#adminLoginErr").style.display = "none";
        checkAdminAuth();
        toast("Welcome back, Store Admin! 🌟");
      } else {
        if ($("#adminLoginErr")) {
          $("#adminLoginErr").style.display = "block";
          $("#adminLoginErr").textContent = "Invalid credentials. Use admin@hyperxgt.com / hyperxgt2026";
        }
      }
    };
  }

  const logoutBtn = $("#adminLogout");
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      localStorage.removeItem("hx_admin_logged");
      checkAdminAuth();
      toast("Logged out of Admin Portal.");
    };
  }
}

// ADMIN TABS NAVIGATION CONTROLLER
function initAdminTabs() {
  $$(".admin-tab").forEach(tab => {
    tab.onclick = function() {
      const target = tab.dataset.tab;
      $$(".admin-tab").forEach(t => t.classList.remove("active"));
      $$(".tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const targetEl = $("#tab-" + target);
      if (targetEl) targetEl.classList.add("active");
    };
  });
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
  },
  {
    id: "HX-948211",
    date: "2026-08-23 14:20",
    customer: { name: "Aman Gupta", email: "aman.g@gmail.com", phone: "+91 99887 76655", address: "H.No 12, Sector 15", city: "Gurgaon", state: "Haryana", pincode: "122001" },
    items: [{ id: 72, sku: "MJX7304", name: "1:14 Brushless 4WD Drift Car", qty: 1, price: 14999 }],
    subtotal: 14999,
    shipping: 0,
    total: 14999,
    paymentMethod: "Partial COD",
    paymentId: "pay_N8zK9921102",
    paymentStatus: "Partial Paid",
    courier: "Delhivery Surface",
    awb: "DEL882190412",
    fulfillmentStatus: "Processing",
    cancellationReason: ""
  }
];

// MULTI-PHOTO UPLOAD & GALLERY PREVIEW MANAGER WITH INDEX-BASED DELETE
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
      <div style="position:relative;display:inline-block;margin-right:10px;margin-bottom:10px">
        <img src="${url.trim()}" title="Click to set as Main Hero Image" onclick="setAsHeroImageByIdx(${idx})" style="width:72px;height:60px;object-fit:contain;background:#fff;border-radius:8px;border:${isHero ? '2.5px solid #1488d8' : '1px solid #ccc'};padding:4px;cursor:pointer">
        <button type="button" onclick="deleteProductImageByIdx(${idx})" style="position:absolute;top:-8px;right:-8px;background:#ed1c24;color:#fff;border:0;width:22px;height:22px;border-radius:50%;font-size:13px;font-weight:900;cursor:pointer;display:grid;place-items:center;z-index:20;box-shadow:0 2px 6px rgba(0,0,0,0.4)" title="Delete this picture">×</button>
        ${isHero ? '<span style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:#1488d8;color:#fff;font-size:8px;font-weight:900;padding:1px 5px;border-radius:4px;white-space:nowrap">HERO</span>' : ''}
      </div>
    `;
  }).join("");
}

window.deleteProductImageByIdx = function(idxToDelete) {
  const heroInput = $("#formImage");
  const listTextarea = $("#formImagesList");

  let rawList = listTextarea && listTextarea.value.trim() ? listTextarea.value.split(',').map(x => x.trim()).filter(Boolean) : [];
  if (heroInput && heroInput.value.trim() && !rawList.includes(heroInput.value.trim())) {
    rawList.unshift(heroInput.value.trim());
  }

  const deletedUrl = rawList[idxToDelete];
  rawList.splice(idxToDelete, 1);

  if (heroInput && deletedUrl && heroInput.value.trim() === deletedUrl.trim()) {
    heroInput.value = rawList[0] || 'assets/products/H104020-R.webp';
  }

  if (listTextarea) {
    listTextarea.value = rawList.join(', ');
  }

  renderAdminGalleryPreview(rawList, heroInput ? heroInput.value.trim() : '');
  toast("Deleted picture from product gallery 🗑️");
};

window.setAsHeroImageByIdx = function(idx) {
  const listTextarea = $("#formImagesList");
  let rawList = listTextarea && listTextarea.value.trim() ? listTextarea.value.split(',').map(x => x.trim()).filter(Boolean) : [];
  const selectedUrl = rawList[idx] || "";
  if (selectedUrl && $("#formImage")) {
    $("#formImage").value = selectedUrl;
    renderAdminGalleryPreview(rawList, selectedUrl);
    toast("Set as Main Hero Image 🌟");
  }
};

function initImageUploadHandler() {
  const fileInput = $("#formFileInput");
  const imgInput = $("#formImage");
  const galleryTextarea = $("#formImagesList");

  if (fileInput) {
    fileInput.onchange = async function(e) {
      const files = [...e.target.files];
      if (!files.length) return;

      toast(`Uploading ${files.length} photos...`);
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
        toast(`Uploaded ${uploadedPublicUrls.length} images! Hero & gallery updated ✓`);
      }
    };
  }
}

// VIDEO FILE & YOUTUBE URL UPLOADER HANDLER
function initVideoUploadHandler() {
  const videoFileInput = $("#formVideoFileInput");
  const videoUrlInput = $("#formVideoUrl");

  if (videoFileInput && videoUrlInput) {
    videoFileInput.onchange = async function(e) {
      const file = e.target.files[0];
      if (!file) return;

      toast("Uploading product action video...");
      try {
        const base64 = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });

        const apiRes = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64,
            filename: file.name,
            contentType: file.type || 'video/mp4'
          })
        });
        const data = await apiRes.json();
        if (data && data.url) {
          videoUrlInput.value = data.url;
        } else {
          videoUrlInput.value = base64;
        }
        toast("Uploaded product video successfully! Live video ready 🎥");
      } catch(err) {
        console.error("Video upload error:", err.message);
      }
    };
  }
}

// CUSTOMER REVIEWS & UNBOXING APPROVALS
async function renderAdminReviews() {
  const tbody = $("#adminReviewsBody");
  if (!tbody) return;

  try {
    const res = await fetch('/api/submit-review');
    const data = await res.json();
    const reviews = (data && data.reviews) ? data.reviews : [];

    if (!reviews.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#888">No customer reviews submitted yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = reviews.map(r => {
      let statusBadge = `<span style="background:#fff8e1;color:#b78103;font-weight:900;padding:3px 8px;border-radius:6px;font-size:10px">🟡 ${r.status}</span>`;
      if (r.status === "Approved") statusBadge = `<span style="background:#e8f5e9;color:#2e7d32;font-weight:900;padding:3px 8px;border-radius:6px;font-size:10px">🟢 Approved</span>`;
      else if (r.status === "Rejected") statusBadge = `<span style="background:#ffeeef;color:#ed1c24;font-weight:900;padding:3px 8px;border-radius:6px;font-size:10px">🔴 Rejected</span>`;

      return `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td><strong>${esc(r.name)}</strong><br><small style="color:#666">${esc(r.email)}</small></td>
          <td><code>${esc(r.orderId)}</code></td>
          <td>
            <div style="color:#b78103;font-weight:900">⭐ ${r.rating}/5</div>
            <p style="font-size:11px;color:#444;margin:4px 0 0;max-width:220px">${esc(r.text)}</p>
          </td>
          <td>
            ${r.mediaUrl ? `<a href="${r.mediaUrl}" target="_blank" style="color:#1488d8;font-weight:800;font-size:11px">📁 View ${r.mediaType || 'Media'}</a>` : '<span style="color:#aaa;font-size:10px">No Media</span>'}
          </td>
          <td>${statusBadge}</td>
          <td>${r.couponCode ? `<code style="background:#eef4ff;color:#1488d8;padding:3px 6px;border-radius:6px;font-weight:900">${r.couponCode} (10% OFF)</code>` : '<span style="color:#888;font-size:10px">Pending</span>'}</td>
          <td>
            <div style="display:flex;gap:6px">
              ${r.status !== 'Approved' ? `<button class="btn blue" style="height:30px;padding:0 8px;font-size:10px" onclick="approveReview('${r.id}')">Approve & Send Coupon 📧</button>` : ''}
              ${r.status !== 'Rejected' ? `<button class="btn red" style="height:30px;padding:0 8px;font-size:10px;background:#666" onclick="rejectReview('${r.id}')">Reject</button>` : ''}
              <button class="btn clear" style="height:30px;padding:0 8px;font-size:10px" onclick="deleteReview('${r.id}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  } catch(e) {}
}

async function approveReview(id) {
  try {
    const res = await fetch('/api/submit-review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve' })
    });
    const data = await res.json();
    if (data.success) {
      toast(`Approved Review #${id}! Coupon ${data.couponCode} emailed ✓`);
      renderAdminReviews();
    }
  } catch(e) {}
}

async function rejectReview(id) {
  try {
    await fetch('/api/submit-review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reject' })
    });
    toast(`Rejected Review #${id}`);
    renderAdminReviews();
  } catch(e) {}
}

async function deleteReview(id) {
  if (!confirm(`Delete review #${id}?`)) return;
  try {
    await fetch(`/api/submit-review?id=${id}`, { method: 'DELETE' });
    toast(`Deleted review #${id}`);
    renderAdminReviews();
  } catch(e) {}
}

// BRAND COLLABORATIONS MANAGER
async function renderAdminCollaborations() {
  const tbody = $("#adminCollabBody");
  if (!tbody) return;

  try {
    const res = await fetch('/api/collaborations');
    const data = await res.json();
    const collabs = (data && data.collaborations) ? data.collaborations : [];

    if (!collabs.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#888">No brand collaborations created yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = collabs.map(c => `
      <tr>
        <td><strong>${c.id}</strong></td>
        <td><img src="${c.logo}" style="width:40px;height:40px;object-fit:contain;background:#f5f5f5;border-radius:8px;padding:4px"></td>
        <td><strong>${esc(c.name)}</strong></td>
        <td><a href="${esc(c.link)}" target="_blank" style="color:#1488d8">${esc(c.link)}</a></td>
        <td>${c.active ? '<span style="color:#2e7d32;font-weight:900">🟢 Active</span>' : '<span style="color:#888">⚪ Hidden</span>'}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn blue" style="height:30px;padding:0 8px;font-size:10px" onclick="toggleCollabActive(${c.id})">${c.active ? 'Hide' : 'Show'}</button>
            <button class="btn red" style="height:30px;padding:0 8px;font-size:10px" onclick="deleteCollab(${c.id})">🗑️</button>
          </div>
        </td>
      </tr>
    `).join("");
  } catch(e) {}
}

async function toggleCollabActive(id) {
  try {
    const res = await fetch('/api/collaborations');
    const data = await res.json();
    const c = data.collaborations.find(x => x.id === id);
    if (!c) return;

    await fetch('/api/collaborations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...c, active: !c.active })
    });
    toast("Updated collaboration visibility ✓");
    renderAdminCollaborations();
  } catch(e) {}
}

async function deleteCollab(id) {
  if (!confirm("Delete this brand collaboration?")) return;
  try {
    await fetch(`/api/collaborations?id=${id}`, { method: 'DELETE' });
    toast("Deleted brand collaboration ✓");
    renderAdminCollaborations();
  } catch(e) {}
}

function initCollabForm() {
  const btn = $("#btnAddCollab");
  if (btn) {
    btn.onclick = function() {
      const name = prompt("Enter Brand Partner Name (e.g. Traxxas India):");
      if (!name) return;
      const logo = prompt("Enter Brand Logo URL:", "assets/hyperxgt-logo.png");
      if (!logo) return;
      const link = prompt("Enter Brand Website / Catalog Link:", "index.html");

      fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logo, link, active: true })
      }).then(() => {
        toast(`Added Brand Partner "${name}" ✓`);
        renderAdminCollaborations();
      });
    };
  }
}

// BULK CSV PRODUCT UPLOADER
function initCsvBulkUploader() {
  const input = $("#adminCsvFileInput");
  if (!input) return;

  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const text = evt.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return;

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const newProducts = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 3) {
            const pObj = {
              id: Date.now() + i,
              name: cols[0] || "RC Model",
              sku: cols[1] || `HX-${1000 + i}`,
              category: cols[2] || "Racing Cars",
              price: Number(cols[3]) || 2999,
              mrp: Number(cols[4]) || 3999,
              stock: Number(cols[5]) || 25,
              scale: cols[6] || "1:16",
              drive: cols[7] || "4WD",
              speed: cols[8] || "35 KM/H",
              image: cols[9] || "assets/products/H104020-R.webp"
            };
            newProducts.push(pObj);
          }
        }

        if (newProducts.length) {
          P = [...newProducts, ...P];
          saveProductsDB(P);
          renderAdminProducts();
          populateAdminCatFilter();
          toast(`Bulk CSV Success! Imported ${newProducts.length} new products ✓`);
        }
      } catch(err) {
        alert("CSV Parsing Error. Please check file format.");
      }
    };
    reader.readAsText(file);
  };
}

// INTEGRATIONS & SOCIAL PUBLISHER AI CAPTION GENERATOR
function initSocialPublisher() {
  const form = $("#socialPublisherForm");
  const btnAuto = $("#btnAutoCaption");
  const prodSelect = $("#socialProdSelect");
  const captionArea = $("#socialCaption");

  if (prodSelect) {
    prodSelect.innerHTML = P.map(p => `<option value="${p.id}">${esc(p.name)} (${esc(p.sku)}) — ${INR(p.price)}</option>`).join("");
  }

  if (btnAuto && prodSelect && captionArea) {
    btnAuto.onclick = function() {
      const pId = Number(prodSelect.value);
      const p = P.find(x => x.id === pId) || P[0];
      if (!p) return;

      captionArea.value = `🏁 NEW DROP ALERT: ${p.name} (SKU: ${p.sku})!\n\n` +
        `⚡ High-performance ${p.scale} ${p.category} with ${p.drive} drivetrain & ${p.speed} top speed.\n` +
        `🔥 Official Price: ${INR(p.price)} (Ships within 24 Hours across India)\n\n` +
        `📲 Order now at hyperxgt.com or WhatsApp +91 70902 27777!\n\n` +
        `#HyperXGT #RCCars #RCIndia #Brushless #RCRacing #HobbyGrade #${p.category.replace(/[^a-zA-Z]/g,'')}`;

      toast("Generated AI Social Caption ✨");
    };
  }

  if (form) {
    form.onsubmit = function(e) {
      e.preventDefault();
      const channels = [];
      if ($("#chkInsta")?.checked) channels.push("Instagram");
      if ($("#chkFb")?.checked) channels.push("Facebook");
      if ($("#chkWa")?.checked) channels.push("WhatsApp Broadcast");
      if ($("#chkYt")?.checked) channels.push("YouTube Shorts");

      if (!channels.length) {
        alert("Please select at least one social media channel.");
        return;
      }
      toast(`Published post to ${channels.join(", ")} ✓`);
    };
  }
}

// ORDER FULFILLMENT & LOGISTICS TRACKING CONTROLLER
window.openOrderModal = function(orderId) {
  const o = (window.HX_ORDERS || []).find(x => x.id === orderId);
  if (!o) return;

  $("#ordModalTitle").textContent = `Fulfillment & Logistics Hub — Order ${o.id}`;

  const content = $("#ordModalContent");
  if (content) {
    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        <div style="background:#f8f9fa;border:1px solid var(--line);border-radius:14px;padding:18px">
          <strong style="font-size:13px;color:#111;display:block;margin-bottom:8px">👤 Customer Info & Address</strong>
          <div style="font-size:12px;color:#444;line-height:1.6">
            <strong>${esc(o.customer.name)}</strong><br>
            Phone: ${esc(o.customer.phone)}<br>
            Email: ${esc(o.customer.email)}<br>
            Address: ${esc(o.customer.address)}, ${esc(o.customer.city)}, ${esc(o.customer.state)} - ${esc(o.customer.pincode)}
          </div>
        </div>

        <div style="background:#f8f9fa;border:1px solid var(--line);border-radius:14px;padding:18px">
          <strong style="font-size:13px;color:#111;display:block;margin-bottom:8px">💳 Payment & Order Details</strong>
          <div style="font-size:12px;color:#444;line-height:1.6">
            Date: ${esc(o.date)}<br>
            Total Amount: <strong style="color:#2e7d32">${INR(o.total)}</strong><br>
            Payment Mode: ${esc(o.paymentMethod)} (${esc(o.paymentStatus)})<br>
            Transaction Ref: <code>${esc(o.paymentId || 'N/A')}</code>
          </div>
        </div>
      </div>

      <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:20px">
        <strong style="font-size:13px;color:#111;display:block;margin-bottom:10px">🛒 Ordered Items:</strong>
        ${(o.items || []).map(it => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee;font-size:12px">
            <div>
              <strong>${esc(it.name)}</strong> (SKU: ${esc(it.sku)})
            </div>
            <div>
              ${it.qty} × ${INR(it.price)} = <strong>${INR(it.qty * it.price)}</strong>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- LOGISTICS & SHIPMENT CONTROLLER -->
      <div style="background:#f4f6ff;border:1px solid #cce0ff;border-radius:16px;padding:20px">
        <h4 style="margin:0 0 12px;color:#1488d8">🚚 Shiprocket Courier & Tracking Controller</h4>
        
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
          <div>
            <label class="form-label">Fulfillment Status</label>
            <select class="field" id="ordStatus" style="margin:0">
              <option value="Pending Admin Acceptance" ${o.fulfillmentStatus === 'Pending Admin Acceptance' ? 'selected' : ''}>🟡 Pending Acceptance</option>
              <option value="Processing" ${o.fulfillmentStatus === 'Processing' ? 'selected' : ''}>⚙️ Processing</option>
              <option value="Packed" ${o.fulfillmentStatus === 'Packed' ? 'selected' : ''}>📦 Packed</option>
              <option value="Shipped" ${o.fulfillmentStatus === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
              <option value="Out for Delivery" ${o.fulfillmentStatus === 'Out for Delivery' ? 'selected' : ''}>🛵 Out for Delivery</option>
              <option value="Delivered" ${o.fulfillmentStatus === 'Delivered' ? 'selected' : ''}>🟢 Delivered</option>
              <option value="Cancelled" ${o.fulfillmentStatus === 'Cancelled' ? 'selected' : ''}>🔴 Cancelled</option>
            </select>
          </div>

          <div>
            <label class="form-label">Courier Service</label>
            <input class="field" id="ordCourier" value="${esc(o.courier || 'Shiprocket Express (Bluedart)')}" style="margin:0">
          </div>

          <div>
            <label class="form-label">AWB Tracking Number</label>
            <input class="field" id="ordAwb" value="${esc(o.awb || 'SRK' + Math.floor(10000000 + Math.random() * 90000000))}" style="margin:0">
          </div>
        </div>

        <div style="display:flex;gap:10px">
          <button class="btn blue" onclick="updateOrderStatus('${o.id}')" style="height:44px">Update Order Status & Dispatch AWB ✓</button>
          ${o.fulfillmentStatus === 'Pending Admin Acceptance' ? `<button class="btn dark" onclick="acceptOrder('${o.id}'); closeEl($('#orderFulfillmentModal'))" style="height:44px">Accept Order & Deduct Stock 📦</button>` : ''}
        </div>
      </div>
    `;
  }

  openModal("orderFulfillmentModal");
};

window.updateOrderStatus = function(orderId) {
  const o = (window.HX_ORDERS || []).find(x => x.id === orderId);
  if (!o) return;

  o.fulfillmentStatus = $("#ordStatus")?.value || o.fulfillmentStatus;
  o.courier = $("#ordCourier")?.value || o.courier;
  o.awb = $("#ordAwb")?.value || o.awb;

  renderAdminOrders();
  closeEl($("#orderFulfillmentModal"));
  toast(`Updated Order ${orderId} status to "${o.fulfillmentStatus}" ✓`);
};

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

function openAddModal() {
  $("#modalTitle").textContent = "Add New Product to Database";
  $("#formProdId").value = "";
  $("#productForm").reset();
  $("#formStock").value = "25";
  $("#formGstTaxType").value = "inclusive";
  $("#formImage").value = "assets/products/H104020-R.webp";
  $("#formImagesList").value = "";
  if ($("#formVideoUrl")) $("#formVideoUrl").value = "";
  renderAdminGalleryPreview(["assets/products/H104020-R.webp"]);
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
  if ($("#formVideoUrl")) $("#formVideoUrl").value = p.video || "";
  renderAdminGalleryPreview(allImgs, p.image);

  $("#formShortDesc").value = p.short_description || "";
  $("#formFullDesc").value = p.full_description || "";

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
  const image = $("#formImage").value.trim() || "assets/products/H104020-R.webp";
  const rawGallery = $("#formImagesList").value.trim();
  const images = rawGallery ? rawGallery.split(',').map(x => x.trim()).filter(Boolean) : [image];
  const video = $("#formVideoUrl") ? $("#formVideoUrl").value.trim() : "";

  const short_description = $("#formShortDesc").value.trim();
  const full_description = $("#formFullDesc").value.trim();

  const productObj = {
    id: idVal ? Number(idVal) : Date.now(),
    sku,
    name,
    category,
    stock,
    taxMode,
    price,
    mrp,
    gstRate,
    hsn,
    discount: Math.round(((mrp - price) / mrp) * 100),
    scale,
    speed,
    drive,
    image,
    images,
    video,
    short_description,
    full_description
  };

  try {
    const method = idVal ? 'PUT' : 'POST';
    await fetch('/api/products-crud', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productObj)
    });
  } catch(err) {}

  if (idVal) {
    const idx = P.findIndex(p => p.id === Number(idVal));
    if (idx !== -1) P[idx] = productObj;
  } else {
    P.unshift(productObj);
  }

  saveProductsDB(P);
  renderAdminProducts();
  populateAdminCatFilter();
  closeEl($("#productModal"));
  toast(idVal ? `Updated Product "${name}" ✓` : `Created Product "${name}" ✓`);
}

function deleteProduct(id) {
  const p = P.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Delete product "${p.name}" (SKU: ${p.sku})?`)) return;

  fetch(`/api/products-crud?id=${id}`, { method: 'DELETE' }).catch(() => {});

  P = P.filter(x => x.id !== id);
  saveProductsDB(P);
  renderAdminProducts();
  populateAdminCatFilter();
  toast(`Deleted Product #${id} ✓`);
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

document.addEventListener("DOMContentLoaded", () => {
  initAdminAuth();
  initAdminTabs();
  P = loadProductsDB();
  renderAdminProducts();
  renderAdminOrders();
  renderAdminReviews();
  renderAdminCollaborations();
  populateAdminCatFilter();
  initImageUploadHandler();
  initVideoUploadHandler();
  initCollabForm();
  initCsvBulkUploader();
  initSocialPublisher();

  const openAddBtn = $("#btnOpenAddModal");
  if (openAddBtn) openAddBtn.onclick = openAddModal;

  const productForm = $("#productForm");
  if (productForm) productForm.onsubmit = saveProduct;
});
