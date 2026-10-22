# Routewise

Routewise is a small dashboard for finding delivery delays. It starts with
sample shipment data, so you can open it and explore it immediately.

## Start the project

You only need Python installed.

1. Open a terminal in this folder.
2. Start the local website:

   ```bash
   python3 -m http.server 8000
   ```

3. Open <http://localhost:8000> in your browser.
4. Stop the website later with `Control+C` in the terminal.

Opening `index.html` by double-clicking may not work because the dashboard
loads files in the browser. Use the small local server instead.

## What to try first

The dashboard already contains 10 sample shipments.

1. Look at the four cards at the top.
2. Change **Warehouse** or **Status** to filter the results.
3. Check the charts to see which warehouse and routes have the most delays.
4. Read **Delay clues** to see which shipment details are connected with delays.
5. Read **Recommended actions** for simple next steps.
6. Click **Export report** if you want to save the current results as a text file.

## Use your own CSV file

Click **Upload CSV** and choose a DataCo supply-chain CSV file. The dashboard
will read it in the browser and update the cards and charts.

The expected DataCo file is named `DataCoSupplyChainDataset.csv`. It can be
downloaded from
[Kaggle](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis).
You do not need to copy the large file into this project.

The dashboard uses these columns:

| CSV column | Used as |
| --- | --- |
| `Order Region` | Warehouse/region |
| `Customer Id` and `Customer City` | Store |
| `Shipping Mode` | Shipping method |
| `Delivery Status` | On-time or delayed |
| Shipping days minus scheduled days | Delay days |
| `Category Name` | Product category |
| `Customer Segment` | Customer type |
| `order date (DateOrders)` | Order date |

## What the words mean

- **On-time delivery**: the percentage of shipments that were not late.
- **Average delay**: the average number of late days across the selected shipments.
- **High-risk shipment**: a delayed shipment with at least 3 delay days.
- **Support**: how often a combination appears in the data.
- **Confidence**: how often that combination is delayed. A higher number is a
  stronger clue.
- **Lift**: how much more often a combination is delayed compared with the
  overall delay rate.

You can use the dashboard without knowing the last three terms. They are
included to explain the **Delay clues** section.

## Project files

- `index.html` - page structure and beginner instructions
- `styles.css` - layout, colors, and mobile design
- `app.js` - dashboard calculations and interactions
- `csv-worker.js` - reads large CSV files without freezing the page
- `shipments.csv` - sample data used by the Python analysis
- `association-rules.json` - saved delay clues
- `preprocess.py` - optional Python script for creating new delay clues
- `PROJECT-GUIDE.md` - detailed technical explanation

## Optional: rebuild delay clues

Most beginners do not need this step. If you change `shipments.csv` and want
to create new clues, install the Python packages first:

```bash
pip install pandas mlxtend
python3 preprocess.py shipments.csv --output association-rules.json
```

The browser dashboard itself does not require Python packages; Python is only
needed for this optional analysis step and for the local web server.
