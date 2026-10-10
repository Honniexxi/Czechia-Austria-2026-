# Czechia / Austria 2026 Travel PWA 開發規格

> 文件用途：供 Codex 直接實作 Czechia / Austria 2026 Travel PWA。  
> 規格狀態：依需求討論定稿；除文件明列的 placeholder 外，不得自行變更 Google Sheet schema 或資料語意。  
> 主要裝置：iPhone；部署目標：GitHub Pages。

## 1. 專案目標

建立一個 mobile-first、可安裝、可離線閱讀的個人旅行 PWA。Google Sheet 是唯一的行程資料來源與內容管理後台；GitHub Pages 上的前端負責資料讀取、排版、導航與本機狀態。

使用者在旅途中應能快速完成以下事情：

- 開啟 App 後立即看到當日行程。
- 切換任一天，依時間軸查看行程與細節。
- 從整趟 Journey overview 跳到指定日期。
- 快速開啟地址導航、官網、票券或訂單。
- 查詢 Checklist、匯率、票券／預約與臨時備忘。
- 在網路中斷時繼續閱讀最近一次成功同步的行程。

本 PWA 不提供記帳或多人分帳功能；既有獨立記帳 PWA 繼續負責該用途。

## 2. 已確認的系統邊界

```text
Google Sheet
  ├─ Config
  ├─ Trip
  ├─ Itinerary
  ├─ Bookings
  └─ Checklist
        │
        ▼
Google Apps Script Web App（唯讀 JSON API）
        │
        ▼
GitHub Pages PWA
  ├─ Today
  ├─ Journey
  ├─ Tools
  └─ Info
        │
        ├─ Cache Storage：App shell
        └─ Local storage：最近資料、Quick Notes、使用者狀態
```

Google Sheet：

- 文件 ID：`1S1wsFRSt5kxw4LRBI2IsP0tzjLev2ybJn4TMn2Xv-9M`
- 編輯網址：<https://docs.google.com/spreadsheets/d/1S1wsFRSt5kxw4LRBI2IsP0tzjLev2ybJn4TMn2Xv-9M/edit>

正式 Apps Script Web App URL 尚未提供。前端必須集中使用一個可替換常數：

```js
const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
```

不得把 Sheet 資料複製或 hard-code 進 HTML，亦不得改用五組 CSV URL。

## 3. Google Sheet schema

### 3.1 通則

- 工作表固定為 `Config`、`Trip`、`Itinerary`、`Bookings`、`Checklist`，名稱與大小寫不得改動。
- 欄位名稱與順序視為 API contract，不得在前端實作時自行增刪或重新命名。
- 第一列為 header；第二列起為資料。
- 空白列由 Apps Script 排除。
- 日期在 API 層輸出為 `YYYY-MM-DD`；時間輸出為 `HH:mm`。空白值輸出為空字串，不輸出字面值 `null`、`undefined` 或 `Invalid Date`。
- `Day` 儲存數字；Sheet 顯示格式可用 `"Day "0`。前端不得依顯示字串解析 Day。
- 前端必須依實際資料產生 Day selector，禁止 hard-code Day 1–12。

### 3.2 Config

欄位順序：

```text
Key | Value
```

用途：全旅程設定與不屬於特定日期的少量固定資訊。至少支援以下 key；實際顯示內容以 Sheet 為準：

| Key | 用途 | 範例 |
|---|---|---|
| `TripName` | App／旅程名稱 | `Europe 2026` |
| `StartDate` | Day 1 日期 | `2026-10-16` |
| `EndDate` | 旅程結束日期 | `2026-10-27` |
| `Timezone` | 日期與 Today 判斷時區 | `Europe/Prague` |

Apps Script 將 Config 轉成 key-value object。未知 key 必須保留，前端可忽略但不得造成載入失敗。

### 3.3 Trip

欄位順序：

```text
Day | Date | City | Country | CountryCode | Summary | Note
```

| 欄位 | 型別／格式 | 規則 |
|---|---|---|
| `Day` | 正整數 | 旅程第幾天；唯一的日序識別值 |
| `Date` | `YYYY-MM-DD` | 由 Day 與 Config 的 StartDate 對應 |
| `City` | 文字 | 當日主要城市 |
| `Country` | 文字 | 國家顯示名稱，例如 `Czechia`、`Austria` |
| `CountryCode` | 文字 | 國家代碼；用於分組、旗幟或樣式 |
| `Summary` | 文字 | Journey 頁的人工整理短摘要；前端不得用 Itinerary 猜摘要 |
| `Note` | 文字 | 當日補充資訊，可空白 |

每個 Day 原則上只有一列。Journey 的國家、城市、統計與每日摘要均由 Trip 產生。

### 3.4 Itinerary

欄位順序：

```text
Day | Date | Type | Time | EndTime | Title | Subtitle | Link | Address | Note
```

| 欄位 | 型別／格式 | 規則 |
|---|---|---|
| `Day` | 正整數 | 與 Trip.Day 對應 |
| `Date` | `YYYY-MM-DD` | 依 Day 自動計算 |
| `Type` | enum-like 文字 | `Flight`、`Transport`、`Hotel`、`Attraction`、`Food`、`Cafe`、`Activity`；未知值用通用 icon |
| `Time` | `HH:mm` 或空白 | 開始時間；排序主要依據 |
| `EndTime` | `HH:mm` 或空白 | 結束時間；不得把時間區間塞回 Time |
| `Title` | 文字 | 主要標題 |
| `Subtitle` | 文字 | 次要名稱、路線或活動說明 |
| `Link` | URL 或空白 | 景點、餐廳、交通參考頁或官網 |
| `Address` | 文字或空白 | 導航與複製地址使用 |
| `Note` | 文字或空白 | 當日執行提醒、停留規則、備案 |

資料語意：某一天會實際發生的景點、餐廳、交通、住宿動作或活動，一律放 Itinerary。

同一天排序規則：

1. 有 `Time` 的項目依 Time 升冪。
2. 相同 Time 保留 API／Sheet 原始列序。
3. 無 Time 的項目置於當日有時間項目之後，並保留原始列序。

`Itinerary.Link` 的固定語意是參考網址或官網，不存放已購買的電子票或訂單。

### 3.5 Bookings

最終欄位順序：

```text
Date | Time | Type | Title | BookingInfo | Link | Note | Address
```

不得加入 `EndDate`、`Subtitle` 或 `Website` 欄位。

| 欄位 | 型別／格式 | 規則 |
|---|---|---|
| `Date` | `YYYY-MM-DD` | 預約／票券所屬日期；住宿區間仍用 BookingInfo 表達 |
| `Time` | `HH:mm` 或空白 | 預約、發車、演出或入場時間 |
| `Type` | enum-like 文字 | 至少支援 `Flight`、`Train`、`Bus`、`Hotel`、`Attraction`、`Concert`、`Restaurant`、`Other` |
| `Title` | 文字 | 預約或票券名稱 |
| `BookingInfo` | 文字 | 自由資訊，如 `10/16–10/19 · 3 Nights`、路線、座位或票種 |
| `Link` | URL 或空白 | 已購買／已預約的電子票、訂單或 booking 頁 |
| `Note` | 文字或空白 | 報到、提早抵達等提醒 |
| `Address` | 文字或空白 | 地點導航使用 |

Bookings 包含所有已預約或已購買項目，例如機票、火車、公車、住宿、景點導覽、音樂會與餐廳訂位。

`Bookings.Link` 的固定語意是票券／訂單。前端依 Type 決定按鈕文字，例如：

| Type | 按鈕文字 |
|---|---|
| `Hotel` | `Open Booking` |
| `Flight` | `Open Booking` 或 `Open Ticket` |
| `Train`、`Bus`、`Attraction`、`Concert` | `Open Ticket` |
| `Restaurant` | `Open Reservation` |
| 其他 | `Open Link` |

若 `Address` 有值，另顯示 `Navigate`。不得因沒有 Link 而隱藏整張卡片。

Itinerary 與 Bookings 可合理描述同一事件，但用途不同：Itinerary 回答「何時去哪裡」，Bookings 回答「入場或搭乘時要拿什麼」。電子票連結只維護於 Bookings，不重複貼到 Itinerary。

### 3.6 Checklist

欄位順序：

```text
Category | Item | Note
```

| 欄位 | 型別 | 規則 |
|---|---|---|
| `Category` | 文字 | 分組名稱 |
| `Item` | 文字 | 清單項目 |
| `Note` | 文字或空白 | 補充說明 |

Sheet 提供清單內容；勾選狀態屬於裝置本機狀態，不回寫 Sheet。前端用穩定 key 保存勾選狀態，至少包含 `Category + Item`。

### 3.7 Day 與 Date 的 Sheet 規則

Day 由使用者輸入數字，Date 由 StartDate 自動產生，避免雙向公式造成循環相依。

Day 欄自訂數字格式：

```text
"Day "0
```

Itinerary 的 Date 欄可在 B2 使用一次陣列公式；`StartDate` 實際所在列須依 Config 表內容調整：

```excel
=ARRAYFORMULA(IF(A2:A="","",Config!$B$2+A2:A-1))
```

若 Config 採第一列即為資料而非 header，對應儲存格才使用 `Config!$B$1`。實作不得同時讓 Day 與 Date 互算。

## 4. Apps Script API contract

### 4.1 範圍

- Phase 1 前端先以 mock fixture 或同 shape 的本機資料完成 UI。
- 正式串接時只需替換 `API_URL`，不得改動 renderer 或 Sheet schema。
- 第一版 API 為唯讀 `GET`；Quick Notes 與 Checklist 勾選不寫回 Google Sheet。
- API 必須可由 GitHub Pages 跨網域讀取。

### 4.2 Request

```http
GET {API_URL}
Accept: application/json
```

可加 cache-busting query，例如 `?t=<epoch>`；不得把金鑰或 secret 放在前端、repository 或 URL。

### 4.3 Success response

HTTP 200，`Content-Type: application/json`：

```json
{
  "ok": true,
  "generatedAt": "2026-10-07T08:42:00.000Z",
  "config": {
    "TripName": "Europe 2026",
    "StartDate": "2026-10-16",
    "EndDate": "2026-10-27",
    "Timezone": "Europe/Prague"
  },
  "trip": [
    {
      "Day": 1,
      "Date": "2026-10-16",
      "City": "Prague",
      "Country": "Czechia",
      "CountryCode": "CZ",
      "Summary": "Old Town · Charles Bridge",
      "Note": ""
    }
  ],
  "itinerary": [
    {
      "Day": 1,
      "Date": "2026-10-16",
      "Type": "Attraction",
      "Time": "12:45",
      "EndTime": "",
      "Title": "Powder Tower",
      "Subtitle": "火藥塔",
      "Link": "",
      "Address": "",
      "Note": "只看外觀，不登塔"
    }
  ],
  "bookings": [
    {
      "Date": "2026-10-18",
      "Time": "13:00",
      "Type": "Attraction",
      "Title": "Klementinum",
      "BookingInfo": "English Guided Tour",
      "Link": "https://example.com/ticket",
      "Note": "提前 10–15 分鐘抵達",
      "Address": ""
    }
  ],
  "checklist": [
    {
      "Category": "Documents",
      "Item": "Passport",
      "Note": ""
    }
  ]
}
```

JSON key 大小寫遵照 Sheet header。陣列無資料時回傳 `[]`；不得省略五個資料節點。

### 4.4 Error response

Apps Script 能回傳 JSON 時使用：

```json
{
  "ok": false,
  "error": {
    "code": "SHEET_READ_FAILED",
    "message": "Unable to read travel data."
  }
}
```

前端不得把技術堆疊、Sheet 權限細節或敏感資訊顯示給使用者。

### 4.5 前端資料驗證

收到 response 後先驗證：

- `ok === true`。
- `config` 是 object，四個資料集是 array。
- Trip 與 Itinerary 的 Day 可轉為正整數。
- 日期與時間格式有效；無效列不可讓整個 App crash。
- URL 只允許 `https:` 或 `http:`；不把 Sheet 文字直接插入 `innerHTML`。

若新資料驗證失敗，保留最後一次有效快取並顯示同步失敗狀態。

## 5. 資訊架構

底部固定四個頁籤：

```text
Today | Journey | Tools | Info
```

App 啟動預設進 Today。底部導覽必須避開 iPhone safe area，固定但不可遮住內容。

### 5.1 Today

Today 是主要使用頁面，包含：

1. `EUROPE 2026`／Config.TripName 標題。
2. Day 編號、星期與日期。
3. 城市與國家。
4. 天氣摘要與最後更新時間。
5. 橫向可滑動 Day selector。
6. 當日手繪風時間軸。

顯示範例：

```text
EUROPE 2026

DAY 1
Friday · October 16
Prague · Czech Republic

12° / 7°
Cloudy · Evening will be cooler

 D1   D2   D3   D4   D5  →
 16   17   18   19   20
```

Day selector：

- 由 Trip／Itinerary 的實際 Day 動態產生。
- 顯示 Day 與日期；目前選取日有清楚但柔和的狀態。
- 可橫向滑動，選取日應自動捲入可視範圍。
- 點擊後更新 URL state（hash 或 query 均可）、Today header 與 timeline。

啟動日判斷：

1. 以 Config.Timezone 取得旅程當地日期。
2. 日期落在 Trip.Date 時，自動選擇對應 Day。
3. 旅程尚未開始時選 Day 1。
4. 旅程結束後選最後一個 Day。
5. 若 URL 指定有效 Day，URL 優先，方便 Journey 深連結。

Timeline 卡片預設只顯示 Time、Type icon、Title、Subtitle；點擊後展開：

- EndTime（有值時）。
- Address。
- Note。
- `Navigate`。
- `Copy Address`。
- `Website`（Itinerary.Link 有值時）。
- 與該事件關聯的 `Open Ticket / Open Booking`（有可靠關聯時）。

關聯 Booking 不得只用模糊標題猜測。可先採同 Date 且正規化後 Title 完全相等；無唯一結果時不要自動掛載，使用者仍可由 Tools 或 Info 查看 Bookings。

### 5.2 Journey

Journey 用於偶爾查看整趟 overview，不重複列出每一筆 Itinerary。

頁首由資料計算：

- 起訖日期。
- 總天數。
- 國家數。
- 城市數。

內容依 `CountryCode + Country` 分組，再依 Day 排序。每個 Day 顯示 Date、Day、City、Trip.Summary 與可選的 Trip.Note。

```text
MY JOURNEY
16 — 27 OCTOBER 2026
12 DAYS · 2 COUNTRIES · 5 CITIES

CZECHIA
OCT 16   DAY 1   Prague
Old Town · Charles Bridge

AUSTRIA
OCT 20   DAY 5   Salzburg
...
```

點任一天後切換到 Today 並選擇該 Day。Journey 的 Summary 必須直接使用 Trip.Summary，不由程式挑景點產生。

### 5.3 Tools

Tools 首頁以 2 × 2 卡片顯示：

```text
Checklist | Currency
Tickets & Bookings | Quick Notes
```

#### Checklist

- 依 Category 分組。
- 顯示 Item 與 Note。
- 勾選狀態只存在本機，離線可操作。
- Sheet 更新後保留仍能以穩定 key 對應的狀態；已刪除項目的孤兒狀態可清理。
- 提供已完成數／總數；不需連線寫回。

#### Currency

- 支援 `CZK`、`EUR`、`TWD` 雙向換算。
- 使用線上取得的匯率與最後成功快取。
- 顯示資料時間與基準幣別。
- 金額計算不得使用二進位浮點直接累積；輸入轉為整數最小單位或 decimal-safe 計算後再格式化。
- 離線或 API 失敗時使用最後成功匯率並顯示 `Last updated`；沒有快取時顯示無法取得，不得捏造 fallback 匯率。

#### Tickets & Bookings

- 只讀 Bookings。
- 依 Date、Time 升冪；無時間項目排在同日有時間項目之後。
- 顯示 Type icon、Title、BookingInfo、Note、日期與時間。
- Link 與 Address 按鈕依第 3.5 節規則呈現。

#### Quick Notes

- 不進 Google Sheet，只存在目前裝置。
- 可新增純文字 note、標記完成、取消完成與刪除。
- 離線可讀寫；重新整理或重開 PWA 後仍保留。
- 空白 note 不得儲存。
- 本功能不是正式 itinerary，也不取代 Info 的固定 Travel Notes。

### 5.4 Info

Info 是前端頁面，不建立 `Info` Sheet。它整合偶爾查詢但現場重要的資料，避免相同內容維護兩次。

區塊：

1. **Stays**：從 `Bookings.Type === 'Hotel'` 產生，顯示 BookingInfo、Address、Map 與 Booking link。
2. **Reserved Transport**：從 Bookings 的 `Flight / Train / Bus` 產生；一般每日交通仍只存在 Itinerary。
3. **Emergency**：由 Config 的對應固定資訊顯示；無資料時不顯示假電話。
4. **Trip Info / Travel Notes**：顯示不屬於某一天的固定旅行資訊；資料取自 Config。每日提醒仍放 Itinerary.Note。

資料歸屬準則：

- 某一天會發生的事：Itinerary。
- 已購買／已預約並需要票券或訂單：Bookings。
- 每日 overview：Trip。
- 行前清單：Checklist。
- 全旅程設定與少量固定資訊：Config。
- 途中臨時備忘：本機 Quick Notes。

## 6. European Travel Journal UI

### 6.1 視覺方向

採「European Travel Journal」旅行手帳風格：成熟、柔和、有手作感，但不能犧牲可讀性或操作效率。

色彩方向：

| Token | 用途 | 建議色相 |
|---|---|---|
| Paper | 全頁背景 | 奶油紙張 |
| Sage | 主色、選取狀態 | 鼠尾草綠 |
| Terracotta | 重點與標記 | 低飽和陶土色 |
| Dusty Blue | 次要資訊 | 灰藍 |
| Coffee | 主要文字與線條 | 咖啡棕 |

不得沿用 Seoul PWA 的粉紅櫻花主題，也不得使用刺眼高飽和色或純黑大面積區塊。

可使用的裝飾：

- 不規則手繪線。
- 郵戳、紙膠帶、小型建築 doodle。
- 輕微紙張紋理。

裝飾不得干擾資訊層級、點擊區或文字對比。動畫尊重 `prefers-reduced-motion`。

### 6.2 排版與元件

- 介面語言以英文標題搭配繁體中文資料為主。
- 字級最小 14px；重要內容 16px 以上。
- 點擊目標至少 44 × 44 CSS px。
- 卡片圓角、陰影與邊框保持低對比；手繪效果不可造成歪斜難讀。
- Timeline 必須一眼看出時間順序；Type icon 由資料映射，不要求 Sheet 輸入 emoji。
- 展開／收合卡應保留焦點與 `aria-expanded`。
- 網址、地址與按鈕文字過長時換行或截斷，不得撐破 viewport。

### 6.3 Mobile-first 與 safe area

- 必須包含 `viewport-fit=cover`。
- 使用 `env(safe-area-inset-top)` 與 `env(safe-area-inset-bottom)`。
- 支援 320px 寬度，不出現水平頁面捲動；Day selector 自身可橫向捲動。
- 桌面顯示限制內容最大寬度，不把手機卡片無限拉寬。
- 支援 standalone display；底部導覽在 Safari 與安裝後模式皆不可被 home indicator 遮住。

## 7. 天氣與匯率

### 7.1 天氣

- Today 顯示選取日期與城市的天氣摘要；API provider 可在實作階段選擇免密鑰或安全代理方案。
- 未來日期超出 provider forecast 範圍時顯示「尚無預報」，不得產生氣溫或天候。
- 成功結果需連同查詢時間與城市快取。
- 失敗時使用該城市最近一次成功資料，清楚顯示 `Last updated`。
- 完全沒有資料時顯示 unavailable state，不使用假晴天、假溫度或硬編碼 fallback。

### 7.2 匯率

- 支援 CZK、EUR、TWD。
- 顯示匯率更新時間；過期快取仍可換算，但狀態必須可見。
- 無網路且無快取時停用結果區並說明原因。

## 8. PWA 與離線策略

### 8.1 檔案

最終至少包含：

```text
index.html
manifest.json
sw.js
icons/
  icon-192.png
  icon-512.png
```

可依可維護性拆出 `styles.css`、`app.js`、`api.js` 等檔案；不得把正式資料 hard-code 到任一前端檔。

### 8.2 Manifest

- `name` 與 `short_name` 反映 Europe 2026 行程。
- `display: standalone`。
- 設定與設計系統一致的 `theme_color`、`background_color`。
- `start_url` 與 `scope` 必須適用 GitHub Pages 的 repository 子路徑，不可假設部署在網域根目錄。
- 提供 192 與 512 圖示；建議另提供 maskable icon。

### 8.3 Service Worker

策略：

- App shell：precache，cache-first，版本化 cache name。
- 導航：network-first，失敗時回傳已快取的 `index.html`。
- Google Apps Script 行程 API：由應用層 network-first；只有通過 schema 驗證的成功 payload 才更新本機資料快取。
- 天氣與匯率：network-first，失敗時使用各自最後成功資料；不得與行程 payload 混為同一份快取。
- 不快取跨網域頁面、Google Maps 頁面、票券頁面或 booking 網頁內容。

新版 Service Worker 啟用後清理舊版本 cache，但不可刪除 Quick Notes、Checklist 狀態或最近成功的結構化資料。

### 8.4 結構化資料快取

至少保存：

- 最近一次通過驗證的完整行程 response。
- 行程同步成功時間。
- 最近成功天氣及其時間／城市。
- 最近成功匯率及其時間。
- Checklist 本機完成狀態。
- Quick Notes。

儲存媒介可選 localStorage 或 IndexedDB。若完整 response 未來可能超過 localStorage 容量，應優先使用 IndexedDB；無論選擇何者，都要包裝成單一 storage adapter，避免 UI 直接散落存取。

### 8.5 同步與狀態

有網路時：

1. 先顯示已快取資料，避免空白畫面。
2. 背景請求最新 API。
3. 驗證成功後更新畫面與快取。
4. 顯示 `Online · Updated HH:mm`。

離線或同步失敗時：

- 有快取：顯示 `Offline · Last updated HH:mm`，繼續提供所有可用資料。
- 無快取：顯示明確 empty/error state 與 Retry，不顯示示範行程。
- 網路恢復時可自動重試一次，亦提供手動 refresh。

## 9. 安全、隱私與可靠性

- 不在 repository、前端或 Sheet 內放 API secret。
- 所有外部 URL 開啟時使用安全的 `noopener,noreferrer`。
- Sheet 文字以 `textContent` 或等效 escaping 輸出，禁止直接拼接未消毒 HTML。
- Apps Script 錯誤不得洩漏 Sheet 內容、內部 stack 或權限設定。
- 不要求相機、定位、通知或聯絡人等非必要權限。
- 地圖導航以 Address 建立 URL 時必須 `encodeURIComponent`。
- Copy Address 失敗時提供可選取文字的 fallback。
- 同一筆同步重複執行必須冪等，不產生重複卡片或重複 Quick Notes。

## 10. 實作分期

### Phase 1：核心 UI 與資料 renderer

- 建立 `index.html` 與必要 CSS／JS。
- 完成 Today、Journey、Tools、Info 四頁。
- 使用符合正式 API contract 的 fixture 開發，API_URL 保留 placeholder。
- 完成 responsive、safe area、卡片展開、Day selector 與本機功能。
- 不在此階段加入 Service Worker，以免 UI、API 與 SW 同時除錯。

### Phase 2：PWA 與離線

- 加入 manifest、icons、sw.js。
- 完成 app shell、行程資料、天氣、匯率與本機狀態的離線策略。
- 驗證 GitHub Pages 子路徑部署與 iPhone standalone。

### Phase 3：正式 Apps Script API

- 依第 4 節輸出 JSON。
- 替換 API_URL。
- 以真實五張 Sheet 做端到端驗收。

## 11. Acceptance criteria

### 11.1 Google Sheet 與 API

- [ ] 只使用 `Config / Trip / Itinerary / Bookings / Checklist` 五張 Sheet。
- [ ] 欄位名稱、順序與本文件一致；Bookings 沒有 EndDate、Subtitle、Website。
- [ ] Day 儲存為數字，Date 可由 StartDate + Day - 1 正確產生，沒有循環相依。
- [ ] API 一次回傳五張表資料，shape 與第 4 節一致。
- [ ] 空表回傳空陣列；空欄回傳空字串。
- [ ] 無效列不會使 App 整體 crash；上次有效資料不被壞 response 覆蓋。

### 11.2 Today

- [ ] 開啟 App 預設進 Today。
- [ ] 旅行期間依 Config.Timezone 自動選到正確 Day；旅程前後有明確 fallback。
- [ ] Day selector 完全由資料產生，新增 Day 13 不需改程式。
- [ ] Timeline 依 Time 排序，相同時間與空白時間的順序穩定。
- [ ] 卡片可展開 Address、Note 與有效動作；空欄不留下空標籤或空按鈕。
- [ ] Navigate、Copy Address、Website 與 Booking/Ticket link 語意正確。

### 11.3 Journey

- [ ] 國家、城市、天數統計由 Trip 計算。
- [ ] 依國家與 Day 正確排序。
- [ ] 顯示人工維護的 Trip.Summary，不由 Itinerary 自動猜摘要。
- [ ] 點擊任一天會切到 Today 的正確 Day，重新整理後仍可還原該 Day。

### 11.4 Tools 與 Info

- [ ] Tools 顯示 Checklist、Currency、Tickets & Bookings、Quick Notes 四項，沒有 Expense。
- [ ] Checklist 依 Category 分組，完成狀態在離線、重整與重開後保留。
- [ ] Currency 支援 CZK/EUR/TWD，顯示更新時間，無資料時不提供假匯率。
- [ ] Bookings 依日期／時間排序，依 Type 顯示合理按鈕文字。
- [ ] Quick Notes 可新增、完成、取消完成、刪除；空白不儲存且不進 Sheet。
- [ ] Info 沒有獨立 Sheet；Stays 與 Reserved Transport 由 Bookings 派生。
- [ ] 一般每日交通只從 Itinerary 顯示，不在 Info 重複維護。

### 11.5 PWA 與離線

- [ ] 可由支援的瀏覽器安裝，manifest 無錯誤，192/512 icons 可載入。
- [ ] GitHub Pages repository 子路徑下的 start_url、scope、asset 與 SW 路徑正確。
- [ ] 至少成功上線一次後切離線，重新開啟仍可看到 App shell 與最後同步行程。
- [ ] 離線時可切 Day、展開卡片、讀住宿、查看 Checklist、編輯 Quick Notes。
- [ ] 天氣與匯率離線時顯示最後更新時間；沒有快取時顯示 unavailable，不顯示假資料。
- [ ] API 失敗、HTTP 非 200、invalid JSON、schema 錯誤與首次離線都有可理解的 UI。
- [ ] 更新 SW 後不會清掉 Quick Notes、Checklist 狀態或最近成功行程。

### 11.6 UI、裝置與可及性

- [ ] 320px 寬度無頁面水平 overflow，底部導覽不遮內容。
- [ ] iPhone Safari 與 standalone 模式正確處理上下 safe area。
- [ ] 主要點擊區至少 44 × 44 CSS px。
- [ ] 鍵盤可操作四個頁籤、Day selector、卡片與按鈕；焦點可見。
- [ ] 色彩對比符合 WCAG AA；裝飾不承擔唯一資訊語意。
- [ ] `prefers-reduced-motion` 下移除非必要動畫。
- [ ] 長標題、長地址、空 Note、未知 Type、重複時間與無行程日不破版。

### 11.7 禁止事項

- [ ] 不 hard-code Day 1–12 或正式行程內容。
- [ ] 不新增 Expense／記帳功能。
- [ ] 不建立 Info、Stays、Tickets 等額外 Sheet。
- [ ] 不把 Itinerary.Link 與 Bookings.Link 混用。
- [ ] 不生成假的天氣、匯率、電話、地址或票券資料。
- [ ] 不提交 API key、secret 或私人憑證。
- [ ] 不直接信任或以 `innerHTML` 渲染 Sheet 內容。

## 12. 交付與驗證證據

每一階段交付時，Codex 必須附上：

- 修改／新增檔案清單。
- 對應本文件 acceptance criteria 的測試結果。
- 至少 320px mobile、iPhone safe-area 與 desktop 三種 viewport 的畫面驗證。
- 線上、快取命中、首次離線、API 壞資料四種狀態的實測證據。
- 尚未能驗證的項目與原因，不得用「應可運作」代替。

Phase 1 尚未接正式 Apps Script 時，必須明確標示 fixture 測試；只有 Phase 3 以真實 Sheet 完成端到端讀取後，才能宣稱資料串接完成。
