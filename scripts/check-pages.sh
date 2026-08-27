#!/usr/bin/env bash
# Renders every page in headless Chrome (so app.js actually executes) and asserts that the
# JS-driven parts of the page produced content. A page that 200s but whose scripts threw
# will fail here — that is the "looks fine, does nothing" failure mode.
set -u

CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
BASE="${BASE:-http://localhost:3000}"
PROFILE="${TMPDIR:-/tmp}/hxprofile-check"
FAIL=0

render() {
  "$CHROME" --headless=new --disable-gpu --no-sandbox \
    --user-data-dir="$PROFILE" --virtual-time-budget=6000 \
    --dump-dom "$1" 2>/dev/null
}

# assert <dom-file> <label> <min-count> <grep-pattern>
assert() {
  local file="$1" label="$2" min="$3" pattern="$4"
  local n
  n=$(grep -o "$pattern" "$file" | wc -l | tr -d ' ')
  if [ "$n" -lt "$min" ]; then
    echo "  FAIL $label — expected >=$min of /$pattern/, found $n"
    FAIL=$((FAIL + 1))
  else
    echo "  ok   $label ($n)"
  fi
}

check_page() {
  local page="$1"; shift
  local dom="${TMPDIR:-/tmp}/dom_${page%%.*}.html"
  echo "== $page"
  render "$BASE/$page" > "$dom"

  # Every storefront page injects the shared chrome; if app.js threw, these are missing.
  assert "$dom" "toast injected"        1 'id="toast"'
  assert "$dom" "cart drawer injected"  1 'id="cartDrawer"'
  assert "$dom" "mobile drawer"         1 'id="mobileDrawer"'
  assert "$dom" "account modal"         1 'id="accountModal"'

  while [ $# -gt 0 ]; do
    assert "$dom" "$1" "$2" "$3"
    shift 3
  done
}

echo "Rendering pages against $BASE"
echo

check_page index.html \
  "home product grid" 8 'class="product-card"' \
  "quick category tiles" 6 'class="cat"' \
  "category carousels" 3 'class="carousel-card"'

check_page shop.html \
  "shop grid" 16 'class="product-card"' \
  "category filter options" 6 '<option value="[A-Z]'

check_page product.html \
  "product detail rendered" 1 'id="productMainSection"' \
  "spec grid" 1 'class="spec-table"' \
  "related products" 4 'class="product-card"'

check_page cart.html
check_page checkout.html "checkout summary" 1 'id="checkoutSummary"'
check_page account.html  "auth box" 1 'id="authBox"'
check_page club.html
check_page care.html
check_page contact.html
check_page faq.html
check_page upgrades.html
check_page why.html
check_page privacy.html
check_page returns.html
check_page shipping.html
check_page terms.html

echo
if [ "$FAIL" -gt 0 ]; then
  echo "$FAIL assertion(s) failed."
  exit 1
fi
echo "All page render assertions passed."
