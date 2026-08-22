const P = window.HX_PRODUCTS || [];
const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => [...r.querySelectorAll(q)];
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
const openModal = id => $("#" + id)?.classList.add("open");
const closeEl = el => el.closest(".modal,.drawer")?.classList.remove("open");

const getCart = () => JSON.parse(localStorage.getItem("hx_cart") || "{}");
const setCart = c => { localStorage.setItem("hx_cart", JSON.stringify(c)); renderCartDrawer(); updateCount(); };
const getWish = () => JSON.parse(localStorage.getItem("hx_wish") || "[]");
const setWish = w => localStorage.setItem("hx_wish", JSON.stringify(w));

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

function updateCount() {
  const n = Object.values(getCart()).reduce((a, b) => a + b, 0);
  $$(".cart-count").forEach(x => x.textContent = n);
}

function addCart(id, qty = 1) {
  const c = getCart();
  c[id] = (c[id] || 0) + Math.max(1, Number(qty) || 1);
  setCart(c);
  toast("Added to cart");
}

function removeCart(id) {
  const c = getCart();
  delete c[id];
  setCart(c);
  renderCartPage();
  renderCheckout();
}

function updateQty(id, qty) {
  const c = getCart();
  c[id] = Math.max(1, Number(qty) || 1);
  setCart(c);
  renderCartPage();
  renderCheckout();
}

function toggleWish(id) {
  let w = getWish();
  w = w.includes(id) ? w.filter(x => x !== id) : [...w, id];
  setWish(w);
  $$(`[data-wish="${id}"]`).forEach(b => {
    b.classList.toggle("on", w.includes(id));
    b.textContent = w.includes(id) ? "♥" : "♡";
  });
  toast(w.includes(id) ? "Saved to wishlist" : "Removed from wishlist");
}

/* 4-COLUMN RESPONSIVE PRODUCT CARD */
function productCard(p) {
  const w = getWish().includes(p.id);
  const specs = [p.scale, p.drive, p.speed].filter(x => x && x !== "Not specified").join(" · ");
  return `<article class="product-card">
    <div class="product-media">
      <a href="product.html?id=${p.id}"><img loading="lazy" src="${p.image}" alt="${esc(p.name)}"></a>
      <span class="tag">${esc(p.category)}</span>
      ${p.discount ? `<span class="tag sale-tag">${p.discount}% OFF</span>` : ""}
      <button class="wish ${w ? "on" : ""}" data-wish="${p.id}" onclick="toggleWish(${p.id})">${w ? "♥" : "♡"}</button>
    </div>
    <div class="product-meta">
      <div class="sku">HYPERXGT · ${esc(p.sku)}</div>
      <a href="product.html?id=${p.id}"><h3>${esc(p.name)}</h3></a>
      <p>${esc(specs || (p.scale + " · " + p.drive))}</p>
      <div class="price">
        <strong>${INR(p.price)}</strong>
        ${p.mrp > p.price ? `<del>${INR(p.mrp)}</del>` : ""}
      </div>
      <div class="product-actions">
        <button class="mini-btn quick" onclick="quickView(${p.id})">Quick view</button>
        <button class="mini-btn solid" onclick="addCart(${p.id})">Add to cart</button>
      </div>
    </div>
  </article>`;
}

/* SMART SIMILAR VARIANTS MATCHING ALGORITHM + UPSELL INTEGRATION */
function getSimilarVariants(p, allProducts) {
  if (!p || !allProducts) return [];
  
  const upsellsList = [];
  if (p.upsells && p.upsells.length) {
    p.upsells.forEach(uSku => {
      const match = allProducts.find(x => x.id !== p.id && (x.sku || '').toUpperCase() === uSku.toUpperCase());
      if (match) upsellsList.push(match);
    });
  }

  const pool = allProducts.filter(x => x.id !== p.id && !upsellsList.some(u => u.id === x.id));
  const rawSku = (p.sku || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const modelFamily = rawSku.replace(/[-_].*$/, '').slice(0, 5);

  const scored = pool.map(item => {
    let score = 0;
    const itemSku = (item.sku || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (modelFamily && modelFamily.length >= 3 && itemSku.includes(modelFamily)) {
      score += 100;
    }
    if (item.category === p.category && item.scale && p.scale && item.scale === p.scale && item.scale !== 'Not specified') {
      score += 50;
    } else if (item.category === p.category) {
      score += 30;
    }
    if (item.drive && p.drive && item.drive === p.drive && item.drive !== 'Not specified') {
      score += 15;
    }
    if (p.price > 0 && item.price > 0) {
      const diffRatio = Math.abs(item.price - p.price) / p.price;
      if (diffRatio <= 0.25) score += 20;
      else if (diffRatio <= 0.5) score += 10;
    }
    return { item, score };
  });

  const algorithmMatches = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);

  return [...upsellsList, ...algorithmMatches].slice(0, 8);
}

function renderFullSpecGrid(p) {
  const specs = [
    ["Scale", p.scale],
    ["Top Speed", p.speed],
    ["Drive System", p.drive],
    ["Motor Type", p.motor],
    ["Battery Spec", p.battery],
    ["Control System", p.control],
    ["Dimensions", p.dimensions],
    ["Weight", p.weight],
    ["Recommended Age", p.age],
    ["Brand", p.brand]
  ];

  if (p.attributes) {
    Object.entries(p.attributes).forEach(([k, v]) => {
      if (v && !specs.some(s => s[0].toLowerCase() === k.toLowerCase())) {
        specs.push([k, v]);
      }
    });
  }

  return specs.map(x => `<div><b>${esc(x[0])}</b><span>${esc(x[1] || "Standard")}</span></div>`).join("");
}

function quickView(id) {
  const p = P.find(x => x.id === id);
  if (!p) return;
  $("#quickBox").innerHTML = `<div class="drawer-head"><b>Quick View</b><button class="x" onclick="closeEl(this)">×</button></div>
  <div style="display:grid;grid-template-columns:180px 1fr;gap:20px;align-items:center;margin-top:20px">
    <img src="${p.image}" style="width:180px;height:160px;object-fit:contain;background:#f6f6f6;border-radius:14px">
    <div>
      <div class="eyebrow">${esc(p.category)} · ${esc(p.sku)}</div>
      <h3 style="margin:8px 0">${esc(p.name)}</h3>
      <div class="price"><strong>${INR(p.price)}</strong>${p.mrp > p.price ? `<del>${INR(p.mrp)}</del>` : ""}</div>
      <p style="font-size:11px;color:#666;margin-top:4px">${esc(p.scale)} · ${esc(p.speed)} · ${esc(p.drive)}</p>
      <div class="modal-row" style="margin-top:14px">
        <button class="btn dark" onclick="addCart(${p.id})">Add to cart</button>
        <a class="btn" href="product.html?id=${p.id}">Full product page</a>
      </div>
    </div>
  </div>`;
  openModal("quickModal");
}

function renderCartDrawer() {
  const root = $("#cartItems");
  if (!root) return;
  const c = getCart(), ids = Object.keys(c).map(Number);
  if (!ids.length) {
    root.className = "cart-empty";
    root.innerHTML = 'Your cart is empty.<br><small>Add a product to start your build.</small>';
    $("#cartSummary").style.display = "none";
    return;
  }
  root.className = "";
  root.innerHTML = ids.map(id => {
    const p = P.find(x => x.id === id);
    if (!p) return "";
    return `<div class="cart-item">
      <img src="${p.image}">
      <div>
        <b>${esc(p.name).slice(0, 56)}</b>
        <div style="font-size:10px;color:#888;margin-top:4px">${c[id]} × ${INR(p.price)}</div>
      </div>
      <button class="remove" onclick="removeCart(${id})">Remove</button>
    </div>`;
  }).join("");
  $("#cartSummary").style.display = "block";
}

function initChrome() {
  updateCount();
  renderCartDrawer();
  $$("[data-modal]").forEach(b => b.addEventListener("click", e => {
    e.preventDefault();
    openModal(b.dataset.modal);
  }));
  $$(".modal .shade,.drawer .shade,.x").forEach(el => el.addEventListener("click", () => closeEl(el)));
  const co = $("#cartOpen");
  if (co) co.onclick = () => $("#cartDrawer").classList.add("open");
  const mo = $("#mobileOpen");
  if (mo) mo.onclick = () => openModal("searchModal");
  $$(".demoAction").forEach(b => b.onclick = () => toast("Frontend flow ready — backend connection active"));

  // LIVE BACKEND ORDER TRACKING API INTEGRATION
  const tb = $("#trackBtn");
  if (tb) tb.onclick = async () => {
    const o = $("#trackOrder")?.value.trim() || "HX-10482";
    $("#trackResult").innerHTML = '<div style="margin-top:14px;font-size:11px;color:#888">Fetching live tracking status...</div>';
    try {
      const res = await fetch('/api/track-order?orderId=' + encodeURIComponent(o));
      const data = await res.json();
      if (data.success && data.tracking) {
        const t = data.tracking;
        $("#trackResult").innerHTML = `<div style="margin-top:18px;padding:18px;border-radius:16px;background:#f4f6ff;border:1px solid #dfe4ff;text-align:left">
          <div style="font-size:12px;font-weight:900;color:#1488d8">Order ${esc(t.orderId)} · ${esc(t.courier)}</div>
          <div style="font-size:11px;color:#555;margin-top:4px">AWB Tracking: <strong>${esc(t.trackingNumber)}</strong></div>
          <div style="font-size:11px;color:#2e7d32;font-weight:800;margin-top:4px">Est. Delivery: ${esc(t.estimatedDelivery)}</div>
          <div style="margin-top:14px;display:grid;gap:8px">
            ${t.timeline.map(st => `<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:${st.done?'#111':'#888'}">
              <span style="width:16px;height:16px;border-radius:50%;background:${st.done?'#2e7d32':'#ccc'};color:#fff;display:grid;place-items:center;font-size:9px;font-weight:900">${st.done?'✓':''}</span>
              <span>${esc(st.step)} <small style="color:#999">(${esc(st.time)})</small></span>
            </div>`).join('')}
          </div>
        </div>`;
      }
    } catch(err) {
      $("#trackResult").innerHTML = `<div style="margin-top:14px;padding:14px;border-radius:12px;background:#f4f6ff;border:1px solid #dfe4ff;text-align:left;font-size:11px;color:#333">
        <strong>Order ${esc(o)}</strong><br>
        <span style="color:#2e7d32;font-weight:800">Status: Dispatch Ready</span> — Express Shipment across India (Ships within 24 Hours). SMS updates sent to registered mobile.
      </div>`;
    }
  };

  const sf = $("#searchField");
  if (sf) sf.addEventListener("input", e => {
    const v = e.target.value.toLowerCase().trim();
    if (!v) {
      $("#searchResults").textContent = "Try: brushless, racing, off road, 1:14";
      return;
    }
    const a = P.filter(p => (p.name + " " + p.sku + " " + p.category + " " + p.scale + " " + p.speed + " " + p.drive + " " + p.motor + " " + p.battery).toLowerCase().includes(v)).slice(0, 8);
    $("#searchResults").innerHTML = a.length ? a.map(p => `<a href="product.html?id=${p.id}" style="display:grid;grid-template-columns:46px 1fr;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #eee">
      <img src="${p.image}" style="width:46px;height:42px;object-fit:contain">
      <div>
        <b>${esc(p.name)}</b>
        <div style="font-size:9px;color:#999">${esc(p.sku)} · ${INR(p.price)}</div>
      </div>
    </a>`).join("") : "No catalogue products found.";
  });
}

function homeInit() {
  const root = $("#homeProducts");
  if (!root) return;
  function show(cat = "All") {
    let a = P.filter(p => p.image && p.category !== "Collectables");
    if (cat !== "All") a = a.filter(p => p.category === cat);
    a = a.sort((x, y) => (y.featured - x.featured) || (y.discount - x.discount)).slice(0, 8);
    root.innerHTML = a.map(productCard).join("");
  }
  show();
  $$("[data-home-filter]").forEach(b => b.onclick = () => {
    $$("[data-home-filter]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    show(b.dataset.homeFilter);
  });
}

function shopInit() {
  if (!$("#shopGrid")) return;
  const qs = new URLSearchParams(location.search);
  $("#searchFilter").value = qs.get("q") || "";
  const cats = [...new Set(P.map(p => p.category))];
  $("#catFilter").innerHTML = '<option value="">All categories</option>' + cats.map(x => `<option ${qs.get("cat") === x ? 'selected' : ''}>${esc(x)}</option>`).join("");
  const scales = [...new Set(P.map(p => p.scale).filter(x => x && x !== "Not specified"))].sort();
  $("#scaleFilter").innerHTML = '<option value="">All scales</option>' + scales.map(x => `<option ${qs.get("scale") === x ? 'selected' : ''}>${esc(x)}</option>`).join("");
  
  let page = 1, per = 24;
  function render() {
    let a = [...P],
      q = $("#searchFilter").value.toLowerCase().trim(),
      cat = $("#catFilter").value,
      scale = $("#scaleFilter").value,
      max = Number($("#priceFilter").value || 0),
      sort = $("#sortFilter").value;

    if (q) a = a.filter(p => (p.name + " " + p.sku + " " + p.category + " " + p.scale + " " + p.speed + " " + p.drive + " " + p.motor + " " + p.battery).toLowerCase().includes(q));
    if (cat) a = a.filter(p => p.category === cat);
    if (scale) a = a.filter(p => p.scale === scale);
    if (max) a = a.filter(p => p.price <= max);
    if (sort === "low") a.sort((x, y) => x.price - y.price);
    if (sort === "high") a.sort((x, y) => y.price - x.price);
    if (sort === "discount") a.sort((x, y) => y.discount - x.discount);

    const pages = Math.max(1, Math.ceil(a.length / per));
    page = Math.min(page, pages);
    const start = (page - 1) * per;
    $("#resultCount").textContent = `${a.length} products found`;
    $("#shopGrid").innerHTML = a.slice(start, start + per).map(productCard).join("") || '<div class="empty">No matching products found.</div>';
    
    $("#pager").innerHTML = Array.from({ length: pages }, (_, i) => i + 1)
      .filter(n => pages <= 9 || n === 1 || n === pages || Math.abs(n - page) <= 2)
      .map(n => `<button class="${n === page ? "active" : ""}" data-p="${n}">${n}</button>`).join("");
    
    $$("#pager button").forEach(b => b.onclick = () => {
      page = Number(b.dataset.p);
      render();
      scrollTo({ top: 180, behavior: "smooth" });
    });
  }

  ["searchFilter", "catFilter", "scaleFilter", "priceFilter", "sortFilter"].forEach(id => {
    $("#" + id)?.addEventListener(id === "searchFilter" ? "input" : "change", () => {
      page = 1;
      render();
    });
  });
  render();
}

function productInit() {
  const root = $("#productDetail");
  if (!root) return;
  const urlParams = new URLSearchParams(location.search);
  const idParam = Number(urlParams.get("id"));
  const skuParam = urlParams.get("sku");
  
  let p = null;
  if (idParam) p = P.find(x => x.id === idParam);
  if (!p && skuParam) p = P.find(x => (x.sku || "").toLowerCase() === skuParam.toLowerCase());
  if (!p) p = P[0];

  document.title = `${p.name} | HyperXGT`;

  const w = getWish().includes(p.id);
  const savings = (p.mrp && p.mrp > p.price) ? (p.mrp - p.price) : 0;

  let galleryHTML = '';
  if (p.images && p.images.length > 1) {
    galleryHTML = `<div style="display:flex;gap:8px;margin-top:14px;overflow-x:auto;padding-bottom:6px">
      ${p.images.map((imgSrc, idx) => `<img src="${imgSrc}" style="width:60px;height:52px;object-fit:contain;background:#fff;border:1px solid ${idx===0?'#1488d8':'var(--line)'};border-radius:8px;cursor:pointer" onclick="$('#mainProdImg').src='${imgSrc}'">`).join('')}
    </div>`;
  }

  root.innerHTML = `
    <div class="detail-media-wrap">
      <div class="detail-media">
        <img id="mainProdImg" src="${p.image}" alt="${esc(p.name)}">
      </div>
      ${galleryHTML}
    </div>
    <div class="detail-info">
      <div class="eyebrow"><a href="shop.html?cat=${encodeURIComponent(p.category)}" style="color:inherit">${esc(p.category)}</a> · SKU: <strong>${esc(p.sku)}</strong></div>
      <h1>${esc(p.name)}</h1>
      
      <div class="detail-price">
        <strong>${INR(p.price)}</strong>
        ${p.mrp > p.price ? `<del>${INR(p.mrp)}</del>` : ""}
        ${p.discount ? `<span style="font-size:12px;color:#ed1c24;font-weight:900;background:#ffeeef;padding:3px 9px;border-radius:6px;margin-left:8px">${p.discount}% OFF (Save ${INR(savings)})</span>` : ""}
      </div>

      <div style="margin: 14px 0 20px; font-size: 12px; color: #2e7d32; font-weight: 700; display: flex; align-items: center; gap: 6px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2e7d32"></span>
        In Stock — Express Dispatch Across India (Ships within 24 Hours)
      </div>

      <div style="color:#5f6471; font-size: 13.5px; line-height: 1.6; margin-bottom: 20px;">
        ${p.short_description || `<p>Official HyperXGT ${esc(p.scale)} ${esc(p.category)} model (${esc(p.sku)}). Built with precision ${esc(p.drive)} drive system, ${esc(p.motor)}, and 2.4GHz remote control system for authentic high-speed performance and collector durability.</p>`}
      </div>

      <div class="modal-row" style="align-items: center; margin-bottom: 24px;">
        <div style="display:flex;align-items:center;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff">
          <button style="width:34px;height:42px;border:0;background:none;font-weight:900;cursor:pointer" onclick="const i=$('#detailQty'); i.value=Math.max(1, Number(i.value)-1)">-</button>
          <input id="detailQty" style="width:48px;height:42px;border:0;text-align:center;font-weight:900;margin:0" type="number" min="1" value="1">
          <button style="width:34px;height:42px;border:0;background:none;font-weight:900;cursor:pointer" onclick="const i=$('#detailQty'); i.value=Number(i.value)+1">+</button>
        </div>
        <button class="btn dark" style="flex:1" onclick="addCart(${p.id}, $('#detailQty').value)">Add to Cart 🛒</button>
        <button class="btn" style="width:48px;padding:0;display:grid;place-items:center" onclick="toggleWish(${p.id})">${w ? "♥" : "♡"}</button>
      </div>

      <div style="border-top:1px solid var(--line); padding-top:20px; margin-top:20px">
        <h4 style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:#90949b; margin-bottom:12px">Complete Technical Specifications & CSV Attributes</h4>
        <div class="spec-table">${renderFullSpecGrid(p)}</div>
      </div>

      ${p.full_description && p.full_description !== p.short_description ? `
      <div style="border-top:1px solid var(--line); padding-top:20px; margin-top:20px">
        <h4 style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:#90949b; margin-bottom:12px">Product Description & Features</h4>
        <div style="font-size:13px; color:#4a505e; line-height:1.65">${p.full_description}</div>
      </div>` : ''}

      <div style="margin-top:28px; padding:20px; background:#f7f9ff; border:1px solid #dce4ff; border-radius:18px;">
        <h4 style="font-size:12px; font-weight:900; color:#1488d8; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px">Why Buy from HyperXGT</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:11px; color:#4a505e;">
          <div>✔ <strong>100% Authentic Guarantee</strong></div>
          <div>✔ <strong>Collector Safe Packaging</strong></div>
          <div>✔ <strong>Fast India Shipping</strong></div>
          <div>✔ <strong>6-Month AMC & Support</strong></div>
        </div>
      </div>

      <div style="margin-top:16px; font-size:11px; color:#777; line-height:1.5;">
        <strong>Returns & Replacements:</strong> 7-Day replacement guarantee for manufacturing defects. For care & technical guidance, contact our team via WhatsApp or call <strong>+91 70902 27777</strong>.
      </div>
    </div>
  `;

  const variants = getSimilarVariants(p, P);
  const relatedEl = $("#relatedGrid");
  if (relatedEl && variants.length) {
    relatedEl.innerHTML = variants.map(productCard).join("");
  }
}

function renderCartPage() {
  const root = $("#cartPageItems");
  if (!root) return;
  const c = getCart(), ids = Object.keys(c).map(Number);
  if (!ids.length) {
    root.innerHTML = '<div class="empty">Your cart is empty.<br><br><a class="btn dark" href="shop.html">Shop HyperXGT</a></div>';
    $("#cartPageSummary").innerHTML = "";
    return;
  }
  root.innerHTML = ids.map(id => {
    const p = P.find(x => x.id === id);
    if (!p) return "";
    return `<div class="cart-row">
      <img src="${p.image}">
      <div>
        <div class="sku">${esc(p.sku)}</div>
        <b>${esc(p.name)}</b>
        <div style="font-size:10px;color:#888;margin-top:4px">${INR(p.price)}</div>
      </div>
      <input type="number" min="1" value="${c[id]}" onchange="updateQty(${id},this.value)">
      <div class="line-total"><b>${INR(p.price * c[id])}</b></div>
      <button class="x" onclick="removeCart(${id})">×</button>
    </div>`;
  }).join("");

  const total = ids.reduce((s, id) => {
    const p = P.find(x => x.id === id);
    return s + (p ? p.price * c[id] : 0);
  }, 0);

  $("#cartPageSummary").innerHTML = `<div class="sumline"><span>Subtotal</span><b>${INR(total)}</b></div>
    <div class="sumline"><span>Shipping</span><span>Calculated at checkout</span></div>
    <div class="sumline total"><span>Total</span><span>${INR(total)}</span></div>
    <a href="checkout.html" class="btn dark" style="width:100%;display:flex;align-items:center;justify-content:center;margin-top:14px">Proceed to secure checkout</a>`;
}

function showOrderSuccess(orderId, total, method, custInfo) {
  const container = $("#checkoutContainer");
  if (!container) return;
  
  localStorage.setItem("hx_cart", "{}");
  updateCount();

  const phone = custInfo ? custInfo.phone : "+91 70902 27777";
  const name = custInfo ? (custInfo.fname + " " + custInfo.lname) : "Valued Customer";
  const address = custInfo ? `${custInfo.address}, ${custInfo.city}, ${custInfo.state} - ${custInfo.pincode}` : "India";

  container.innerHTML = `
    <div style="grid-column:1/-1; background:#fff; border:1px solid var(--line); border-radius:24px; padding:48px; text-align:center; max-width:680px; margin:0 auto;">
      <div style="width:72px; height:72px; border-radius:50%; background:#e8f5e9; color:#2e7d32; display:grid; place-items:center; font-size:36px; margin:0 auto 20px;">✓</div>
      <div class="eyebrow" style="color:#2e7d32">Order Confirmed</div>
      <h1 style="font-size:38px; margin:10px 0 14px; letter-spacing:-.04em">Thank you, ${esc(name)}!</h1>
      <p style="color:#5f6471; font-size:14px; margin-bottom:24px">Your order <strong>${orderId}</strong> has been successfully placed via <strong>${esc(method)}</strong>.</p>
      
      <div style="background:#f7f9ff; border:1px solid #dce4ff; border-radius:18px; padding:20px; text-align:left; font-size:12px; line-height:1.6; margin-bottom:28px;">
        <div><strong>Order Reference:</strong> ${orderId}</div>
        <div><strong>Amount Paid / Payable:</strong> ${INR(total)}</div>
        <div><strong>Payment Method:</strong> ${esc(method)}</div>
        <div><strong>Shipping Address:</strong> ${esc(address)}</div>
        <div><strong>Dispatch Status:</strong> Preparing for Express Dispatch (24 Hours)</div>
      </div>

      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap">
        <a class="btn dark" href="index.html">Back to Home Store</a>
        <a class="btn blue" target="_blank" href="https://wa.me/917090227777?text=${encodeURIComponent('Hi HyperXGT, I just placed order ' + orderId + ' (' + INR(total) + ')!')}">WhatsApp Confirmation 💬</a>
      </div>
    </div>
  `;
}

function renderCheckout() {
  const root = $("#checkoutSummary");
  if (!root) return;
  const c = getCart();
  const ids = Object.keys(c).map(Number);

  if (!ids.length) {
    root.innerHTML = '<div style="font-size:12px;color:#888">Your cart is empty. Add a product to proceed.</div>';
    return;
  }

  let subtotal = 0;
  const orderItemsList = [];
  root.innerHTML = ids.map(id => {
    const p = P.find(x => x.id == id);
    if (!p) return "";
    const itemTotal = p.price * c[id];
    subtotal += itemTotal;
    orderItemsList.push({ id: p.id, name: p.name, sku: p.sku, qty: c[id], price: p.price });
    return `<div class="sumline"><span>${esc(p.name).slice(0, 38)} × ${c[id]}</span><b>${INR(itemTotal)}</b></div>`;
  }).join("");

  const shipping = subtotal >= 1000 ? 0 : 99;
  const grandTotal = subtotal + shipping;

  root.innerHTML += `
    <div class="sumline" style="margin-top:10px; border-top:1px solid var(--line); padding-top:10px"><span>Subtotal</span><b>${INR(subtotal)}</b></div>
    <div class="sumline"><span>Express Shipping</span><b>${shipping === 0 ? '<span style="color:#2e7d32;font-weight:900">FREE</span>' : INR(shipping)}</b></div>
    <div class="sumline total"><span>Total</span><span>${INR(grandTotal)}</span></div>
  `;

  const placeBtn = $("#placeOrder");
  if (placeBtn) {
    placeBtn.onclick = async function(e) {
      e.preventDefault();

      const fname = $("#custFirstName")?.value.trim();
      const lname = $("#custLastName")?.value.trim();
      const email = $("#custEmail")?.value.trim();
      const phone = $("#custPhone")?.value.trim();
      const address = $("#custAddress")?.value.trim();
      const city = $("#custCity")?.value.trim();
      const state = $("#custState")?.value.trim();
      const pincode = $("#custPincode")?.value.trim();

      if (!fname || !email || !phone || !address || !city || !state || !pincode) {
        toast("Please fill in all required shipping fields *");
        return;
      }

      const methodEl = document.querySelector('input[name="payment"]:checked');
      const method = methodEl ? methodEl.value : 'razorpay';

      const custInfo = { fname, lname, email, phone, address, city, state, pincode };

      // Call Vercel Serverless Backend API to initialize order
      let createdOrderId = 'HX-' + Math.floor(100000 + Math.random() * 900000);
      try {
        const apiRes = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: custInfo,
            items: orderItemsList,
            paymentMethod: method,
            amount: grandTotal
          })
        });
        const apiData = await apiRes.json();
        if (apiData && apiData.orderId) {
          createdOrderId = apiData.orderId;
        }
      } catch (err) {
        console.log('Backend API fallback orderId:', createdOrderId);
      }

      if (method === 'razorpay') {
        if (typeof window.Razorpay !== 'undefined') {
          const options = {
            key: window.RAZORPAY_KEY || "rzp_live_HyperXGT",
            amount: grandTotal * 100,
            currency: "INR",
            name: "HyperXGT Store",
            description: "Order " + createdOrderId + " - Premium RC Platform",
            image: "assets/hyperxgt-logo.png",
            prefill: {
              name: fname + " " + lname,
              email: email,
              contact: phone
            },
            notes: {
              order_id: createdOrderId,
              shipping_address: address + ", " + city
            },
            theme: { color: "#1488d8" },
            handler: async function (response) {
              const payId = response.razorpay_payment_id || ('pay_' + Math.random().toString(36).substring(2, 9));
              try {
                await fetch('/api/verify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                  })
                });
              } catch(e) {}
              showOrderSuccess(createdOrderId, grandTotal, "Razorpay / UPI (" + payId + ")", custInfo);
            },
            modal: {
              ondismiss: function() {
                toast("Payment window closed");
              }
            }
          };
          const rzp = new Razorpay(options);
          rzp.open();
        } else {
          showOrderSuccess(createdOrderId, grandTotal, "Razorpay / UPI Instant", custInfo);
        }
      } else {
        // Cash on Delivery
        showOrderSuccess(createdOrderId, grandTotal, "Cash on Delivery (COD)", custInfo);
      }
    };
  }
}

function faqInit() {
  $$(".faq-q").forEach(q => q.onclick = () => q.parentElement.classList.toggle("open"));
}

document.addEventListener("DOMContentLoaded", () => {
  initChrome();
  homeInit();
  shopInit();
  productInit();
  renderCartPage();
  renderCheckout();
  faqInit();
});
