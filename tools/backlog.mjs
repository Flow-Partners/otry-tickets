// Backlog definition: modules -> stories -> layered tasks (db / api / ui / qa) with subtasks.
// Story shape: [title, size(1-3), acceptanceCriteria[], {db:[..], api:[..], ui:[..], qa:[..]}]
export const SPRINT_START = '2026-11-30';
export const SPRINT_DAYS = 14;

export const modules = [
 { key:'FND', name:'Foundation & Environment', prio:'P0', sprint:0, deps:[], summary:'Dev environment, architecture, SQL 2008 R2 conventions, branch-aware schema baseline, CI.',
  stories:[
   ['Dev environment and toolchain',1,['.NET 8 SDK and Angular deps install from a clean checkout','Solution builds with 0 errors','Ticket repo cloned and readable'],{
     api:['Install .NET 8 SDK [done]','Restore and build API solution [done]','Document run/test commands in README'],
     ui:['Install Angular dependencies with npm ci [done]','Verify ng build and lint']}],
   ['Architecture and conventions',2,['Layered Controllers->Services->Repositories documented','ApiResponse, paging and error shapes reused by every module','SQL 2008 R2 rules (no OFFSET/FETCH, CONCAT, IIF, THROW) written as a checklist'],{
     api:['Write architecture decision records (ADR)','Define module folder layout and naming','Add SQL 2008 R2 compatibility checklist and EF query-string review step','Define BranchId tenancy approach on every branch-scoped table']}],
   ['Schema baseline and migration safety',2,['Initial POS schema migration is additive and runs on SQL 2008 R2','Row version / audit columns standard on all entities','Seed script for units, payment methods and settings'],{
     db:['Design ERD for all modules','Base entity (Id, CreatedAt/By, UpdatedAt/By, RowVersion)','Reference seed: units, payment methods, expense types','Migration script review against 2008 R2 prohibited list']}],
   ['CI and test harness',1,['PR build runs build + unit tests','API integration test fixture available for all modules'],{
     api:['Build pipeline for API','Integration test base class with test database','Test data builders']}],
  ]},
 { key:'ACC', name:'Users, Roles & Access', prio:'P0', sprint:0, deps:['FND'], summary:'Extend the template RBAC to Owner / Manager / Cashier with POS permissions and branch assignment.',
  stories:[
   ['POS roles and permission catalogue',2,['Owner, Manager and Cashier roles seeded with documented permissions','Permissions follow the role matrix in the spec'],{
     db:['Seed POS permissions and role grants'],
     api:['Policy attributes per POS permission','Permission check helper for manager override'],
     ui:['Role/permission screen shows POS permissions'],
     qa:['Role matrix test: every endpoint x every role','Token tampering and expired token cases']}],
   ['User management and PIN login for cashiers',2,['Admin creates users with role and branches','Cashier can sign in quickly with PIN where enabled','Failed logins recorded'],{
     api:['User create/update with branch list','PIN set/reset (hashed)','Lockout after repeated failures'],
     ui:['Users screen with branch picker','Quick PIN sign-in'],
     qa:['Boundary tests on password/PIN rules','Brute-force lockout test']}],
   ['Manager override approval',2,['Actions above a limit require a manager credential','Override is logged with approver'],{
     db:['ManagerOverride table'],
     api:['Override request/approve service','Apply override to returns, credit limit and day reopen'],
     ui:['Override dialog'],
     qa:['Override denied for cashier credential','Override logged']}],
  ]},
 { key:'PRD', name:'Product Management', prio:'P0', sprint:1, deps:['FND','ACC'], summary:'Products with company, category, unit, prices, discount, minimum stock, opening stock, status (spec 2.1).',
  stories:[
   ['Categories, sub-categories, companies and units',1,['CRUD for each lookup','Sub-category belongs to one category','Cannot delete a lookup that is in use'],{
     db:['Category, SubCategory, Company, Unit tables'],
     api:['CRUD endpoints with paging and search'],
     ui:['Lookup management screens'],
     qa:['Delete-in-use returns conflict','Duplicate name rejected']}],
   ['Create and edit product',3,['Unique product code generated automatically and never reused','Discount fixed or percent; discounted price computed server-side','Profit per unit returned','Opening stock creates the first stock movement','Inactive products excluded from billing'],{
     db:['Product table with code sequence table (no SEQUENCE objects)','Index on name and code'],
     api:['Product create/update/get/list with filters','Code generator using a counter row with locking','Price and discount calculation service','Opening stock posts stock movement'],
     ui:['Product form with live discounted price and profit','Product list with search, filter, paging'],
     qa:['Negative: sale price below zero, discount over 100%','Boundary: 0, max decimal scale, very long name','Concurrent create yields unique codes','Product DTO never exposes entity']}],
   ['Product activate, deactivate and import',1,['Deactivation keeps history','CSV import validates rows and reports errors per row'],{
     api:['Toggle active endpoint','CSV import with dry-run'],
     ui:['Import wizard'],
     qa:['Import with bad rows','Deactivated product not sellable']}],
  ]},
 { key:'BAR', name:'Multiple Barcodes', prio:'P0', sprint:1, deps:['PRD'], summary:'Many barcodes per product, globally unique, history preserved (spec 2.2).',
  stories:[
   ['Barcode assignment and uniqueness',2,['Any barcode resolves to its product','A barcode cannot belong to two products and the API says which product has it','Removed barcodes are retired, not deleted'],{
     db:['ProductBarcode table with unique index and IsActive/RetiredAt'],
     api:['Add/retire barcode endpoints','Lookup by barcode (fast path)','Conflict response naming the owning product'],
     ui:['Barcode chips editor on product form with warning'],
     qa:['Duplicate barcode across products','Whitespace/case and max-length barcode','Lookup performance smoke']}],
   ['Generate internal barcodes',1,['System can generate an internal EAN-style code for loose items','Generated codes never collide'],{
     api:['Internal barcode generator with check digit'],
     qa:['Generator uniqueness under concurrency']}],
  ]},
 { key:'SUP', name:'Suppliers', prio:'P1', sprint:1, deps:['FND'], summary:'Supplier master used by purchase orders, suggestions and purchase history.',
  stories:[
   ['Supplier CRUD and product links',2,['Suppliers store contact and payment terms','Product can have preferred supplier(s) and last cost'],{
     db:['Supplier, ProductSupplier tables'],
     api:['Supplier CRUD','Link/unlink products'],
     ui:['Suppliers screen'],
     qa:['Duplicate phone/name rules','Deleting supplier with orders blocked']}],
  ]},
 { key:'PHI', name:'Price Change History', prio:'P1', sprint:1, deps:['PRD'], summary:'Every price or discount change recorded; bills and profit use the price applicable at sale time (spec 2.22).',
  stories:[
   ['Record price changes',2,['Purchase price, sale price and discount changes create history rows with user and time','History is append-only'],{
     db:['ProductPriceHistory with effective-from / effective-to'],
     api:['Capture changes in product update service','Price-at-date query for reports'],
     qa:['Update without change creates no row','History cannot be edited through API']}],
   ['Price history view',1,['Product page lists price history'],{
     api:['Price history list endpoint'],
     ui:['Price history tab on product page'],
     qa:['Paging and ordering']}],
  ]},
 { key:'AUD', name:'Audit Log', prio:'P1', sprint:1, deps:['FND','ACC'], summary:'Immutable record of sensitive actions with old and new values (spec 2.21).',
  stories:[
   ['Audit writer and storage',2,['Sensitive actions write user, time, action, entity, old and new values','No update or delete route or permission exists for audit rows'],{
     db:['AuditLog table, no update/delete grants in scripts','Indexes on date, user, action'],
     api:['IAuditService and attribute/helper for services','Capture login and failed login events'],
     qa:['Attempt to modify audit via API returns 404/405','Old/new values captured on price change']}],
   ['Audit search',1,['Admin searches by user, date range and action with paging'],{
     api:['Audit search endpoint (ROW_NUMBER paging)'],
     ui:['Audit log screen'],
     qa:['Non-admin forbidden','Date range boundary']}],
  ]},
 { key:'STK', name:'Stock Management', prio:'P0', sprint:2, deps:['PRD','BAR'], summary:'Stock ledger per branch; decreases on sale, increases on receive, manual adjustments (spec 2.7).',
  stories:[
   ['Stock ledger and current stock',3,['Every change is a StockMovement row with reason, user and time','Current stock equals the sum of movements','Stock is per branch'],{
     db:['StockMovement and StockBalance (per branch) tables','Index for balance lookups'],
     api:['Stock posting service (single entry point, transactional)','Current stock list with filters','Movement history endpoint'],
     ui:['Stock list and movement history screens'],
     qa:['Concurrent postings keep balance correct','Negative adjustment rules','Balance equals ledger sum check']}],
   ['Manual adjustments and write-off',2,['Adjustment requires a reason','Damaged / expired / count-error reasons selectable','Write-off recorded as waste'],{
     api:['Adjustment endpoint with reason codes','Write-off endpoint'],
     ui:['Adjustment dialog'],
     qa:['Missing reason rejected','Audit entry created']}],
  ]},
 { key:'BIL', name:'Sales / Billing', prio:'P0', sprint:2, deps:['STK','PRD','BAR','ACC'], summary:'Scan-and-bill screen, payments, hold and resume, stock deduction (spec 2.3).',
  stories:[
   ['Create bill (scan, quantity, totals)',3,['Scanning adds item; same item again adds 1','Fractional quantity supported (e.g. 2.5 kg)','Line and bill totals computed server-side','Price and discount snapshot stored on the line'],{
     db:['Bill, BillLine, BillPayment tables','Daily bill number counter table'],
     api:['Draft bill + add/update/remove line endpoints','Totals calculator','Item search by name for damaged barcodes'],
     ui:['Billing screen with persistent scan focus','Live totals and line editing'],
     qa:['Quantity 0, negative, 5 decimals','Inactive/unknown barcode','Client-sent totals ignored']}],
   ['Payment and finalise',3,['Cash, card, other and split payments supported','Change due shown','Finalising deducts stock atomically and assigns BILL-yyyymmdd-nnnn'],{
     api:['Finalise bill transaction (stock, payments, number)','Payment validation (received >= total for cash)','Receipt DTO for printing'],
     ui:['Payment dialog with change due','Print receipt'],
     qa:['Underpayment rejected','Double-submit finalise is idempotent','Stock never negative without policy','Bill number uniqueness under load']}],
   ['Hold and resume bills',1,['A bill can be put on hold and resumed by any cashier on the same till','Held bills do not move stock'],{
     api:['Hold/resume/list held endpoints'],
     ui:['Held bills drawer'],
     qa:['Resume already-finalised bill rejected']}],
  ]},
 { key:'BHS', name:'Bill History', prio:'P1', sprint:2, deps:['BIL'], summary:'Search, view, reprint bills; cancellations recorded not deleted (spec 2.4).',
  stories:[
   ['Search and view bills',2,['Search by bill number, date, cashier and amount','Bill detail shows items, discount and payment'],{
     api:['Bill search with paging','Bill detail endpoint'],
     ui:['Bill history list and detail'],
     qa:['Cashier sees only own branch','Amount range boundaries']}],
   ['Reprint and cancel',2,['Reprint is logged','Cancel records reason, restores stock and keeps the bill'],{
     api:['Reprint endpoint','Cancel endpoint with permission and reason'],
     ui:['Reprint and cancel actions'],
     qa:['Cancel twice rejected','Cancel audit entry']}],
  ]},
 { key:'PCK', name:'Price Checker', prio:'P2', sprint:2, deps:['PRD','BAR'], summary:'Full-screen scan or name search showing only name, price and discounted price (spec 2.5).',
  stories:[
   ['Price lookup API and screen',1,['Endpoint returns only name, price, discounted price','Works full screen on tablet/phone'],{
     api:['Minimal DTO lookup by barcode or name'],
     ui:['Full-screen price checker screen'],
     qa:['No cost or stock fields leak','Unknown barcode returns 404 cleanly']}],
  ]},
 { key:'PLB', name:'Barcode Printing', prio:'P2', sprint:3, deps:['BAR'], summary:'Barcode sticker printing for loose items (spec 2.6).',
  stories:[
   ['Label templates and print',2,['Choose sticker size and count','Label shows name, barcode, price and optional weight/date','Generates barcode if missing'],{
     db:['LabelTemplate table'],
     api:['Label render endpoint (PNG/PDF or print job)','Reuse printing module of template'],
     ui:['Print barcode dialog on product'],
     qa:['Count boundary (0, 1, max)','Missing barcode auto-generation']}],
  ]},
 { key:'PUR', name:'Purchase Suggestions', prio:'P1', sprint:3, deps:['STK','BIL','SUP'], summary:'Suggest quantities for 1/7/15/30 days from sales velocity (spec 2.8).',
  stories:[
   ['Suggestion calculation',3,['quantity = avg daily sales x days - current stock','Only items needing stock shown','Filter by company, category, supplier'],{
     api:['Sales velocity query (SQL 2008 R2 safe)','Suggestion service for 1/7/15/30 days','Filter parameters'],
     ui:['Suggestions screen with period selector'],
     qa:['Zero-sales product','New product with no history','Stock above need excluded','Performance smoke on large catalogue']}],
  ]},
 { key:'PO', name:'Purchase Orders & Receiving', prio:'P0', sprint:3, deps:['PUR','SUP','STK'], summary:'Edit suggestions, place pending orders, receive full/partial, update stock and cost (spec 2.9, 2.10).',
  stories:[
   ['Create and edit purchase order',2,['Suggestion lines editable, removable, extra items addable','Place Order saves as Pending'],{
     db:['PurchaseOrder, PurchaseOrderLine tables'],
     api:['Create from suggestion','Edit lines while Pending','Place/cancel order'],
     ui:['Order builder screen'],
     qa:['Edit received order rejected','Quantity <= 0 rejected']}],
   ['Receive order',3,['Confirm arrived quantities; partial receive supported','Stock increases automatically','Optional purchase price update with price history','Status Pending -> Received / Partially Received / Cancelled'],{
     api:['Receive endpoint (transactional)','Capture batch and expiry when enabled','Update cost option'],
     ui:['Receive dialog'],
     qa:['Receive more than ordered policy','Receive twice is idempotent','Stock and ledger match']}],
   ['Pending orders list and history',1,['Pending orders visible until arrival','History keeps received orders'],{
     api:['List by status and supplier'],
     ui:['Pending and history tabs'],
     qa:['Status filter correctness']}],
  ]},
 { key:'LOW', name:'Low / Out-of-Stock', prio:'P1', sprint:3, deps:['STK','PO'], summary:'Low and zero stock screen with days-left and reorder shortcut (spec 2.11).',
  stories:[
   ['Low and out-of-stock reporting',2,['Low when at/below minimum or days-left small','Out of stock when zero','Reorder button adds to a new order'],{
     api:['Low-stock query with days-of-stock-left','Reorder endpoint'],
     ui:['Low / Out-of-stock screen'],
     qa:['Minimum equals current boundary','No-sales items']}],
  ]},
 { key:'EXP', name:'Expiry Dates & Batches', prio:'P1', sprint:4, deps:['STK','PO','BIL'], summary:'Batch tracking, FEFO selling, expiring-soon, expired write-off (spec 2.15).',
  stories:[
   ['Batches on receive',2,['Batch number and expiry captured per receipt (optional per product)','Multiple batches per product'],{
     db:['StockBatch table, link StockMovement to batch'],
     api:['Batch creation on receive'],
     ui:['Batch fields on receive dialog'],
     qa:['Expiry in the past warning','Optional flag respected']}],
   ['FEFO billing and expired block',3,['Billing deducts from earliest expiry first','Expired item warns or blocks per setting'],{
     api:['FEFO allocation in bill finalise','Expired policy setting'],
     ui:['Expired warning on billing'],
     qa:['Allocation across two batches','Expired blocked']}],
   ['Expiring soon and write-off',1,['List within 7/15/30 days','One-click write-off logs waste'],{
     api:['Expiring query','Write-off batch endpoint'],
     ui:['Expiring soon screen'],
     qa:['Window boundaries']}],
  ]},
 { key:'RET', name:'Returns & Refunds', prio:'P1', sprint:4, deps:['BIL','BHS','STK','ACC'], summary:'Returns linked to original bill; refund methods; waste vs restock; manager approval (spec 2.14).',
  stories:[
   ['Return against a bill',3,['Cannot return more than sold minus already returned','Return receipt has its own number linked to the bill','Original bill unchanged'],{
     db:['SaleReturn, SaleReturnLine tables'],
     api:['Create return with validation','Return number generator'],
     ui:['Return flow from bill history'],
     qa:['Over-return rejected','Second partial return arithmetic']}],
   ['Refund methods, restock and waste',2,['Cash back, store credit, exchange supported','Good items restock, damaged/expired go to waste','Above-limit returns need manager approval'],{
     api:['Refund handling by method','Restock/waste posting','Approval threshold check'],
     ui:['Refund method and condition selectors'],
     qa:['Cashier above limit blocked','Waste does not increase stock']}],
  ]},
 { key:'CRD', name:'Customer Credit (Khata)', prio:'P1', sprint:4, deps:['BIL','ACC'], summary:'Customers, credit sales, payments, ledger, limits (spec 2.16).',
  stories:[
   ['Customers and credit limits',2,['Customer with name, phone and optional limit','Limit changes audited'],{
     db:['Customer, CustomerLedger tables'],
     api:['Customer CRUD'],
     ui:['Customers screen'],
     qa:['Duplicate phone','Negative limit rejected']}],
   ['Credit sale and payments',3,['Credit bill adds to balance','Partial/full payments reduce balance','Over-limit blocked unless manager override'],{
     api:['Credit payment method in finalise','Receive payment endpoint','Limit check with override'],
     ui:['Select customer on billing','Receive payment dialog'],
     qa:['At-limit boundary','Overpayment handling','Ledger running balance correct']}],
   ['Ledger and pending balances',2,['Ledger lists every bill and payment with running balance','Pending balances screen shows amount and age'],{
     api:['Ledger endpoint','Pending balances with aging'],
     ui:['Ledger and pending balances screens'],
     qa:['Ledger sums equal balance']}],
  ]},
 { key:'CSH', name:'Daily Cash Closing', prio:'P1', sprint:4, deps:['BIL','RET','CRD'], summary:'Shifts, expected vs counted cash, closing report (spec 2.17).',
  stories:[
   ['Shift open and close',3,['Open shift with opening cash','Expected = opening + cash sales - cash refunds - cash expenses','Difference needs a note','Closed day locked'],{
     db:['Shift, CashExpense tables'],
     api:['Open/close shift','Expense entry','Reopen with manager approval'],
     ui:['Cash closing screen'],
     qa:['Close without note when different rejected','Edit closed day rejected','Two open shifts per till rejected']}],
   ['Closing report',1,['Totals by method, bills and returns count'],{
     api:['Closing report endpoint'],
     ui:['Closing report view'],
     qa:['Report totals equal source bills']}],
  ]},
 { key:'RPT', name:'Reports', prio:'P1', sprint:5, deps:['BIL','RET','PHI','STK','CRD','PO'], summary:'Sales, profit, best/slow sellers, stock value, expiry, returns, credit, purchases with export (spec 2.18).',
  stories:[
   ['Sales and profit reports',3,['Daily/monthly sales by payment method','Profit uses purchase price at sale date','Filters: date, category, company, cashier'],{
     api:['Sales report queries','Profit report using price history'],
     ui:['Sales and profit report screens'],
     qa:['Profit after price change uses old cost','Empty range','Date boundary inclusive']}],
   ['Stock, expiry, returns and credit reports',2,['Stock valuation, low stock, expiry','Returns and discounts given','Customer credit and purchase history'],{
     api:['Remaining report endpoints'],
     ui:['Report screens'],
     qa:['Totals reconcile with ledgers']}],
   ['Export to Excel and PDF',2,['Every report exports and prints'],{
     api:['Excel export','PDF export'],
     ui:['Export buttons'],
     qa:['Large export performance smoke','Export respects filters and permissions']}],
  ]},
 { key:'BKP', name:'Automatic Backup', prio:'P1', sprint:5, deps:['FND'], summary:'Daily backup, retention, offsite copy, restore, dashboard status (spec 2.19). Builds on the template BackupController.',
  stories:[
   ['Scheduled backup and retention',2,['Daily backup job runs and on-demand backup works','Old backups pruned after N days','Failure raises a warning'],{
     api:['Review and extend template backup service','Scheduler and retention policy','Secondary copy target setting'],
     ui:['Backup settings'],
     qa:['Failed backup surfaces on dashboard','Retention boundary']}],
   ['Restore',2,['Admin can restore from a backup with confirmation'],{
     api:['Restore endpoint with safeguards'],
     ui:['Restore dialog'],
     qa:['Non-admin forbidden','Corrupt backup file handled']}],
  ]},
 { key:'DSH', name:'POS Dashboard', prio:'P2', sprint:5, deps:['BIL','STK','PO','BKP'], summary:'Home dashboard: today sales, low stock, pending orders, last backup.',
  stories:[
   ['Operational dashboard',2,['Today sales, low stock count, pending orders, last backup time','Owner can switch branch or all branches'],{
     api:['Dashboard summary endpoint'],
     ui:['Dashboard cards'],
     qa:['Branch scoping','Cache/performance smoke']}],
  ]},
 { key:'OFF', name:'Offline Mode & PWA', prio:'P0', sprint:6, deps:['BIL','PRD','BAR'], summary:'Installable PWA; billing, lookup and price check work offline; automatic sync (spec 2.12, 2.13).',
  stories:[
   ['Installable PWA and responsive layouts',2,['Installable on phone/tablet','Owner views stock, suggestions, orders from mobile'],{
     ui:['Manifest, icons and service worker','Responsive layouts for owner screens']}],
   ['Offline catalogue and local bills',3,['Products, barcodes and prices cached on device','Offline bills stored with temporary unique numbers','Status badge Online/Offline/Syncing'],{
     ui:['IndexedDB catalogue cache','Offline bill queue','Status badge'],
     api:['Catalogue delta endpoint']}],
   ['Sync endpoint',3,['Automatic sync when online','Same offline bill sent twice is saved once','Temp number linked to final number'],{
     db:['OfflineBillMap table (client id -> bill)'],
     api:['Idempotent batch sync endpoint','Stock update on sync'],
     qa:['Duplicate bill detection','Partial batch failure handling','Large batch smoke']}],
  ]},
 { key:'SYN', name:'Offline Conflict Handling', prio:'P1', sprint:6, deps:['OFF','STK'], summary:'Never block a synced sale; flag negative stock for manager review (spec 2.20).',
  stories:[
   ['Sync review queue',3,['Sale never rejected for stock reasons','Negative stock creates a review flag','Manager fixes via adjustment or ignores','Old-price bills keep sale-time prices'],{
     db:['SyncReviewFlag table'],
     api:['Flag creation on sync','Resolve endpoints'],
     ui:['Sync Review screen'],
     qa:['Two offline sales of last item','Price change while offline keeps bill price']}],
  ]},
 { key:'BRN', name:'Multiple Branches', prio:'P1', sprint:6, deps:['STK','BIL','ACC','PO','CSH'], summary:'Branch-scoped stock, bills, cash, users and orders; shared catalogue; transfers; owner roll-up (spec 2.23).',
  stories:[
   ['Branch master and user scoping',2,['Users see only assigned branches','Branch context on every scoped query'],{
     db:['Branch, UserBranch tables; BranchId on scoped tables'],
     api:['Branch CRUD','Scoping filter in repositories'],
     ui:['Branch switcher and management'],
     qa:['Cross-branch access denied for every scoped endpoint']}],
   ['Per-branch pricing',2,['Prices same everywhere or overridden per branch'],{
     db:['BranchProductPrice table'],
     api:['Price resolution service'],
     qa:['Override precedence']}],
   ['Stock transfers',3,['Sent and received records','Stock moves only on receive','In-transit visible'],{
     db:['StockTransfer, StockTransferLine'],
     api:['Create/send/receive transfer'],
     ui:['Transfers screen'],
     qa:['Receive twice idempotent','Transfer more than available rejected']}],
   ['All-branch roll-up',1,['Owner views one branch or combined in reports and dashboard'],{
     api:['Branch filter parameter on reports/dashboard'],
     qa:['Combined totals equal sum of branches']}],
  ]},
 { key:'QAA', name:'API QA & Security', prio:'P0', sprint:7, deps:['PRD','BIL','PO','RET','CRD','CSH','RPT','OFF','BRN'], summary:'API-only QA: functional, negative, boundary, security and performance smoke across all endpoints.',
  stories:[
   ['QA strategy and endpoint inventory',2,['Test plan with endpoint matrix','Traceability from each endpoint to test cases'],{
     qa:['Generate endpoint inventory from Swagger','Test plan document','Traceability matrix']}],
   ['Functional and negative suites',3,['Every endpoint has happy-path and negative tests','Validation errors use ApiResponse shape'],{
     qa:['Functional suite per module','Negative suite (invalid, missing, wrong role)','Boundary suite (limits, decimals, dates)']}],
   ['Security suite',3,['AuthN/AuthZ on every endpoint','Injection, mass-assignment and IDOR checks','No entities or secrets exposed'],{
     qa:['Auth matrix tests','SQL injection and XSS payloads on string inputs','IDOR checks across branches','Response data exposure review']}],
   ['Performance smoke',2,['p95 targets met on billing, search and reports at agreed data volume'],{
     qa:['Seed large dataset','Load script for billing/finalise','Report and search timing']}],
   ['SQL 2008 R2 compatibility audit',2,['No prohibited syntax in migrations or generated SQL'],{
     qa:['Scan migrations for prohibited syntax','Capture EF ToQueryString for key queries','Run against SQL 2008 R2 instance']}],
  ]},
 { key:'PMD', name:'Project Management & Handover', prio:'P1', sprint:7, deps:['FND'], summary:'Plan, ticket repo, live dashboard and final handover docs.',
  stories:[
   ['Project plan and ticket system',2,['Plan with sprints, estimates and dependencies','Tickets for every module in the ticket repo'],{
     api:['Project plan document [done]','Generate ticket files per module [in progress]']}],
   ['Live ticket dashboard',2,['Dashboard shows status, % complete, burndown, blockers per ticket','Refreshable from ticket repo data'],{
     ui:['Build dashboard artifact [in progress]','Ticket data refresh script']}],
   ['Handover documentation',2,['Architecture, DB schema, API reference, QA report, runbook and user guide'],{
     api:['Architecture and DB docs','API reference from Swagger','QA report','Runbook and user guide']}],
  ]},
];
