function parseCsv(text) {
  const rows = [], headers = [];
  let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(value);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = []; value = "";
    } else value += char;
  }
  if (value || row.length) { row.push(value); if (row.some(cell => cell.trim())) rows.push(row); }
  if (!rows.length) throw new Error("The selected CSV file is empty.");
  headers.push(...rows.shift().map(header => header.trim()));
  return { headers, rows };
}

self.onmessage = event => {
  try {
    const { headers, rows } = parseCsv(event.data);
    const required = ["Delivery Status", "Shipping Mode", "Order Region", "Category Name", "Customer Segment", "order date (DateOrders)", "Customer Id", "Customer City", "Days for shipping (real)", "Days for shipment (scheduled)", "Order Item Total", "Order Profit Per Order"];
    const index = name => headers.indexOf(name);
    const missing = required.filter(name => index(name) === -1);
    if (missing.length) throw new Error(`This CSV is missing required DataCo columns: ${missing.join(", ")}`);
    const get = (row, name) => row[index(name)]?.trim() || "Unknown";
    const number = (row, name) => Number(get(row, name).replace(/[$,]/g, "")) || 0;
    const mapped = rows.map((row, i) => {
      const orderDate = get(row, "order date (DateOrders)");
      const actualDate = new Date(orderDate);
      return {
        id: `SHP-${String(i + 1).padStart(5, "0")}`, warehouse: get(row, "Order Region"),
        warehouseName: `${get(row, "Order Region")} Hub`, store: get(row, "Customer Id"),
        storeName: get(row, "Customer City"), shippingMode: get(row, "Shipping Mode"),
        region: get(row, "Order Region"), productCategory: get(row, "Category Name"),
        customerSegment: get(row, "Customer Segment"), orderDate: Number.isNaN(actualDate.valueOf()) ? orderDate : actualDate.toISOString().slice(0, 10),
        status: get(row, "Delivery Status").toLowerCase().includes("late") ? "Delayed" : "On-time",
        delay: Math.max(0, number(row, "Days for shipping (real)") - number(row, "Days for shipment (scheduled)")),
        cost: Math.max(0, number(row, "Order Item Total") - number(row, "Order Profit Per Order"))
      };
    });
    self.postMessage({ rows: mapped });
  } catch (error) { self.postMessage({ error: error.message }); }
};
