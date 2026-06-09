# n8n Community Nodes Research

> Дослідження доступних community nodes для n8n workflow автоматизації
> Дата: 2026-06-06

---

## 1. 📄 Generate PDF

| Node | Downloads/тижд | Що робить | Оцінка |
|------|:---:|---|:---:|
| **`n8n-nodes-htmlcsstopdf`** | 24,105 | HTML/CSS → PDF через PdfMunk API. Шаблони з `{{placeholders}}`. Інвойси, звіти, сертифікати | ⭐⭐⭐⭐⭐ **Рекомендую** |
| `@custom-js/n8n-nodes-pdf-toolkit-v2` | 3,769 | CustomJS API — HTML → PDF, merge/split | ⭐⭐⭐ |
| `n8n-nodes-pdf-api-hub` | 793 | 30+ операцій: HTML→PDF, sign, OCR, extract tables, PDF→XLSX/PPTX. Free tier | ⭐⭐⭐⭐ |
| `n8n-nodes-pdf-generator` | 364 | PDFKit-based, text/markdown → PDF. Без зовнішнього API | ⭐⭐⭐ |
| `n8n-nodes-puppeteer` | 30,905 | Puppeteer: HTML → PDF + скріншоти (один універсальний node) | ⭐⭐⭐⭐⭐ **Рекомендую** |

**Висновок:** `n8n-nodes-htmlcsstopdf` для простих HTML-шаблонів, `n8n-nodes-puppeteer` для повного контролю і скріншотів.

---

## 2. 📊 Generate PPTX

| Node | Downloads/тижд | Статус |
|------|:---:|---|
| `n8n-nodes-pptx-maker` | 123 | ⚠️ **Порожня обгортка** — readme не заповнений, реальний функціонал невідомий |
| `@mazix/n8n-nodes-converter-documents` | 29,271 | Конвертація PPTX → JSON/TXT (читання, не генерація) |
| `n8n-nodes-pdf-api-hub` | 793 | PDF → PPTX конвертація (не генерація з нуля) |

**Висновок:** ❌ **Немає готового рішення для генерації PPTX.** Варіанти:

| Підхід | Складність | Опис |
|--------|:---:|---|
| **Code node + `pptxgenjs`** | ⭐⭐ | JavaScript бібліотека (2500+ зірок). Генерація PPTX з JSON даних прямо в n8n |
| **HTTP Request → зовнішній API** | ⭐ | Google Slides API, python-pptx мікросервіс, API-monster |
| **Custom community node** | ⭐⭐⭐⭐ | Написати власний node на основі `pptxgenjs` для reuse |

**Рекомендований шлях:** Code node + `pptxgenjs`:
```javascript
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
const slide = pptx.addSlide();
slide.addText('Hello World!', { x: 1, y: 1, w: '80%', h: 1, fontSize: 24 });
// ... build slides from input items
return { pptx_base64: await pptx.write({ outputType: 'base64' }) };
```

---

## 3. 📦 NovaPost (Нова Пошта)

| Node | Author | Статус |
|------|--------|:---:|
| **`n8n-nodes-novaposhta`** v1.0.1 | [tonytkachenko](https://github.com/tonytkachenko/n8n-nodes-novaposhta) | ✅ **Готовий!** |

```
npm install n8n-nodes-novaposhta
```

**Можливості (API v2.0 через `api.novaposhta.ua/v2.0/json/`):**

| Ресурс | Операції |
|--------|---------|
| 📮 **Document** | Create, Get, Delete, Generate Report |
| 🏢 **Counterparty** | Create, Get, Update, Delete |
| 👤 **Contact Person** | Create, Update, Delete, Get |
| 📍 **Address** | Search Settlements, Get Warehouses, Get Streets, Save |
| 📋 **Registry** | Create, Update, Delete, Get |
| 📊 **Scan Sheet** | Insert/Remove Documents, Get/Delete |
| 🔙 **Additional Service** | Return orders, change EW |
| 🔍 **Tracking** | Track (comma-separated, max 100) |
| 💰 **Loyalty/Payment** | Card info, balance, payment cards |

**Credentials:** API ключ з особистого кабінету НП.  
**Сумісність:** n8n 1.x (тестовано з 1.82.0).  
**GitHub:** 5 комітів, TypeScript 95%, MIT.

**Типовий flow створення ТТН:**
1. Create/Get Counterparty (відправник + отримувач)
2. Create Contact Person для кожного
3. Search Settlements / Get Warehouses
4. Create Document (відправлення)
5. Track — відстеження

---

## 4. 🛒 OLX.ua

❌ **Немає community node.** OLX не надає публічного API для продавців.

**Workaround варіанти:**

| Підхід | Ризик | Опис |
|--------|:---:|---|
| **Puppeteer scraping** | ⚠️ Бан | Автоматизація через браузер. Публікація оголошень, збір статистики |
| **OLX Partner API** | ✅ | Доступний тільки для партнерів (обмежений) |
| **Telegram бот** | ✅ | Прийом лідів через Telegram + ручне розміщення |

---

## 5. 🏪 Prom.ua

❌ **Немає community node.**

**Workaround: HTTP Request + XML API**

Prom.ua має офіційний API для продавців: `my.prom.ua/cabinet/api`

| Можливість | Формат |
|-----------|--------|
| Товари (CRUD) | XML + token |
| Замовлення | XML (підтвердження, статуси) |
| Клієнти | XML |
| Повідомлення | XML |
| Ціни/залишки | XML імпорт |

**Приклад n8n HTTP Request:**
```
POST https://my.prom.ua/api/v1/products/list
Headers:
  Authorization: Bearer YOUR_API_TOKEN
  Content-Type: application/xml
Body: <root><product>...</product></root>
```

---

## 6. 📸 Make Screenshot

| Node | Downloads/тижд | Що робить |
|------|:---:|---|
| **`n8n-nodes-puppeteer`** 🏆 | 30,905 | **Найкращий вибір.** 4 операції: Get Page Content, Get PDF, Get Screenshot, Custom Script |
| `n8n-nodes-htmlcsstoimage` | 8,452 | HTML → PNG (без браузера) |
| `n8n-nodes-pdf-api-hub` | 793 | Screenshot як бонус до PDF toolkit |

**`n8n-nodes-puppeteer` - Screenshot можливості:**

| Фіча | Опис |
|------|------|
| 📸 **Формати** | PNG, JPEG, WebP |
| 📱 **Device emulation** | iPhone, iPad, Pixel etc. |
| 📐 **Режими** | Full-page, viewport, element selector |
| 🥷 **Stealth mode** | Обхід headless detection |
| 🌐 **Remote browser** | browserless.io / свій Docker контейнер |
| 🐳 **Docker** | Готовий docker-compose |
| ⏱ **Timeouts** | Navigation + protocol timeout |
| 🔄 **Batch** | Одночасно кілька сторінок |

**Встановлення:**
```bash
npm install n8n-nodes-puppeteer
```

---

## 🏆 Підсумкова таблиця

| Задача | Рішення | Статус | Installation |
|--------|---------|:---:|---|
| PDF generation | `n8n-nodes-htmlcsstopdf` / `n8n-nodes-puppeteer` | ✅ | `npm i n8n-nodes-htmlcsstopdf` |
| PPTX generation | Code node + `pptxgenjs` | ⚠️ | `npm i pptxgenjs` |
| NovaPost | `n8n-nodes-novaposhta` | ✅ | `npm i n8n-nodes-novaposhta` |
| OLX.ua | Puppeteer / Telegram bot | ❌ | workaround |
| Prom.ua | HTTP Request + XML API | ⚠️ | нативний n8n node |
| Screenshot | `n8n-nodes-puppeteer` | ✅ | `npm i n8n-nodes-puppeteer` |

---

## 📋 Пріоритети для впровадження

1. **`n8n-nodes-puppeteer`** — покриває PDF + скріншоти одним node, 30K downloads
2. **`n8n-nodes-novaposhta`** — готова інтеграція, єдиний dev
3. **`pptxgenjs` в Code node** — нема готового node, але бібліотека зріла
4. **Prom.ua XML API** — робочий, просто через HTTP Request
5. **OLX** — найскладніше, потребує скрапінгу
