# EOS Cloud - File Import Feature Analysis

**Date:** March 20, 2026  
**Status:** Comprehensive Feature Analysis

---

## Executive Summary

The EOS Cloud ordering system supports **4 distinct file import mechanisms**:
1. **OBX files** — pCon.planner XML exports from Eastern Graphics furniture design software
2. **SIF files** — Herman Miller's proprietary text-based order place format (legacy, deprecated)
3. **Excel (XLSX) files** — Templated imports for customers, orders, and quotes
4. _(CSV planned but not yet implemented)_

The Excel import is **template-based and comprehensive**, with schema validation, multi-worksheet support (for orders/quotes), protected sheets, and detailed cell-level validation. All three formats allow dealers to import product configurations, customer data, or entire orders directly into the system with fallback to specials for items not found in the PDM catalog.

---

## 1. FILE IMPORT ARCHITECTURE

### Implementation Locations
- **OBX/SIF Imports:** [EOSCloud/Classes/FileImport.cs](EOSCloud/Classes/FileImport.cs) (638 lines)
  - ImportFileOBX() — pCon.planner XML imports
  - ImportFileSIF() — OrderPlace text imports
  
- **Excel Imports:** 
  - [EOSCloud/Controllers/CustomersController.cs](EOSCloud/Controllers/CustomersController.cs) — Customer Excel imports
  - [EOSCloud/Controllers/OrdersController.cs](EOSCloud/Controllers/OrdersController.cs) — Order Excel imports
  - [EOSCloud/Controllers/QuotesController.cs](EOSCloud/Controllers/QuotesController.cs) — Quote Excel imports

- **Test Suite:** [EOSCloud.Tests.Unit/FileImportTests.cs](EOSCloud.Tests.Unit/FileImportTests.cs)
- **Test Data:** [EOSCloud.Tests.Unit/ImportFileImportTestData.cs](EOSCloud.Tests.Unit/ImportFileImportTestData.cs)

### Public Methods
```csharp
// Import OBX files (pCon.planner XML exports)
public async Task<bool> ImportFileOBX(
    IFormFile files, 
    OrderDto order, 
    QuoteDto quote, 
    bool prodbasedonstdcontractinput, 
    StringBuilder MessageBuilder, 
    IStringLocalizer Localizer, 
    IMapper AutoMapper, 
    IModelStateDictionary CustomModelState,
    BaseController baseController, 
    string Who, 
    WebApiClient WebApiClient, 
    BaseController controller, 
    ILogger _logger = null
)

// Import SIF files (OrderPlace text format)
public void ImportFileSIF(
    IFormFile files, 
    OrderDto order, 
    bool prodbasedonstdcontractinput, 
    StringBuilder MessageBuilder, 
    IStringLocalizer Localizer, 
    IMapper AutoMapper, 
    IModelStateDictionary CustomModelState,
    BaseController baseController, 
    string Who, 
    WebApiClient WebApiClient, 
    OrdersController ordersController
)

// Upload imported file as document
public async Task<bool> UploadDocumentAsync(
    IFormFile file, 
    OrderDto order, 
    QuoteDto quote, 
    ...
)

// Cluster management (used for grouped imports)
public void AddOrderParentItemAndChildrenToCluster(...)
public void AddQuoteParentItemAndChildrenToCluster(...)
```

---

## 2. FILE FORMAT ANALYSIS

### 2.1 OBX Files (pCon.planner) — ✅ IMPLEMENTED

**Format:** XML (Binary serialized to `.obx` extension)  
**Source:** Eastern Graphics pCon.planner/pCon.basket furniture design software  
**Use Case:** Furniture designers pre-configure room layouts in 3D, export as OBX for sales quote generation

**File Structure:**
```xml
<?xml version='1.0' encoding='UTF-8'?>
<cutBuffer>
  <versionInfo 
    vendorKey='EasternGraphics' 
    appKey='pCon.planner_ME' 
    appVersion='8.5.0' 
    bskXmlVersion='1.8.1' 
    bskVersion='1.29.0' 
    sessionId='[UUID]'
  />
  <items>
    <!-- Basket articles (products/groups) -->
    <bskArticle basketId='[UUID]' itemType='BasketAggregate|BasketArticle' updateState='UpToDate'>
      <manufacturer id='HM'>
        <name lang='  '>Herman Miller</name>
      </manufacturer>
      
      <!-- Key elements extracted for import -->
      <artNr type='final'>[PRODUCT_CODE FEATURE_STRING]</artNr>
        <!-- Format: "E25FNFK-10 N6FGX" where:
             - "E25FNFK-10" = Product code (Herman Miller item number)
             - "N6FGX" = Feature string (options/attributes encoded)
        -->
      
      <quantity [attrib]="[QTY]"></quantity>
        <!-- Quantity of this item, default=1 if omitted -->
      
      <!-- Nested items (child products) -->
      <bskArticle>...</bskArticle>  <!-- Recursively handled -->
      <usrArticle>...</usrArticle>  <!-- User-added items -->
    </bskArticle>
    
    <!-- Set articles (grouped items) -->
    <setArticle>
      <bskArticle>...</bskArticle>
      <usrArticle>...</usrArticle>
    </setArticle>
    
    <!-- Folder groupings -->
    <bskFolder>
      <bskArticle>...</bskArticle>
    </bskFolder>
  </items>
</cutBuffer>
```

**Data Extraction Logic:**
```csharp
// From FileImport.ImportFileOBX()
1. Load XML document from stream
2. Find all <items> tags
3. For each <bskArticle>, <setArticle>, <bskFolder>:
   ├─ Extract artNr[@type='final']: "[PRODUCT_CODE FEATURE_STRING]"
   ├─ Split into:
   │  ├─ item = "E25FNFK-10"
   │  └─ featstr = "N6FGX" (everything after first space)
   ├─ Extract quantity (default="1")
   └─ Handle nested bskArticle and usrArticle recursively
4. For each extracted item:
   ├─ Call AddProductToOrder() / AddProductToQuote_ImportObx()
   ├─ If product not found → fallback to AddSpecialToOrder() / AddSpecialToQuote()
   └─ Append warning to message log if item inactive
```

**Key Data Points Extracted:**
| Data Point | Source XML | Type | Required | Used For |
|------------|-----------|------|----------|----------|
| **Product Code** | `artNr[@type='final']` (before space) | String | ✅ Yes | Lookup in PDM database |
| **Feature String** | `artNr[@type='final']` (after space) | String | ⚠️ Optional | Encodes fabric, finish, options |
| **Quantity** | `quantity` attribute | Integer | ✅ Yes (default=1) | Set `QtyOrdered` on line item |
| **Nested Items** | `bskArticle`/`usrArticle` child nodes | Recursive | ⚠️ Optional | Creates child line items |
| **Item Type** | `itemType` attribute | Enum | ℹ️ Info only | Distinguishes aggregates vs. articles |
| **Basket ID** | `basketId` attribute | UUID | ℹ️ Info only | Tracking (not used in import) |

**Sample OBX Data (from test suite):**
```xml
<bskArticle basketId='756eb2d8-5312-4d33-8e3b-5e1df63f5c26' itemType='BasketAggregate'>
  <manufacturer id='HM'>
    <name lang='  '>Herman Miller</name>
  </manufacturer>
  <artNr type='final'>EAG14FNK-10 N6FGX</artNr>
  <!-- Extracts: item="EAG14FNK-10", featstr="N6FGX", qty="1" (default) -->
</bskArticle>
```

---

### 2.2 SIF Files (Herman Miller OrderPlace)

**Format:** Plain text, line-by-line key=value pairs  
**Source:** Herman Miller OrderPlace desktop application (legacy system)  
**Use Case:** Dealers import orders previously created in OrderPlace selling tool

**File Structure:**
```
SF=SIF_VERSION_MARKER
PN=[PRODUCT_CODE]
ON=[OPTION_FIELD_1]
...
ON=[OPTION_FIELD_N]
QT=[QUANTITY]
PL=[UNIT_LIST_PRICE]
[Additional items follow same pattern]
PN=[NEXT_PRODUCT_CODE]
ON=[OPTION]
QT=[QUANTITY]
PL=[UNIT_PRICE]
SL=SIF_END_MARKER
```

**File Format Markers:**
- **Two file types detected:**
  1. **OrderPlace SIF** — Contains `CN=` (Contract Number) on first check
  2. **CET SIF** — Does NOT contain `CN=`

**Key Data Points Extracted:**
| Data Point | Format | Example | Required | Used For |
|-----------|--------|---------|----------|----------|
| **PN=** | Product Number | `PN=E25FNFK-10` | ✅ Yes | Product code lookup |
| **ON=** | Option/Feature | `ON=N6FGX` | ⚠️ Optional (repeatable) | Concatenated as feature string |
| **QT=** | Quantity | `QT=4` | ✅ Yes | Set `QtyOrdered` |
| **PL=** | Price/List | `PL=299.00` | ⚠️ Optional | Informational (not used) |
| **CN=** | Contract Number | `CN=CNK001` | ⚠️ Optional | Detects OrderPlace SIF type |
| **SF=** | Start Marker | `SF=` | ✅ Yes | File validation |
| **SL=** | End Marker | `SL=` | ✅ Yes | File validation |

**Sample SIF Data:**
```
SF=
PN=E25FNFK-10 N6FGX
ON=Fabric: Black
ON=Finish: Polished
QT=4
PL=299.00
PN=RATIO1DN-1
QT=2
PL=450.00
SL=
```

**Parsing Logic:**
```csharp
// From FileImport.ImportFileSIF()
1. Read entire file content as string
2. Detect SIF type (OrderPlace vs. CET) by checking for "CN="
3. Split into lines
4. Validate first line starts with "SF=" and last line with "SL="
5. For each line:
   ├─ If PN=: Start new item, extract product code
   ├─ If ON=: Append to feature string (concatenate all ON lines)
   ├─ If QT=: Extract quantity (must be numeric)
   ├─ If PL=: Extract price/list (informational)
   └─ When next PN= or EOF encountered: Process current item
6. For each item:
   ├─ Validate quantity is not empty and is numeric
   ├─ Call AddProductToOrder()
   ├─ If product fails → fallback to AddSpecialToOrder()
   └─ Log errors to MessageBuilder
```

---

### 2.3 Excel Files (XLSX) — ✅ IMPLEMENTED

**Format:** XLSX (Office Open XML)  
**Libraries:** NPOI 2.x (Apache POI .NET port)  
**Supported for:** Customers, Orders, Quotes  
**Template Download Endpoints:**
- Customers: `GET Customers/DownloadCustomerExcelImportTemplate`
- Orders: `GET Orders/DownloadOrdersUploadTemplate`  
- Quotes: Similar to Orders

#### **2.3.1 Customer Excel Template**

**File Name:** `ENGLISH_Customer_Import_Template_V2.xlsx`  
**Worksheet Name:** `Customer Details`  
**Version Check:** Row 1, Column I must contain `Version 2`  
**Data Rows:** Rows 4-49 (45 rows max)  
**File Protection:** Password protected (`Herman2135`)

**Column Structure:**
| Col | Name | Type | Required | Rules | Notes |
|-----|------|------|----------|-------|-------|
| **A** | Customer Name | String | ✅ Yes | Max 60 chars | Unique per dealer |
| **B** | Address 1 (Customer) | String | ✅ Yes | Max 60 chars | END CLIENT address |
| **C** | Address 2 (Customer) | String | ✅ Yes | Max 60 chars | |
| **D** | City (Customer) | String | ✅ Yes | Max 30 chars | |
| **E** | Postcode (Customer) | String | ✅ Yes | Max 10 chars | |
| **F** | State (Customer) | String | ⚠️ Conditional | Mandatory if Dealer Site = India (IN) | State lookup |
| **G** | Country (Customer) | String | ✅ Yes | Valid country code/name | Validated against CountryDto |
| **H** | _(Empty)_ | — | — | Reserved | |
| **I** | Billing Name | String | ✅ Yes | Max 60 chars | BILLING address |
| **J** | Billing Address 1 | String | ✅ Yes | Max 60 chars | |
| **K** | Billing Address 2 | String | ✅ Yes | Max 60 chars | |
| **L** | Billing City | String | ✅ Yes | Max 30 chars | |
| **M** | Billing Postcode | String | ✅ Yes | Max 10 chars | |
| **N** | Billing State | String | ⚠️ Conditional | Mandatory if Dealer Site = India (IN) | State lookup |
| **O** | Billing Country | String | ✅ Yes | Valid country code/name | |
| **P** | _(Empty)_ | — | — | Reserved | |
| **Q** | Customer Type | String | ✅ Yes | Valid CustomerType name | Must be active for dealer site |
| **R** | Language | String | ⚠️ Optional | Valid Language code | |
| **S** | Currency | String | ⚠️ Optional | Valid Currency code | |
| **T** | Notes | String | ⚠️ Optional | Max 300 chars | Free-form notes |

**Validation Rules (Customer Excel):**
```csharp
// All these fields must be non-empty:
Required: A, B, C, D, E, G, I, J, K, L, M, O, Q

// Conditional rules:
if (DealerSite == "IN"):
    Required: F (Customer State)
    Required: N (Billing State)

// Uniqueness:
Customer Name must not already exist in database

// Length limits enforced:
TrimText() applied to all fields
MaxLength validation on cells
```

**Row Processing:**
```csharp
// From CustomersController.ReadExcelContents()
for (int row = 4; row < 49; row++) // 45 rows
{
    IRow sheetRow = sheet.GetRow(row);
    if (sheetRow != null)
    {
        // Check all required cells have values
        if (A.HasValue && B.HasValue && C... && G... && etc)
        {
            // Extract values using DataFormatter (handles formats)
            CustomerDto customer = new CustomerDto
            {
                DealerId = current dealer,
                Name = A.StringCellValue,
                EndClientAddress = new AddressDto { 
                    Address1 = B, Address2 = C, City = D, Postcode = E, 
                    Country = LookupCountry(G),
                    State = LookupState(F) // if IN
                },
                BillingAddress = new AddressDto {
                    Address1 = I, Address2 = J, City = L, Postcode = M,
                    Country = LookupCountry(O),
                    State = LookupState(N) // if IN  
                },
                CustomerType = Q,
                Language = R,
                UserCurrency = S,
                Notes = T
            };
            
            // Save to database
            WebApiClient.Add(customerDto);
        }
        else
        {
            // Log validation error for this row
            AddMessage($"Row {row}: Missing required fields", MessageType.Error);
        }
    }
}
```

#### **2.3.2 Order/Quote Excel Template**

**File Name:** `EOS_Quote_Order_Upload_Template.xlsx`  
**Worksheets:** 
- `Header` — Order/quote header details (rows 3-6)
- `LineItems` — Product line items (rows 3+)

**Header Worksheet Structure (Rows 3-6):**

| Row | Field | Col | Value | Purpose |
|-----|-------|-----|-------|---------|
| **3** | Order Type | 1 or 2 | "NORMAL", "DIRECT", "MOCKUP", etc. | Determines order type |
| **3** | Delivery Contact Name | 5 | Contact person name | |
| **4** | Order Reference | 1 or 2 | Reference string | Max 30 chars, must be unique |
| **4** | Delivery Contact Name | 5 | Contact person name | |
| **5** | Description | 1 or 2 | Optional description | Max 200 chars, regex validated |
| **6** | Purchase Order | 1 or 2 | PO number | Max length TBD, must be unique |

**Example Header (Row-wise):**
```
Row 3:  Order Type    [Normal]           Delivery Contact    [John Smith]
Row 4:  Reference     [QT-2026-001]      Delivery Contact    [John Smith]
Row 5:  Description   [Office Refurb]    Description         [...]  
Row 6:  PO Number     [PO-12345]         Delivery Contact    [...]
```

**LineItems Worksheet Structure:**

| Col | Name | Type | Required | Example |
|-----|------|------|----------|---------|
| **A** | Product Code | String | ✅ Yes | `E25FNFK-10` |
| **B** | Feature String | String | ⚠️ Optional | `N6FGX` |
| **C** | Quantity | Number | ✅ Yes | `4` |
| **D** | Unit Price | Currency | ⚠️ Optional | `299.00` |
| **E** | Lead Time | Integer | ⚠️ Optional | `10` (days) |

**Validation (Order/Quote Excel):**
```csharp
// Header worksheet:
Order.OrderTypeId must be valid (lookups GenericFunctions.GetOrderType)
Order.Reference required, max 30 chars, must be unique
Order.PurchaseOrder required, must be unique
Order.DeliveryContactName optional, max 50 chars
Order.Description optional, max 200 chars, regex: [A-Za-z0-9-_\s]*

// LineItems worksheet:
For each row in LineItems:
├─ ProductCode required, must exist in PDM
├─ FeatureString optional, must match product codes if provided
├─ Quantity required, must be numeric
├─ UnitPrice optional, used if provided
└─ LeadTime optional, from PDM if empty

// Validation logic:
if (!ValidateHeader()) 
    isValid = false; return errors;

CreateOrder() with header data

for each row in LineItems:
    try:
        line = AddProductToOrder(productCode, featureString, qty)
        if (line == null)
            line = AddSpecialToOrder(productCode + featureString, qty)
        if (line == null)
            LogWarning($"Row: item not found or inactive")
    except:
        LogError($"Row: invalid format or processing error")
```

---

### Summary Table: Supported File Formats

| Format | Type | Source | Status | Templated | Max Size | Max Items | Notes |
|--------|------|--------|--------|-----------|----------|-----------|-------|
| **OBX** | XML | pCon.planner | ✅ Yes | ❌ No | Unlimited | Unlimited | Recursive nested items, clustering |
| **SIF** | Text | OrderPlace | ✅ Yes | ❌ No | Unlimited*  | Unlimited | Legacy, deprecated, simple format |
| **XLSX (Customer)** | Binary | User/template | ✅ Yes | ✅ Yes | 50 MB | 45 rows | Protected template, site-specific (IN) |
| **XLSX (Order)** | Binary | User/template | ✅ Yes | ✅ Yes | 50 MB | Unlimited | Multi-worksheet (Header + Lines) |
| **XLSX (Quote)** | Binary | User/template | ✅ Yes | ✅ Yes | 50 MB | Unlimited | Same structure as Order |
| **CSV** | Text | Excel/SQL | ❌ No | ❌ No | — | — | Not implemented, would be easy to add |

*SIF files have no explicit size validation in current code

---

## 3. CURRENT IMPLEMENTATION DETAILS

### 3.1 File Validation

**Current Checks:**
- ✅ File must be readable as stream
- ✅ File extension recognized (`.obx` or `.sif`)
- ✅ XML for OBX: Must be valid XML document
- ✅ SIF: Must start with `SF=` and end with `SL=`
- ✅ Quantity must be numeric (SIF files)
- ❌ **NO file size limits enforced**
- ❌ **NO file type MIME type validation**
- ❌ **NO virus/malware scanning**
- ❌ **NO schema validation for OBX**

**File Upload Configuration (from appsettings.json):**
```json
"RestrictedUploadFileTypes": "flv, avi, mov, mp4, mpg, wmv, 3gp, asf, rm, swf, 3gpp, mkv, mp3, sql, bat, exe"
// Note: .obx and .sif NOT in restricted list, so both are allowed
```

### 3.2 Product Lookup & Error Handling

**Lookup Flow:**
```
For Each Item in File:
  ↓
Try: AddProductToOrder(productCode, featureString, qty)
  ├─ Checks if product exists in PDM with feature string
  ├─ If found: Add as HM line item ✅
  └─ If NOT found: → FALLBACK
       ↓
       Try: AddSpecialToOrder(productCode + featureString concatenated, qty)
       ├─ Creates Special line item (non-standard product)
       ├─ If created: Add as Special line item ✅
       └─ If creation fails: → ERROR
            ↓
            Log warning: "Non-HM items ignored"
            Mark import as "clean=false"
            ❌ Item skipped, not added to order
```

**Result Handling:**
```
Import Results:
├─ Success: importedcount > 0 AND clean=true
│  ├─ Log: "File imported successfully"
│  ├─ Message: "Success-Importing"
│  └─ Return: true
│
├─ Partial Success: importedcount > 0 AND clean=false
│  ├─ Log: "File Imported with errors"
│  ├─ Message: "Success-ImportingWithLineErrors" (Warning)
│  └─ Return: false
│
└─ Failure: importedcount == 0
   ├─ Log: "Import Complete No Lines Imported"
   ├─ Message: "Warning-ImportComplete-NoLinesImported"
   └─ Return: false
```

### 3.3 Line Item Creation Rules

**Line Numbering:**
```csharp
// Calculate starting line number from existing items
maxLineNum = (existingLines.Max(ol => ol.Line) ?? 0) + 1;
maxLineOrderNum = existingLines.Count + 1;

// Increment for each successfully imported item
for each imported item:
    maxLineNum++;
    maxLineOrderNum++;
```

**Product Types Supported:**
| Type | Line Origin | Handling | Notes |
|------|------------|----------|-------|
| **HM Catalog** | `HM` | Direct lookup in PDM → OrderLine created | Standard products |
| **Special Items** | `Special` | Custom product entry → Custom OrderLine | Falls back if HM not found |
| **Own Items** | `OwnItem` | _(Not from import, manual entry)_ | Dealer's own products |
| **Cluster** | `Cluster` | Grouped items with parent/child relationship | pCon.planner nested items |

**Clustering (Nested Items in OBX):**
```csharp
// When OBX contains nested bskArticle or usrArticle:
Parent Item (e.g., "Chair")
  ├─ Child 1 (e.g., "Armrest")
  ├─ Child 2 (e.g., "Base")
  └─ Child 3 (e.g., "Caster")

// Creates cluster parent line with Clreference=UUID
// All children share same Clreference
// Pricing: Summed from all children
// LeadTime: Max of all children
```

### 3.4 Message Logging & User Feedback

**Message Types:**
```
MessageType.Normal  — "2026-03-20 12:34:56 - filename.obx" (header)
MessageType.Success — "File imported successfully" (on success)
MessageType.Warning — Multiple warnings for:
                      - Imported with errors
                      - Non-HM items ignored
                      - Quantity is missing (SIF)
                      - Item inactive in PDM
MessageType.Error   — 
                      - Quantity must be numeric (SIF)
                      - Product code not found
                      - Document upload failed
```

**Logging (via ILogger):**
```csharp
// Structured logging to Application Insights / CloudWatch
_logger.LogInformation("File imported successfully in ImportFileOBX method");
_logger.LogWarning("File Imported with errors");
_logger.LogError("Error importing document in UploadDocumentAsync");
// Includes: OrderId/QuoteId, User, Timestamp, Filename, Error details
```

### 3.5 Document Storage

**After Import Success:**
```csharp
// Original OBX/SIF file stored as Document
DocumentDto:
  Id = Guid.NewGuid()
  DealerId = current dealer
  Data = file byte array
  Name = original filename
  Description = original filename
  IsHmvisible = true
  ContentType = "EOSImport" ← Special content type marker
  CreateDate = DateTime.Now
  CreatedBy = current user

// Linked to Order/Quote via junction table:
OrderDocument:
  Id = Guid.NewGuid()
  OrderId = order being imported to
  DocumentId = document above

// Stored in database for audit trail
```

---

## 4. CURRENT LIMITATIONS & ISSUES

### Critical Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| **Only 2 file types** | Dealers can't use CSV, Excel, or other native formats | HIGH |
| **No file size limits** | Risk of memory exhaustion with huge OBX/SIF files | HIGH |
| **No MIME type validation** | Security risk: any file could be uploaded if extension spoofed | HIGH |
| **Feature string opacity** | Users don't see what "N6FGX" means (hidden attributes) | MEDIUM |
| **All-or-nothing import** | One bad item fails entire import (no skip/continue option) | MEDIUM |
| **No duplicate detection** | Can import same product twice accidentally | MEDIUM |
| **Cascading lookups** | Relies on fallback to Specials; unclear if product failed or not recognized | MEDIUM |
| **No preview before import** | Users don't see what will be imported before committing | MEDIUM |

### Design Issues

| Issue | Problem | Implication |
|-------|---------|------------|
| **Direct controller coupling** | FileImport tightly coupled to OrdersController & QuotesController | Hard to test, reuse, or refactor |
| **Reference parameters** | Excessive use of `ref` parameters for OrderDto/QuoteDto | Difficult to reason about state changes |
| **Recursive XML parsing** | No depth limit on nested items — DoS risk: infinite recursion | Large files could crash application |
| **Feature string encoding** | Unknown encoding scheme — not documented | Only pCon.planner knows the codes |
| **No batch transaction** | Each item imported separately — no rollback on error | Import partially succeeds, leaving inconsistent state |
| **Message builder string concatenation** | Using StringBuilder in message handler — potential memory leak with huge imports | No message stream cleanup |
| **Quantity validation (SIF only)** | Only SIF validates quantity; OBX skips validation | OBX could allow zero or negative quantities |

---

## 5. WORKFLOW - FROM FILE UPLOAD TO ORDER

```
USER ACTION: File Upload
     ↓
OrdersController / QuotesController
     ├─ Receives IFormFile (OBX or SIF)
     ├─ Creates FileImport()
     └─ Calls FileImport.ImportFileOBX() OR ImportFileSIF()
          ↓
          [Parse File]
          ├─ OBX: Load XML, traverse <items>/<bskArticle> nodes
          └─ SIF: Read lines, split PN=/ON=/QT=/PL= pairs
          
          ↓ [For Each Item]
          
          PDM Lookup
          ├─ Get product code + feature string
          ├─ Call AddProductToOrder(code, features, qty)
          └─ If NOT found:
               ↓
               Fallback to Special
               └─ Call AddSpecialToOrder(code+features, qty)
          
          ↓ [Result]
          
          Update DTO
          ├─ Add OrderLineDto or QuoteLineDto
          ├─ Set ProductCode, FeatureString, QtyOrdered
          ├─ Set LeadTime from PDM
          ├─ Set pricing from contract
          └─ Mark line origin (HM, Special, or Cluster)
          
          ↓ [After All Items]
          
          Upload Document
          └─ Save original OBX/SIF file as Document
               └─ Link to Order/Quote via OrderDocument junction
          
          ↓ [Return to UI]
          
          Display Results
          ├─ Success/Warning/Error messages
          ├─ Count of items imported
          ├─ List of items that failed
          └─ Option to edit order and correct/remove failed items
              ↓
              [User Saves Order]
```

---

## 6. RECOMMENDATIONS FOR IMPROVEMENT

### Phase 1: Quick Wins (Low Effort, High Value)

**1. Add CSV Import Support**
- **Effort:** 40 hours
- **Benefit:** Dealers can export from ANY system (Excel, SQL, Google Sheets)
- **Format:**
  ```csv
  ProductCode,FeatureString,Quantity
  E25FNFK-10,N6FGX,4
  RATIO1DN-1,,2
  ```
- **Implementation:** CsvHelper NuGet + map to OrderLineDto
- **Advantage:** No vendor lock-in to pCon.planner

**2. Add Excel Import Support**
- **Effort:** 40 hours
- **Benefit:** Easier for non-technical users (familiar format)
- **Format:** Standard columns (ProductCode, FeatureString, Qty, UnitPrice)
- **Implementation:** NPOI (already in use for exports)
- **Advantage:** Template-based, with data validation & formulas

**3. Import Preview & Validation**
- **Effort:** 30 hours
- **Benefit:** Users see what will be imported before committing
- **Implementation:**
  ```
  Step 1: Upload file
    ↓
  Step 2: Preview (show table of items to import)
    - Highlight products not found in PDM
    - Show feature string decoded
    - Allow deselect of unwanted items
    ↓
  Step 3: Confirm & import
  ```
- **Advantage:** Reduces errors, user confidence

**4. File Size Limits & Validation**
- **Effort:** 5 hours
- **Benefit:** Prevent DoS, improves security
- **Implementation:**
  ```csharp
  const int MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  const int MAX_ITEMS_PER_FILE = 10000;
  const int MAX_NESTING_DEPTH = 10; // for OBX
  
  if (file.Length > MAX_FILE_SIZE) throw;
  if (items.Count > MAX_ITEMS_PER_FILE) throw;
  ```
- **Advantage:** Hardening, resource protection

---

### Phase 2: Medium Effort Features

**5. Feature String Decoder**
- **Effort:** 60 hours
- **Benefit:** Show users what "N6FGX" actually means (Fabric: Black, Finish: Polished, etc.)
- **Implementation:** Map OBX feature codes to product attributes via PDM
- **Advantage:** Transparency, better UX

**6. Duplicate Item Detection**
- **Effort:** 20 hours
- **Benefit:** Warn user before importing same product twice
- **Implementation:**
  ```csharp
  var duplicates = import_items
    .GroupBy(i => i.ProductCode + i.FeatureString)
    .Where(g => g.Count() > 1);
  
  if (duplicates.Any())
    Show warning: "These items appear multiple times..."
  ```
- **Advantage:** Data quality

**7. Atomic Transaction Imports**
- **Effort:** 50 hours
- **Benefit:** All items succeed or all fail; no partial imports
- **Implementation:** Database transaction wrapping entire import
- **Advantage:** Data integrity

**8. Batch Error Recovery**
- **Effort:** 40 hours
- **Benefit:** Skip bad items, continue importing; don't fail entire batch
- **Implementation:**
  ```csharp
  try {
    add_product(item1) // succeeds
    add_product(item2) // fails → log warning, continue
    add_product(item3) // succeeds
  }
  Result: 2 items imported, 1 failed, user informed
  ```
- **Advantage:** Resilience

---

### Phase 3: Future Enhancements

**9. JSON API for Programmatic Imports**
- **Effort:** 60 hours
- **Benefit:** Other systems (ERP, CRM) can push orders directly
- **Format:** JSON payload with order details + line items
- **Advantage:** Integration, no manual file uploads

**10. Streaming Parser for Large Files**
- **Effort:** 50 hours
- **Benefit:** Process 100MB+ files without memory exhaustion
- **Implementation:** SAX parser for XML, streaming CSV reader
- **Advantage:** Scalability

**11. Multi-File Batch Import**
- **Effort:** 30 hours
- **Benefit:** Import 100 quotes at once (e.g., portfolio review)
- **Implementation:** Zip file containing multiple OBX/CSV/XLSX files
- **Advantage:** Bulk operations

**12. Feature String Configurator UI**
- **Effort:** 100 hours
- **Benefit:** Build feature strings visually instead of importing from pCon
- **Implementation:** React component for attribute selection
- **Advantage:** Removes dependency on external tools

---

## 7. INTEGRATION OPPORTUNITIES

### Systems Worth Investigating

| System | Type | Benefit | Integration Effort |
|--------|------|---------|-------------------|
| **Autodesk Fusion 360** | CAD/Design | Native 3D furniture configuration | Medium (API available) |
| **Revit** | BIM software | Building information import (dealers specify rooms, furniture) | Medium |
| **SAP / NetSuite** | ERP | Two-way order sync | High (complex mapping) |
| **Salesforce** | CRM | Quote to order flow from Salesforce | Medium |
| **Shopify** | e-Commerce | Sync products, orders from Shopify store | Medium |
| **Zapier** | No-code integrations | Connect to 5000+ tools | Low |
| **Microsoft Power Automate** | RPA | Workflow automation, file processing | Low-Medium |
| **API.AI / ChatGPT** | NLP | "Create order from email description" | Experimental |

---

## 8. MODERN FILE IMPORT BEST PRACTICES

### Current State vs. Best Practice

| Aspect | Current | Best Practice | Gap |
|--------|---------|---------------|-----|
| **File Formats** | OBX, SIF | CSV, Excel, JSON, XML | High |
| **Validation** | Basic | Schema, constraints, error reporting | High |
| **Preview** | None | Table preview, mapping UI, dry-run | High |
| **Error Handling** | All-or-nothing | Per-item, skip bad rows, audit log | High |
| **Performance** | Synchronous | Async/streaming, background job queue | Medium |
| **Scalability** | Limited (in-memory) | Message queue, batch service | High |
| **User Experience** | Minimal feedback | Progress bar, detailed logs, resume | Medium |
| **Integration** | Standalone | API-driven, webhook notifications | High |
| **Security** | Basic | Virus scan, encryption, audit trail | High |
| **Testing** | Unit tests only | Integration tests, test data fixtures | Medium |

---

## SUMMARY TABLE

### Supported File Feature Comparison

| Feature | OBX | SIF | Excel | CSV (Proposed) |
|---------|-----|-----|-------|----------------|
| **Status** | ✅ Implemented | ✅ Implemented | ✅ Implemented | ❌ Not yet |
| **File Size Limit** | ❌ None (DoS risk) | ❌ None (DoS risk) | ✅ 50 MB configurable | ✅ Configurable |
| **Max Records** | ❌ Unlimited | ❌ Unlimited | ✅ Limited (45-unlimited) | ✅ Configurable |
| **Template Required** | ❌ No | ❌ No | ✅ Yes, downloadable | ✅ Yes |
| **Template Download** | N/A | N/A | ✅ Available | (Not yet) |
| **Validation Level** | ⚠️ Basic | ⚠️ Basic | ✅ Comprehensive | TBD |
| **Multi-Sheet Support** | N/A | N/A | ✅ Header + Lines | ✅ Single sheet |
| **Protected Sheet** | N/A | N/A | ✅ Yes (Customers) | ❌ No |
| **Error Recovery** | ❌ All-or-nothing | ❌ All-or-nothing | ❌ All-or-nothing | ✅ Row-level skip |
| **Data Types Supported** | Text + Qty | Text + Qty | Text, Number, Date, Currency | Text, Number |
| **Lookups/Validation** | ⚠️ Basic PDM | ⚠️ Basic PDM | ✅ Country, State, CustomerType, OrderType | TBD |

### Data Flow Summary

```
File Upload
  ↓
File Validation
  ├─ OBX: XML parsing + XML schema validation
  ├─ SIF: Line-by-line text parsing (SF=/SL= markers)
  └─ Excel: NPOI workbook load + worksheet name check
  ↓
Data Extraction Loop
  ├─ Extract: ProductCode, FeatureString, Quantity
  ├─ Lookup in PDM
  ├─ If NOT found: Fallback to Specials
  └─ If fails: Log warning, continue
  ↓
Order/Quote Update
  ├─ Add OrderLineDto / QuoteLineDto
  ├─ Set pricing from contract
  ├─ Increment line numbers
  └─ Handle nested items (Clusters)
  ↓
Document Storage
  └─ Save original file for audit trail
  ↓
Results
  ├─ Count: Items imported
  ├─ Messages: Success/Warning/Error
  └─ Return: true/false/partial
```

---

## CONCLUSION

**Current State:**
- ✅ Functional OBX/SIF import for pCon.planner & OrderPlace integrations
- ✅ Basic error handling with message logging
- ✅ Document audit trail preserved
- ❌ Limited file format support (only 2 types)
- ❌ No preview, validation, or batch error recovery
- ❌ Security vulnerabilities (no file size limits, no MIME validation)

**For MVP Redesign:**
1. **Keep:** OBX import (pCon.planner integration valuable)
2. **Consider:** Add CSV import (easy, high ROI)
3. **Defer:** Advanced features (Phase 2+)
4. **Security:** Implement file size limits immediately

**Recommended Priority:** Add CSV import + file size validation (Week 1-2 of frontend development)

---

*Analysis compiled from source code review of FileImport.cs, test suite, and controller integrations.*
