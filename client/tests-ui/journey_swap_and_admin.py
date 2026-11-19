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
    email = f"ub{STAMP}@example.com"
    api("POST", "/auth/register", {"name": "Priya Sharma", "email": email, "password": "longenough1"})
    _login = api("POST", "/auth/login", {"email": email, "password": "longenough1"})["data"]
    go("/")
    driver.execute_script("localStorage.setItem('ss_token', JSON.stringify(arguments[0])); localStorage.setItem('ss_user', JSON.stringify(arguments[1]));", _login["token"], _login["user"])
    go("/")
    adm_email = f"adm{STAMP}@example.com"
    # ---------- Cart swap flow: item becomes unavailable while in cart ----------
    tok = api("POST", "/auth/login", {"email": email, "password": "longenough1"})["data"]["token"]
    adm = api("POST", "/auth/login", {"email": adm_email, "password": "longenough1"})["data"]["token"]
    products = api("GET", "/products?search=Soy%20Milk&inStockOnly=true")["data"]
    victim = next(p for p in products if "Organic" not in p["name"])
    go(f"/products/{victim['_id']}")
    css(".details-info")
    check("product details page shows price, stock and Add to cart", "Add to cart" in css(".details-info").text and "In stock" in css(".details-info").text or "left" in css(".details-info").text)
    shot("08_product_details")
    click_text("button", "Add to cart")
    WebDriverWait(driver, 8).until(lambda d: cart_count() == 1)
    api("PATCH", f"/admin/inventory/{victim['_id']}", {"quantity": 0}, adm)  # someone buys the last units
    go("/cart")
    check("cart notices the item became unavailable", text_present("No longer available"))
    check("checkout is blocked while an item is unavailable", bool(all_css(".summary button[disabled]")))
    click_text("button", "Find a substitute that fits my rules")
    css(".sub-item", 20)
    check("inline substitute panel lists options", len(all_css(".sub-item")) >= 1)
    shot("09_cart_swap")
    click_text("button", "Swap in")
    check("swap replaces the item and keeps the 'Substitute for' badge", text_present(f"Substitute for {victim['name']}"))
    check("checkout is enabled again after the swap", not all_css(".summary button[disabled]") and not all_css(".badge-danger"))
    api("PATCH", f"/admin/inventory/{victim['_id']}", {"quantity": 20}, adm)

    # ---------- Buy now from product page + cancel ----------
    driver.execute_script("localStorage.setItem('ss_cart','[]')")
    go(f"/products/{victim['_id']}")
    css(".details-info")
    click_text("button", "Buy now")
    check("Buy now goes straight to checkout", text_present("Delivery address"))
    css("input[name=phone]")
    fill("input[name=phone]", "+91 98765 43210")
    fill("input[name=line1]", "12 Park Street")
    fill("input[name=city]", "Phagwara")
    fill("input[name=postalCode]", "144401")
    click_text("label", "Card (demo)")
    click_text("button", "Place order")
    check("second order placed (card demo is paid)", text_present("Your order is confirmed") and text_present("paid"))
    click_text("button", "Cancel order")
    driver.switch_to.alert.accept()
    check("customer can cancel a placed order", text_present("Order cancelled") or text_present("Cancelled"))

    # ---------- Guest protection ----------
    driver.execute_script("localStorage.clear()")
    go("/checkout")
    check("guests are redirected to login for checkout", text_present("Login") and "/login" in driver.current_url)

    _p = api("GET", "/products?inStockOnly=true")["data"][0]
    api("POST", "/orders", {"items": [{"productId": _p["_id"], "quantity": 1}], "shippingAddress": {"fullName": "Priya Sharma", "phone": "+91 98765 43210", "line1": "12 Park Street", "city": "Phagwara", "postalCode": "144401"}, "paymentMethod": "cod"}, tok)
    # ---------- Admin ----------
    go("/login")
    fill("input[name=email]", adm_email)
    fill("input[name=password]", "longenough1")
    click_text("button", "Login")
    check("admin sees Admin link", WebDriverWait(driver, 10).until(lambda d: "Admin" in d.find_element(By.CSS_SELECTOR, ".navbar").text))
    go("/admin")
    css(".stat-grid")
    time.sleep(1.5)
    body = css(".admin-main").text
    check("dashboard shows orders, revenue and swap sales", "Orders" in body and "Revenue" in body and "Sold via substitutes" in body)
    shot("10_admin_dashboard")
    click_text("a", "Orders")
    css(".table")
    time.sleep(1)
    check("admin orders table lists customer orders", "ub" + STAMP in css(".admin-main").text)
    shot("11_admin_orders")
    click_text("button", "Mark shipped")
    check("admin can mark an order shipped", text_present("Order shipped"))
    go("/admin/products")
    css(".table")
    check("admin products page loads with stock cells", bool(all_css(".stock-cell")))
    go("/admin/labels")
    css(".admin-form")
    check("admin relationships page loads", "New relationship" in css(".admin-main").text)

    # ---------- Normal user cannot open admin ----------
    driver.execute_script("localStorage.clear()")
    go("/login")
    fill("input[name=email]", email)
    fill("input[name=password]", "longenough1")
    click_text("button", "Login")
    WebDriverWait(driver, 10).until(lambda d: "Hi, Priya" in d.find_element(By.CSS_SELECTOR, ".navbar").text)
    go("/admin")
    time.sleep(1.5)
    check("non-admin is bounced from /admin", "/admin" not in driver.current_url.replace(BASE, "") or driver.current_url.rstrip("/") == BASE)

    # ---------- Responsive ----------
    driver.set_window_size(390, 844)
    go("/")
    css(".hero h1")
    check("mobile: hamburger shown", css(".navbar-toggle").is_displayed())
    shot("12_mobile_home")
    driver.set_window_size(1280, 1000)
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
