// Master Application Logic for HYPER X GT Web Portal - OGMini Diecast & RC Motorsport UI/UX
(function() {
  const products = window.HYPERXGT_PRODUCTS || [];
  const categories = window.HYPERXGT_CATEGORIES || [];

  let state = {
    searchQuery: '',
    selectedCategory: 'All',
    selectedScale: 'All',
    selectedDrive: 'All',
    sortBy: 'featured',
    cart: [],
    wishlist: [],
    compareList: [],
    currency: 'INR',
    usdRate: 0.012,
    theme: 'dark',
    user: null
  };

  // DOM Elements
  const productsContainer = document.getElementById('productsGrid');
  const searchInput = document.getElementById('searchInput');
  const liveSearchResults = document.getElementById('liveSearchResults');
  const categoryPillsContainer = document.getElementById('categoryPills');
  const scalePillsContainer = document.getElementById('scalePills');
  const drivePillsContainer = document.getElementById('drivePills');
  const sortSelect = document.getElementById('sortSelect');
  const cartBadge = document.getElementById('cartBadge');
  const compareBadge = document.getElementById('compareBadge');
  const currencyToggleBtn = document.getElementById('currencyToggle');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalContent = document.getElementById('modalContent');
  const compareDrawer = document.getElementById('compareDrawer');
  const compareGrid = document.getElementById('compareGrid');

  const authModalBackdrop = document.getElementById('authModalBackdrop');
  const accountBtnText = document.getElementById('accountBtnText');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');

  const mobileDrawer = document.getElementById('mobileDrawer');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartDrawerBody = document.getElementById('cartDrawerBody');
  const cartSubtotal = document.getElementById('cartSubtotal');

  // Initialize App
  function init() {
    loadSavedUser();
    renderCategoryPills();
    renderScalePills();
    renderDrivePills();
    renderProducts();
    setupEventListeners();
  }

  // Load Saved User Profile
  function loadSavedUser() {
    try {
      const savedUser = localStorage.getItem('hyperxgt_user');
      if (savedUser) {
        state.user = JSON.parse(savedUser);
        updateAccountNavBtn();
      }
    } catch(e) {}
  }

  function updateAccountNavBtn() {
    if (!accountBtnText) return;
    if (state.user) {
      accountBtnText.textContent = state.user.name.split(' ')[0];
    } else {
      accountBtnText.textContent = 'Login';
    }
  }

  // Auth Modal Functions
  function openAuthModal() {
    if (state.user) {
      if (confirm(`Logged in as ${state.user.name} (${state.user.email}). Do you want to log out?`)) {
        state.user = null;
        localStorage.removeItem('hyperxgt_user');
        updateAccountNavBtn();
        showNotification('Logged out successfully.');
      }
      return;
    }
    if (authModalBackdrop) authModalBackdrop.classList.add('active');
  }

  function closeAuthModal() {
    if (authModalBackdrop) authModalBackdrop.classList.remove('active');
  }

  function switchAuthTab(tab) {
    if (tab === 'login') {
      if (loginForm) loginForm.style.display = 'block';
      if (signupForm) signupForm.style.display = 'none';
      if (tabLogin) tabLogin.classList.add('active');
      if (tabSignup) tabSignup.classList.remove('active');
    } else {
      if (loginForm) loginForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'block';
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabSignup) tabSignup.classList.add('active');
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value || 'Racer User';
    state.user = { name: email.split('@')[0], email: email };
    localStorage.setItem('hyperxgt_user', JSON.stringify(state.user));
    updateAccountNavBtn();
    closeAuthModal();
    showNotification(`Welcome back, ${state.user.name}! 🏎️`);
  }

  function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName')?.value || 'New Driver';
    const email = document.getElementById('signupEmail')?.value || 'driver@hyperxgt.com';
    state.user = { name: name, email: email };
    localStorage.setItem('hyperxgt_user', JSON.stringify(state.user));
    updateAccountNavBtn();
    closeAuthModal();
    showNotification(`Account created! Welcome to the Grid, ${name}! 🏎️`);
  }

  function demoLogin(provider) {
    state.user = { name: `Driver (${provider})`, email: `driver@${provider.toLowerCase()}.com` };
    localStorage.setItem('hyperxgt_user', JSON.stringify(state.user));
    updateAccountNavBtn();
    closeAuthModal();
    showNotification(`Logged in via ${provider}!`);
  }

  // Currency Formatter
  function formatPrice(amountINR) {
    if (!amountINR || isNaN(amountINR)) return '₹0';
    if (state.currency === 'USD') {
      const usdAmount = (amountINR * state.usdRate).toFixed(2);
      return `$${usdAmount}`;
    } else {
      return `₹${amountINR.toLocaleString('en-IN')}`;
    }
  }

  // Render Category Filter Pills (OGMini Style)
  function renderCategoryPills() {
    if (!categoryPillsContainer) return;
    const catList = ['All', ...categories.map(c => c.name)];
    
    categoryPillsContainer.innerHTML = catList.map(cat => `
      <button class="pill-btn ${state.selectedCategory === cat ? 'active' : ''}" data-cat="${cat}">
        ${cat}
      </button>
    `).join('');

    categoryPillsContainer.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        state.selectedCategory = e.target.getAttribute('data-cat');
        renderCategoryPills();
        renderProducts();
      });
    });
  }

  // Category Quick Click
  function filterCategory(catName) {
    state.selectedCategory = catName;
    renderCategoryPills();
    renderProducts();
    const machinesSection = document.getElementById('machines');
    if (machinesSection) machinesSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Render Scale Pills (OGMini Style)
  function renderScalePills() {
    if (!scalePillsContainer) return;
    const scales = ['All', '1:10', '1:14', '1:18', '1:24', '1:28', '1:64'];
    scalePillsContainer.innerHTML = scales.map(scale => `
      <button class="pill-btn ${state.selectedScale === scale ? 'active' : ''}" data-scale="${scale}">
        Scale ${scale}
      </button>
    `).join('');

    scalePillsContainer.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        state.selectedScale = e.target.getAttribute('data-scale');
        renderScalePills();
        renderProducts();
      });
    });
  }

  // Render Drive Pills
  function renderDrivePills() {
    if (!drivePillsContainer) return;
    const drives = ['All', '4WD', '2WD', 'RWD'];
    drivePillsContainer.innerHTML = drives.map(drive => `
      <button class="pill-btn ${state.selectedDrive === drive ? 'active' : ''}" data-drive="${drive}">
        ${drive}
      </button>
    `).join('');

    drivePillsContainer.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        state.selectedDrive = e.target.getAttribute('data-drive');
        renderDrivePills();
        renderProducts();
      });
    });
  }

  // Filter & Sort Engine
  function getFilteredProducts() {
    return products.filter(p => {
      if (state.selectedCategory !== 'All' && p.category !== state.selectedCategory) return false;
      if (state.selectedScale !== 'All' && !p.scale.includes(state.selectedScale)) return false;
      if (state.selectedDrive !== 'All' && !p.drive.includes(state.selectedDrive)) return false;
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        const matchMotor = p.motor.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat && !matchMotor) return false;
      }
      return true;
    }).sort((a, b) => {
      if (state.sortBy === 'price-low') return a.sale_price - b.sale_price;
      if (state.sortBy === 'price-high') return b.sale_price - a.sale_price;
      if (state.sortBy === 'discount') return b.discount_pct - a.discount_pct;
      if (state.sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });
  }

  // Render Product Grid (OGMini Card Style)
  function renderProducts() {
    if (!productsContainer) return;
    const filtered = getFilteredProducts();

    if (filtered.length === 0) {
      productsContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
          <div style="font-size: 48px; margin-bottom: 16px;">🏎️</div>
          <h3 style="font-size: 24px; color: var(--text-primary);">No Matching Machines Found</h3>
          <p style="color: var(--text-muted); margin-top: 8px;">Try resetting your search query or filter tags to view available stock.</p>
          <button id="resetFiltersBtn" class="btn-primary" style="margin-top: 20px;">Reset All Filters</button>
        </div>
      `;
      document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
        state.searchQuery = '';
        state.selectedCategory = 'All';
        state.selectedScale = 'All';
        state.selectedDrive = 'All';
        if (searchInput) searchInput.value = '';
        renderCategoryPills();
        renderScalePills();
        renderDrivePills();
        renderProducts();
      });
      return;
    }

    productsContainer.innerHTML = filtered.map(p => {
      const isCompared = state.compareList.some(item => item.id === p.id);
      return `
        <div class="product-card">
          <div>
            <div class="card-top-bar">
              ${p.discount_pct > 0 ? `<span class="badge-discount">${p.discount_pct}% OFF</span>` : `<span></span>`}
              <span class="badge-scale">${p.scale} SCALE</span>
            </div>

            <div class="prod-img-box" onclick="window.HYPERXGT.openQuickView(${p.id})">
              <img src="${p.main_image}" alt="${p.name}" loading="lazy" />
              <div class="quick-view-overlay">
                <span class="quick-view-btn">Quick Specs</span>
              </div>
            </div>

            <div class="prod-category-tag">${p.category}</div>
            <h3 class="prod-title" title="${p.name}">${p.name}</h3>

            <div class="prod-specs-pills">
              <span class="mini-pill">Drive: <strong>${p.drive}</strong></span>
              <span class="mini-pill">Speed: <strong>${p.speed}</strong></span>
              <span class="mini-pill">Rating: <strong>⭐ ${p.rating}</strong></span>
            </div>
          </div>

          <div>
            <div class="price-row">
              <div>
                <span class="sale-price">${formatPrice(p.sale_price)}</span>
                ${p.mrp_price ? `<span class="mrp-price">${formatPrice(p.mrp_price)}</span>` : ''}
              </div>
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">SKU: ${p.sku}</div>
            </div>

            <div class="card-action-btns">
              <button class="add-cart-btn" onclick="window.HYPERXGT.addToCart(${p.id})">Add To Cart</button>
              <button class="compare-toggle-btn ${isCompared ? 'active' : ''}" onclick="window.HYPERXGT.toggleCompare(${p.id})" title="Compare Specs">
                ⚖️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Quick View Specs Modal
  function openQuickView(id) {
    const p = products.find(prod => prod.id === id);
    if (!p || !modalBackdrop || !modalContent) return;

    const whatsappText = encodeURIComponent(`Hi Hyper X GT team! I am interested in ordering: ${p.name} (SKU: ${p.sku}) priced at ${formatPrice(p.sale_price)}. Please provide stock availability & delivery details.`);
    const waUrl = `https://wa.me/?text=${whatsappText}`;

    const galleryHtml = (p.gallery_images && p.gallery_images.length > 0)
      ? `<div style="display: flex; gap: 8px; margin-top: 12px; justify-content: center;">
          <img src="${p.main_image}" style="width: 50px; height: 50px; object-fit: contain; background: var(--bg-main); border-radius: 4px; border: 1.5px solid var(--accent-red); cursor: pointer;" onclick="document.getElementById('modalMainImg').src='${p.main_image}'" />
          ${p.gallery_images.map(img => `<img src="${img}" style="width: 50px; height: 50px; object-fit: contain; background: var(--bg-main); border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer;" onclick="document.getElementById('modalMainImg').src='${img}'" />`).join('')}
        </div>`
      : '';

    modalContent.innerHTML = `
      <button class="modal-close-btn" onclick="window.HYPERXGT.closeModal()">✕</button>
      <div class="modal-grid">
        <div>
          <div class="modal-img-stage">
            <img id="modalMainImg" src="${p.main_image}" alt="${p.name}" />
          </div>
          ${galleryHtml}
        </div>

        <div>
          <div style="color: var(--accent-red); font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">${p.category}</div>
          <h2 style="font-size: 24px; font-weight: 900; color: var(--text-primary); margin: 6px 0 10px 0;">${p.name}</h2>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">MODEL SKU: <strong style="color: var(--accent-red);">${p.sku}</strong> • STOCK: <strong style="color: #22c55e;">IN STOCK</strong></div>

          ${p.short_description ? `<p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">${p.short_description}</p>` : ''}

          <div style="display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px;">
            <span style="font-size: 32px; font-weight: 900; color: var(--text-primary);">${formatPrice(p.sale_price)}</span>
            ${p.mrp_price ? `<span style="font-size: 15px; color: var(--text-muted); text-decoration: line-through;">${formatPrice(p.mrp_price)}</span>` : ''}
            ${p.discount_pct > 0 ? `<span style="background: var(--accent-red); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 800;">${p.discount_pct}% OFF</span>` : ''}
          </div>

          <h4 style="font-size: 13px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase;">TECHNICAL SPECIFICATIONS</h4>
          <table class="specs-table">
            <tr><td class="spec-name">Scale Factor</td><td class="spec-value">${p.scale}</td></tr>
            <tr><td class="spec-name">Max Speed</td><td class="spec-value">${p.speed}</td></tr>
            <tr><td class="spec-name">Drivetrain</td><td class="spec-value">${p.drive}</td></tr>
            <tr><td class="spec-name">Motor System</td><td class="spec-value">${p.motor}</td></tr>
            <tr><td class="spec-name">Battery Spec</td><td class="spec-value">${p.battery}</td></tr>
            <tr><td class="spec-name">Control System</td><td class="spec-value">${p.control}</td></tr>
            <tr><td class="spec-name">Dimensions</td><td class="spec-value">${p.dimensions}</td></tr>
            <tr><td class="spec-name">Body Material</td><td class="spec-value">${p.material}</td></tr>
            <tr><td class="spec-name">Weight</td><td class="spec-value">${p.weight}</td></tr>
            <tr><td class="spec-name">Age Group</td><td class="spec-value">${p.age}</td></tr>
          </table>

          <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
            <button class="btn-primary" onclick="window.HYPERXGT.addToCart(${p.id}); window.HYPERXGT.closeModal();">Add To Cart</button>
            <a href="${waUrl}" target="_blank" class="btn-outline" style="border-color: #25d366; color: #25d366;">Order On WhatsApp</a>
            <a href="${p.product_url}" target="_blank" class="btn-outline">Official Page 🔗</a>
          </div>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('active');
  }

  function closeModal() {
    if (modalBackdrop) modalBackdrop.classList.remove('active');
  }

  // Cart & Drawer Logic
  function addToCart(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    const existing = state.cart.find(item => item.id === id);
    if (existing) {
      existing.qty++;
    } else {
      state.cart.push({ ...p, qty: 1 });
    }

    updateCartBadge();
    renderCartDrawer();
    showNotification(`Added "${p.name}" to cart!`);
  }

  function updateCartBadge() {
    if (!cartBadge) return;
    const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
    cartBadge.textContent = totalQty;
  }

  function toggleCartDrawer() {
    if (cartDrawer) {
      cartDrawer.classList.toggle('active');
      renderCartDrawer();
    }
  }

  function renderCartDrawer() {
    if (!cartDrawerBody || !cartSubtotal) return;
    if (state.cart.length === 0) {
      cartDrawerBody.innerHTML = `
        <div style="text-align: center; padding: 40px 0; color: var(--text-muted);">
          <div style="font-size: 40px; margin-bottom: 12px;">🛒</div>
          <p style="font-size: 15px; font-weight: 700; color: var(--text-primary);">Your Shopping Cart is Empty</p>
          <p style="font-size: 13px; margin-top: 4px;">Select any machine to start your order.</p>
        </div>
      `;
      cartSubtotal.textContent = formatPrice(0);
      return;
    }

    const subtotal = state.cart.reduce((sum, item) => sum + (item.sale_price * item.qty), 0);
    cartSubtotal.textContent = formatPrice(subtotal);

    cartDrawerBody.innerHTML = state.cart.map(item => `
      <div class="cart-item-row">
        <img src="${item.main_image}" alt="${item.name}" />
        <div style="flex: 1;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); line-height: 1.3;">${item.name}</div>
          <div style="font-size: 14px; font-weight: 800; color: var(--accent-red); margin-top: 4px;">${formatPrice(item.sale_price)} × ${item.qty}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button style="background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); width: 24px; height: 24px; border-radius: 4px; cursor: pointer;" onclick="window.HYPERXGT.changeCartQty(${item.id}, -1)">-</button>
          <span style="font-size: 13px; font-weight: 800; color: var(--text-primary);">${item.qty}</span>
          <button style="background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); width: 24px; height: 24px; border-radius: 4px; cursor: pointer;" onclick="window.HYPERXGT.changeCartQty(${item.id}, 1)">+</button>
        </div>
      </div>
    `).join('');
  }

  function changeCartQty(id, delta) {
    const item = state.cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      state.cart = state.cart.filter(i => i.id !== id);
    }
    updateCartBadge();
    renderCartDrawer();
  }

  function checkoutCart() {
    if (state.cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    const itemsText = state.cart.map(i => `${i.name} (Qty: ${i.qty}) - ₹${i.sale_price * i.qty}`).join('%0A');
    const total = state.cart.reduce((sum, item) => sum + (item.sale_price * item.qty), 0);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`Hi Hyper X GT Team! I want to complete my order:%0A%0A${itemsText}%0A%0ATotal Amount: ₹${total}%0APlease confirm delivery details.`)}`;
    window.open(waUrl, '_blank');
  }

  // Mobile Menu Toggle
  function toggleMobileMenu() {
    if (mobileDrawer) mobileDrawer.classList.toggle('active');
  }

  // Compare Tool Toggle
  function toggleCompare(id) {
    const index = state.compareList.findIndex(item => item.id === id);
    if (index > -1) {
      state.compareList.splice(index, 1);
    } else {
      if (state.compareList.length >= 3) {
        alert("You can compare a maximum of 3 products at a time.");
        return;
      }
      const p = products.find(prod => prod.id === id);
      if (p) state.compareList.push(p);
    }

    renderProducts();
    renderCompareDrawer();
  }

  function renderCompareDrawer() {
    if (!compareDrawer || !compareGrid) return;
    if (state.compareList.length === 0) {
      compareDrawer.classList.remove('active');
      return;
    }

    compareDrawer.classList.add('active');
    if (compareBadge) compareBadge.textContent = state.compareList.length;

    compareGrid.innerHTML = state.compareList.map(p => `
      <div class="compare-item-card">
        <button style="position: absolute; top: 6px; right: 6px; background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;" onclick="window.HYPERXGT.toggleCompare(${p.id})">✕</button>
        <img src="${p.main_image}" style="max-height: 80px; object-fit: contain; margin-bottom: 8px;" />
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); height: 36px; overflow: hidden;">${p.name}</div>
        <div style="font-size: 14px; font-weight: 900; color: var(--accent-red); margin: 6px 0;">${formatPrice(p.sale_price)}</div>
        <div style="font-size: 11px; color: var(--text-muted);">Scale: ${p.scale} • Speed: ${p.speed} • Drive: ${p.drive}</div>
      </div>
    `).join('');
  }

  // Live Instant Search Preview
  function handleLiveSearch(query) {
    if (!liveSearchResults) return;
    if (!query || query.trim().length === 0) {
      liveSearchResults.classList.remove('active');
      return;
    }

    const q = query.toLowerCase().trim();
    const matches = products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 5);

    if (matches.length === 0) {
      liveSearchResults.innerHTML = `<div style="padding: 12px; font-size: 13px; color: var(--text-muted); text-align: center;">No models found for "${query}"</div>`;
    } else {
      liveSearchResults.innerHTML = matches.map(p => `
        <div class="search-result-item" onclick="window.HYPERXGT.openQuickView(${p.id}); document.getElementById('liveSearchResults').classList.remove('active');">
          <img src="${p.main_image}" alt="${p.name}" />
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${p.name}</div>
            <div style="font-size: 12px; color: var(--accent-red); font-weight: 800;">${formatPrice(p.sale_price)}</div>
          </div>
        </div>
      `).join('');
    }

    liveSearchResults.classList.add('active');
  }

  // Notification Toast
  function showNotification(msg) {
    let toast = document.getElementById('toastNotification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toastNotification';
      toast.style.cssText = `
        position: fixed; bottom: 30px; right: 30px;
        background: var(--accent-red); color: #fff;
        padding: 14px 28px; border-radius: 8px; font-weight: 800;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 3000;
        transform: translateY(100px); opacity: 0; transition: all 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
    }, 2500);
  }

  // Event Listeners
  function setupEventListeners() {
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderProducts();
        handleLiveSearch(e.target.value);
      });

      document.addEventListener('click', (e) => {
        if (liveSearchResults && !searchInput.contains(e.target) && !liveSearchResults.contains(e.target)) {
          liveSearchResults.classList.remove('active');
        }
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderProducts();
      });
    }

    if (currencyToggleBtn) {
      currencyToggleBtn.addEventListener('click', () => {
        state.currency = state.currency === 'INR' ? 'USD' : 'INR';
        currencyToggleBtn.textContent = state.currency === 'INR' ? 'INR (₹)' : 'USD ($)';
        renderProducts();
        renderCartDrawer();
      });
    }

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        state.theme = isLight ? 'light' : 'dark';
        themeToggleBtn.textContent = isLight ? '🌙 Dark' : '☀️ Light';
        showNotification(`Switched to ${isLight ? 'Crisp Light Mode' : 'Executive Dark Mode'}`);
      });
    }

    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
    }

    if (authModalBackdrop) {
      authModalBackdrop.addEventListener('click', (e) => {
        if (e.target === authModalBackdrop) closeAuthModal();
      });
    }
  }

  // Expose Global Public API
  window.HYPERXGT = {
    openQuickView,
    closeModal,
    addToCart,
    changeCartQty,
    checkoutCart,
    toggleCompare,
    filterCategory,
    toggleMobileMenu,
    toggleCartDrawer,
    openAuthModal,
    closeAuthModal,
    switchAuthTab,
    handleLogin,
    handleSignup,
    demoLogin,
    state
  };

  document.addEventListener('DOMContentLoaded', init);
})();
