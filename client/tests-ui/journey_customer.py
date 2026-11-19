import json, os, sys, time, urllib.request
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE = os.environ.get("UI_BASE", "http://localhost:5173")
API = os.environ.get("UI_API", "http://localhost:5055/api")
STAMP = os.environ.get('UI_STAMP', str(int(time.time())))
SHOTS = os.environ.get("UI_SHOTS", "./ui-shots")
os.makedirs(SHOTS, exist_ok=True)

opts = Options()
opts.add_argument("-headless")
if os.environ.get("FIREFOX_BIN"):
    opts.binary_location = os.environ["FIREFOX_BIN"]
driver = webdriver.Firefox(options=opts, service=Service(os.environ.get("GECKODRIVER", "geckodriver")))
driver.set_window_size(1280, 1000)
wait = WebDriverWait(driver, 15)

passed, failed = 0, []

def check(name, ok, extra=""):
    global passed
    if ok:
        passed += 1
    else:
        failed.append(name)
        print(f"FAIL  {name} {extra}")

def api(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def shot(name):
    driver.save_screenshot(f"{SHOTS}/{name}.png")

def go(path):
    driver.get(BASE + path)

def css(sel, timeout=15):
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.CSS_SELECTOR, sel)))

def all_css(sel):
    return driver.find_elements(By.CSS_SELECTOR, sel)

def click_text(tag, text, timeout=15):
    el = WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((By.XPATH, f"//{tag}[contains(normalize-space(.), '{text}')]")))
    driver.execute_script("arguments[0].scrollIntoView({block:'center'})", el)
    el.click()
    return el

def text_present(text, timeout=15):
    try:
        WebDriverWait(driver, timeout).until(lambda d: text in d.find_element(By.TAG_NAME, "body").text)
        return True
    except Exception:
        return False

def fill(sel, value):
    el = css(sel)
    el.clear()
    el.send_keys(value)

def cart_count():
    els = all_css(".cart-count")
    return int(els[0].text) if els else 0

try:
    # ---------- Home ----------
    go("/")
    css(".hero h1")
    check("home hero renders", "Out of stock?" in css(".hero h1").text)
    time.sleep(1.5)
    check("home stats strip loaded from API", "products" in css(".stats-strip").text and any(c.isdigit() for c in css(".stats-strip").text))
    check("home shows 6 category tiles", len(all_css(".cat-tile")) == 6, len(all_css(".cat-tile")))
    check("home shows popular products", len(all_css(".home .product-card")) >= 4)
    css(".demo-list li", 20)
    check("live demo shows ranked substitutes without login", len(all_css(".demo-list li")) >= 1)
    first_demo = [e.text for e in all_css(".demo-list li")][0]
    # tick vegan + tiny budget -> results must change/disappear
    driver.execute_script("document.querySelector('#try-it').scrollIntoView()")
    click_text("label", "Vegan")
    time.sleep(1.5)
    fill(".demo-controls input[type=number]", "0.5")
    time.sleep(1.8)
    check("demo: impossible budget shows the 'no substitute passes' state", text_present("No substitute passes every rule"))
    shot("01_home_demo")
    driver.execute_script("window.scrollTo(0,0)")
    shot("00_home_top")

    # ---------- Register ----------
    go("/register")
    email = f"ui{STAMP}@example.com"
    fill("input[name=name]", "Priya Sharma")
    fill("input[name=email]", email)
    fill("input[name=password]", "longenough1")
    fill("input[name=confirmPassword]", "longenough1")
    click_text("button", "Register")
    check("register lands on preferences", text_present("Substitution Preferences"))
    check("navbar greets the user", "Hi, Priya" in css(".navbar").text)

    # preferences: budget 9, vegan
    fill("input[type=number]", "9")
    click_text("label", "vegan")
    click_text("button", "Save Preferences")
    check("preferences saved toast", text_present("Preferences saved"))

    # ---------- Products -> out of stock -> substitutes ----------
    go("/products")
    css(".product-card")
    check("products page lists 200+ items", len(all_css(".product-card")) > 100)
    # sort + in stock filter via URL state
    go("/products?inStock=1&sort=price-asc")
    time.sleep(1.5)
    prices = [float(e.text.replace("$", "")) for e in all_css(".product-card .price")]
    check("URL filters: in-stock only + price ascending", prices == sorted(prices) and len(prices) > 50 and not all_css(".product-card.is-out"))
    go("/products?search=almond milk")
    time.sleep(1.5)
    out_cards = all_css(".product-card.is-out")
    if not out_cards:
        go("/products?search=milk")
        time.sleep(1.5)
        out_cards = all_css(".product-card.is-out")
    check("an out-of-stock card shows 'Find substitutes' (not 'Add to cart')", bool(out_cards) and "Find substitutes" in out_cards[0].text and "Add to cart" not in out_cards[0].text)
    shot("02_products")
    original_name = out_cards[0].find_element(By.CSS_SELECTOR, ".pc-name").text
    out_cards[0].find_element(By.LINK_TEXT, "Find substitutes").click()

    css(".reco-card")
    check("recommendation page shows the original product", original_name in css(".reco-head").text)
    check("your-rules chips reflect saved preferences", "Max $9.00" in css(".constraint-chips").text and "vegan" in css(".constraint-chips").text)
    cards = all_css(".reco-card")
    check("recommendations are listed with Add to cart + Buy now", len(cards) >= 1 and "Add to cart" in cards[0].text and "Buy now" in cards[0].text)
    check("every card shows explanation tags and a match %", all("% match" in c.text and "Vegan-friendly" in c.text for c in cards))
    check("best match ribbon on #1", "Best match" in cards[0].text)
    shot("03_recommendations")
    first_sub_name = cards[0].find_element(By.CSS_SELECTOR, "h3").text.split(" ", 1)[1]
    click_text("button", "Why this recommendation?")
    check("explanation text expands", text_present("is available and meets"))
    cards[0].find_element(By.XPATH, ".//button[contains(., 'Add to cart')]").click()
    check("add to cart updates navbar badge", WebDriverWait(driver, 8).until(lambda d: cart_count() == 1))
    check("card flips to 'In your cart' with Checkout link", text_present("In your cart"))
    # optional rating
    click_text("button", "Rate this suggestion")
    css(".rating-btn")
    all_css(".rating-btn")[3].click()
    click_text("button", "Submit feedback")
    check("feedback can be submitted after adding", text_present("Thanks for your feedback"))
    # reject another
    if len(all_css(".reco-card")) > 1:
        click_text("button", "Not for me")
        check("'Not for me' hides that suggestion", text_present("You said this isn't for you"))

    # ---------- Cart ----------
    go("/cart")
    css(".cart-item")
    check("cart shows the substitute with a 'Substitute for' badge", f"Substitute for {original_name}" in css(".cart-list").text)
    check("cart total shown and checkout enabled", "Proceed to checkout" in css(".summary").text and not all_css(".summary button[disabled]"))
    shot("04_cart")
    click_text("a", "Proceed to checkout")

    # ---------- Checkout ----------
    css("form.cart-layout")
    check("checkout shows order summary with the swap", "swap for" in css(".mini-items").text)
    fill("input[name=fullName]", "Priya Sharma")
    fill("input[name=phone]", "+91 98765 43210")
    fill("input[name=line1]", "12 Park Street")
    fill("input[name=city]", "Phagwara")
    fill("input[name=postalCode]", "144401")
    shot("05_checkout")
    click_text("button", "Place order")
    check("order confirmation page with thank-you banner", text_present("Your order is confirmed"))
    check("order shows Smart swap badge + timeline", "Smart swap for" in css(".cart-list").text and "Shipped" in css(".timeline").text)
    check("cart was cleared after ordering", cart_count() == 0)
    shot("06_order_confirmation")
    order_url = driver.current_url
    # rating form for the swap is present on the order
    check("order offers a rating form for the substituted item", bool(all_css(".swap-box .rating-btn")))

    # ---------- Orders list ----------
    go("/orders")
    css(".order-card")
    check("orders list shows the order with a smart-swap badge", "smart swap" in css(".order-list").text)
    shot("07_orders")

except Exception as e:
    import traceback
    traceback.print_exc()
    failed.append(f"CRASH: {e!r}")
    try:
        shot("zz_crash")
        print("URL at crash:", driver.current_url)
        print("BODY:", driver.find_element(By.TAG_NAME, "body").text[:600])
    except Exception:
        pass
finally:
    driver.quit()

print(f"\n{passed}/{passed + len(failed)} UI checks passed" + (f", FAILED: {failed}" if failed else "."))
sys.exit(1 if failed else 0)
