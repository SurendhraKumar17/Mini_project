# Routewise Dashboard - Simple Project Guide

## 1. What is this project?

Routewise is a supply-chain dashboard. It helps a logistics manager understand:

- How many shipments were processed
- How many shipments were on time
- How many shipments were delayed
- Which warehouses have more delays
- Which routes need attention
- Which conditions are commonly related to delays

The dashboard is designed to make shipment problems easy to identify.

## 2. How to open the project

Run `python3 -m http.server 8000` in this folder, then open http://localhost:8000

The project files are:

- `index.html` - dashboard page structure
- `styles.css` - colors, layout, and responsive design
- `app.js` - data processing, calculations, charts, and interactions
- `csv-worker.js` - background CSV parser for large uploads
- `association-rules.json` - exported FP-Growth rules for the dashboard
- `preprocess.py` - Python FP-Growth preprocessing pipeline
- `README.md` - technical project notes

## 3. Where does the data come from?

The dashboard includes a small sample shipment dataset inside `app.js`. This sample data is used automatically when no CSV file is selected.

The project can also load the DataCo supply-chain CSV dataset. The downloaded file is named:

```text
DataCoSupplyChainDataset.csv
```

This dataset can be downloaded from Kaggle:

<https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis>

## 4. How to load the CSV file

1. Start the local server described above and open the dashboard.
2. Find the **CSV data** control in the toolbar.
3. Click the file selection button.
4. Select `DataCoSupplyChainDataset.csv`.
5. Wait while the browser reads the file.
6. The charts and statistics update automatically.

The large CSV file does not need to be copied into the project folder.

## 5. How the CSV data is converted

The dashboard uses a standard shipment format. The DataCo columns are converted into that format:

| DataCo column | Dashboard meaning |
|---|---|
| `Order Region` | Warehouse/region |
| `Customer Id` | Store/customer ID |
| `Customer City` | Store/customer name |
| `Shipping Mode` | Shipping method |
| `Delivery Status` | Delivery status |
| Actual shipping days minus scheduled days | Delay days |
| `Order Region` | Warehouse/region |
| `Category Name` | Product category |
| `Customer Segment` | Customer segment |
| `order date (DateOrders)` | Real order date and month |
| `Order Item Total - Order Profit Per Order` | Fulfillment-cost proxy |

Traffic, weather, loading, and `Late_delivery_risk` are intentionally excluded from pattern predictors because they are unavailable, outcome-derived, or not independent.

## 6. What the dashboard sections mean

### KPI cards

The cards at the top show:

- **Total shipments** - number of shipment records
- **On-time delivery** - percentage of shipments delivered on time
- **Average delay** - average number of delayed days
- **Fulfillment cost** - calculated from `Order Item Total - Order Profit Per Order`

### Delivery health

The line chart shows the on-time delivery trend calculated from the loaded shipment records.

### High-risk shipments

This section counts delayed shipments with a higher risk, defined as:

- Three or more observed delay days

### Delay rate by warehouse

The bar chart compares delayed shipments between warehouses or regions. Taller bars indicate more delays.

### Shipment status

The donut chart shows:

- On-time shipments
- Delayed shipments
- At-risk shipments

### What is linked to delays?

This section displays combinations of independent conditions that frequently appear in delayed shipments. They are generated with Python FP-Growth.

It uses:

- Support - how often the combination appears
- Confidence - how often the combination results in a delay
- Lift - how strongly the combination is related to delays compared with the overall dataset

### Routes needing attention

This section lists warehouse-to-store routes with the highest delay rates.

### Recommended actions

This section creates simple recommendations based on the loaded data, such as:

- Reviewing the shipping modes and regions associated with delayed deliveries
- Prioritizing the highest-delay warehouse/region
- Applying the strongest exported association rule

## 7. Filters and report export

The dashboard provides:

- A warehouse filter
- A shipment-status filter
- A reset button
- An **Export report** button

The export button downloads a text report containing the main statistics and delay patterns.

## 8. Important limitations

- Uploaded CSV text is parsed in `csv-worker.js`, so large files do not block the UI thread.
- `preprocess.py` uses `mlxtend.fpgrowth` with minimum support `0.003`.
- `association_rules` keeps delayed-outcome rules at minimum confidence `0.60`.
- Redundant rules are removed unless the full antecedent improves confidence by at least 2 percentage points over every smaller antecedent.
- Fulfillment cost is a proxy because the source has no dedicated shipping-cost field.

## 9. Methodology

1. Normalize the real order date and derive order month.
2. Encode shipping mode, region, product category, customer segment, order month, and delayed outcome as transaction items.
3. Mine frequent itemsets with FP-Growth at 0.3% minimum support.
4. Keep rules with `Outcome=Delayed` as the consequent and 60% minimum confidence.
5. Remove redundant rules unless the full antecedent adds at least 2 percentage points of confidence over every smaller antecedent.
6. Report support, confidence, lift, and itemset size. These thresholds keep recurring patterns while avoiding delay-derived feature leakage.

## 10. Simple explanation for a presentation

> Routewise is a supply-chain analytics dashboard that uses shipment data to identify delivery delays. It calculates on-time performance, compares warehouse and route delay rates, identifies common delay conditions, and recommends actions. Users can start with sample data or upload the DataCo CSV file to analyze a larger shipment dataset.
