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

// LOCAL STORAGE STORAGE HELPERS
const getCart = () => JSON.parse(localStorage.getItem("hx_cart") || "{}");
const setCart = c => localStorage.setItem("hx_cart", JSON.stringify(c));
const getWish = () => JSON.parse(localStorage.getItem("hx_wish") || "[]");
const setWish = w => localStorage.setItem("hx_wish", JSON.stringify(w));

function addCart(id, qty = 1) {
  const p = P.find(x => x.id === id);
  if (!p) return;

  const stock = p.stock !== undefined ? p.stock : 25;
  if (stock === 0) {
    toast(`Sorry, "${p.name}" is currently Out of Stock.`);
    return;
  }

  const c = getCart();
  const currentInCart = c[id] || 0;
  const newQty = currentInCart + Number(qty);

  if (newQty > stock) {
    toast(`Only ${stock} units available in stock for "${p.name}".`);
    c[id] = stock;
  } else {
    c[id] = newQty;
    toast(`Added ${qty} × "${p.name}" to cart ✓`);
  }

  setCart(c);
  updateCount();
  renderCartDrawer();
}

function removeCart(id) {
  const c = getCart();
  delete c[id];
  setCart(c);
  updateCount();
  renderCartDrawer();
  if (typeof renderCartPage === "function") renderCartPage();
}

function setQty(id, q) {
  const p = P.find(x => x.id === id);
  const stock = p && p.stock !== undefined ? p.stock : 25;

  const c = getCart();
  if (q <= 0) {
    delete c[id];
  } else if (q > stock) {
    toast(`Max available stock for this model is ${stock} units.`);
    c[id] = stock;
  } else {
    c[id] = Number(q);
  }

  setCart(c);
  updateCount();
  renderCartDrawer();
  if (typeof renderCartPage === "function") renderCartPage();
}

function updateCount() {
  const c = getCart();
  const count = Object.values(c).reduce((a, b) => a + b, 0);
  $$(".cart-count").forEach(el => el.textContent = count);
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

/* 4-COLUMN RESPONSIVE PRODUCT CARD WITH REAL-TIME STOCK BADGES */
function productCard(p) {
  const w = getWish().includes(p.id);
  const specs = [p.scale, p.drive, p.speed].filter(x => x && x !== "Not specified").join(" · ");
  
  // Real-time Stock Badge
  const stock = p.stock !== undefined ? p.stock : 25;
  let stockBadgeHTML = `<span style="font-size:10px;font-weight:900;color:#2e7d32;display:block;margin-top:4px">🟢 In Stock (${stock} Units)</span>`;
  let buyBtnHTML = `<button class="mini-btn solid" onclick="addCart(${p.id})">Add to cart</button>`;

  if (stock === 0) {
    stockBadgeHTML = `<span style="font-size:10px;font-weight:900;color:#ed1c24;display:block;margin-top:4px">🔴 Out of Stock (Sold Out)</span>`;
    buyBtnHTML = `<button class="mini-btn solid" style="background:#888;cursor:not-allowed" disabled>Out of Stock</button>`;
  } else if (stock <= 5) {
    stockBadgeHTML = `<span style="font-size:10px;font-weight:900;color:#b78103;display:block;margin-top:4px">🟡 Only ${stock} Units Left!</span>`;
  }

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
      ${stockBadgeHTML}
      <div class="price" style="margin-top:6px">
        <strong>${INR(p.price)}</strong>
        ${p.mrp > p.price ? `<del>${INR(p.mrp)}</del>` : ""}
      </div>
      <div class="product-actions">
        <button class="mini-btn quick" onclick="quickView(${p.id})">Quick view</button>
        ${buyBtnHTML}
      </div>
    </div>
  </article>`;
}

/* SMART SIMILAR VARIANTS MATCHING ALGORITHM */
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

    if (modelFamily && modelFamily.length >= 3 && itemSku.includes(modelFamily)) score += 100;
    if (item.category === p.category && item.scale && p.scale && item.scale === p.scale) score += 50;
    else if (item.category === p.category) score += 30;

    return { item, score };
  });

  const algorithmMatches = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.item);
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

  return specs.map(x => `<div><b>${esc(x[0])}</b><span>${esc(x[1] || "Standard")}</span></div>`).join("");
}

function quickView(id) {
  const p = P.find(x => x.id === id);
  if (!p) return;

  const stock = p.stock !== undefined ? p.stock : 25;
  let stockBadge = `<span style="font-size:11px;font-weight:900;color:#2e7d32">🟢 In Stock (${stock} Units)</span>`;
  let btnHTML = `<button class="btn dark" onclick="addCart(${p.id})">Add to Cart 🛒</button>`;
  
  if (stock === 0) {
    stockBadge = `<span style="font-size:11px;font-weight:900;color:#ed1c24">🔴 Out of Stock</span>`;
    btnHTML = `<button class="btn dark" style="background:#888;cursor:not-allowed" disabled>Out of Stock</button>`;
  } else if (stock <= 5) {
    stockBadge = `<span style="font-size:11px;font-weight:900;color:#b78103">🟡 Only ${stock} Left!</span>`;
  }

  $("#quickBox").innerHTML = `<div class="drawer-head"><b>Quick View</b><button class="x" onclick="closeEl(this)">×</button></div>
  <div style="display:grid;grid-template-columns:180px 1fr;gap:20px;align-items:center;margin-top:20px">
    <img src="${p.image}" style="width:180px;height:160px;object-fit:contain;background:#f6f6f6;border-radius:14px">
    <div>
      <div class="eyebrow">${esc(p.category)} · ${esc(p.sku)}</div>
      <h3 style="margin:8px 0">${esc(p.name)}</h3>
      <div style="margin-bottom:8px">${stockBadge}</div>
      <div class="price"><strong>${INR(p.price)}</strong>${p.mrp > p.price ? `<del>${INR(p.mrp)}</del>` : ""}</div>
      <p style="font-size:11px;color:#666;margin-top:4px">${esc(p.scale)} · ${esc(p.speed)} · ${esc(p.drive)}</p>
      <div class="modal-row" style="margin-top:14px">
        ${btnHTML}
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
    root.innerHTML = '<div class="empty">Your cart is currently empty.</div>';
    $("#cartSummary").style.display = "none";
    return;
  }

  let subtotal = 0;
  root.innerHTML = ids.map(id => {
    const p = P.find(x => x.id === id);
    if (!p) return "";
    const qty = c[id];
    const itemTotal = p.price * qty;
    subtotal += itemTotal;
    const stock = p.stock !== undefined ? p.stock : 25;

    return `<div class="cart-item">
      <img src="${p.image}" alt="${esc(p.name)}">
      <div>
        <b>${esc(p.name)}</b>
        <div style="font-size:10px;color:#666">${esc(p.sku)} · ${stock > 0 ? `In Stock (${stock} avail)` : 'Out of stock'}</div>
        <div class="price" style="margin-top:4px"><strong>${INR(p.price)}</strong> × ${qty} = ${INR(itemTotal)}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
          <button class="qty-btn" onclick="setQty(${id}, ${qty - 1})">-</button>
          <span style="font-size:12px;font-weight:900">${qty}</span>
          <button class="qty-btn" onclick="setQty(${id}, ${qty + 1})">+</button>
        </div>
      </div>
      <button class="remove" onclick="removeCart(${id})">Remove</button>
    </div>`;
  }).join("");

  $("#cartSummary").style.display = "block";
  if ($("#cartSubtotal")) $("#cartSubtotal").textContent = INR(subtotal);
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

  // LIVE BACKEND ORDER TRACKING
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
        </div>`;
      }
    } catch(err) {}
  };
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

  function render() {
    let a = [...P];
    const q = $("#searchFilter").value.toLowerCase().trim();
    if (q) a = a.filter(p => (p.name + " " + p.sku + " " + p.category).toLowerCase().includes(q));

    $("#shopCount").textContent = `${a.length} products found`;
    $("#shopGrid").innerHTML = a.map(productCard).join("");
  }

  $("#searchFilter").addEventListener("input", render);
  render();
}

function productInit() {
  const root = $("#productDetail");
  if (!root) return;

  const qs = new URLSearchParams(location.search);
  const id = Number(qs.get("id")) || 71;
  const p = P.find(x => x.id === id) || P[0];

  if (!p) {
    root.innerHTML = '<div class="empty">Product not found.</div>';
    return;
  }

  document.title = `${p.name} — HyperXGT`;

  const w = getWish().includes(p.id);
  const savings = Math.max(0, p.mrp - p.price);
  const stock = p.stock !== undefined ? p.stock : 25;

  let stockStatusHTML = `<div style="margin: 14px 0 20px; font-size: 12px; color: #2e7d32; font-weight: 700; display: flex; align-items: center; gap: 6px;">
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2e7d32"></span>
    🟢 In Stock — <strong>${stock} Units Available</strong> for Express Dispatch (Ships within 24 Hours)
  </div>`;
  let buyDetailBtn = `<button class="btn dark" style="flex:1" onclick="addCart(${p.id}, $('#detailQty').value)">Add to Cart 🛒</button>`;

  if (stock === 0) {
    stockStatusHTML = `<div style="margin: 14px 0 20px; font-size: 12px; color: #ed1c24; font-weight: 700; display: flex; align-items: center; gap: 6px;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ed1c24"></span>
      🔴 Currently Out of Stock (Sold Out)
    </div>`;
    buyDetailBtn = `<button class="btn dark" style="flex:1;background:#888;cursor:not-allowed" disabled>Out of Stock 🚫</button>`;
  } else if (stock <= 5) {
    stockStatusHTML = `<div style="margin: 14px 0 20px; font-size: 12px; color: #b78103; font-weight: 700; display: flex; align-items: center; gap: 6px;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#b78103"></span>
      🟡 Low Stock Alert — <strong>Only ${stock} Units Remaining!</strong> Order soon.
    </div>`;
  }

  root.innerHTML = `
    <div class="detail-media-wrap">
      <div class="detail-media">
        <img id="mainProdImg" src="${p.image}" alt="${esc(p.name)}">
      </div>
    </div>
    <div class="detail-info">
      <div class="eyebrow"><a href="shop.html?cat=${encodeURIComponent(p.category)}" style="color:inherit">${esc(p.category)}</a> · SKU: <strong>${esc(p.sku)}</strong></div>
      <h1>${esc(p.name)}</h1>
      
      <div class="detail-price">
        <strong>${INR(p.price)}</strong>
        ${p.mrp > p.price ? `<del>${INR(p.mrp)}</del>` : ""}
        ${p.discount ? `<span style="font-size:12px;color:#ed1c24;font-weight:900;background:#ffeeef;padding:3px 9px;border-radius:6px;margin-left:8px">${p.discount}% OFF</span>` : ""}
      </div>

      ${stockStatusHTML}

      <div style="color:#5f6471; font-size: 13.5px; line-height: 1.6; margin-bottom: 20px;">
        ${p.short_description || `Official HyperXGT ${esc(p.scale)} ${esc(p.category)} model.`}
      </div>

      <div class="modal-row" style="align-items: center; margin-bottom: 24px;">
        <div style="display:flex;align-items:center;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff">
          <button style="width:34px;height:42px;border:0;background:none;font-weight:900;cursor:pointer" onclick="const i=$('#detailQty'); i.value=Math.max(1, Number(i.value)-1)">-</button>
          <input id="detailQty" style="width:48px;height:42px;border:0;text-align:center;font-weight:900;margin:0" type="number" min="1" max="${stock}" value="1">
          <button style="width:34px;height:42px;border:0;background:none;font-weight:900;cursor:pointer" onclick="const i=$('#detailQty'); i.value=Math.min(${stock}, Number(i.value)+1)">+</button>
        </div>
        ${buyDetailBtn}
        <button class="btn" style="width:48px;padding:0;display:grid;place-items:center" onclick="toggleWish(${p.id})">${w ? "♥" : "♡"}</button>
      </div>

      <div style="border-top:1px solid var(--line); padding-top:20px; margin-top:20px">
        <h4 style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:#90949b; margin-bottom:12px">Complete Technical Specifications</h4>
        <div class="spec-table">${renderFullSpecGrid(p)}</div>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  initChrome();
  homeInit();
  shopInit();
  productInit();
});
