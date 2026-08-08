interface RawOrder {
  index: string;
  customerName: string;
  productNumber: string;
  products: string[];
  delivered: string;
}

interface Order {
  index: number;
  customerName: string;
  productNumber: number;
  products: string[];
  delivered: boolean;
}

interface InvalidEntry {
  order: RawOrder;
  reasons: string[];
}

interface ProcessResult {
  invalidOrders: InvalidEntry[];
  total: number;
}

function normalizeOrder(raw: RawOrder): Order | null {
  const index = Number(raw.index);// בעיה: ההמרה יכולה להחזיר NaN, אבל אין כאן בדיקה שה-index באמת תקין.
  const productNumber = Number(raw.productNumber);// בעיה: גם כאן אפשר לקבל NaN ועדיין להמשיך וליצור Order.
  let delivered: boolean;

  if (raw.delivered === "true" || raw.delivered === "1") {
    delivered = true;
  } else if (raw.delivered === "false" || raw.delivered === "0" || raw.delivered === "") {
    delivered = false;
  } else {
    return null;
  }

  return { index, customerName: raw.customerName, productNumber, products: raw.products, delivered }; // בעיה: הפונקציה יכולה להחזיר Order שמכיל NaN ולכן אינו באמת normalized בצורה תקינה.
}

function validateOrder(raw: RawOrder, seenIndexes: Set<number>): string[] {
  const reasons: string[] = [];

  if (!raw.index || !raw.customerName || !raw.productNumber || !raw.products || !raw.delivered) {// בעיה: delivered: "" הוא ערך חוקי לפי ה-spec, אבל כאן הוא נחשב כחסר.
    reasons.push("Missing required field");
    return reasons;// בעיה: ה-return עוצר את כל שאר הבדיקות ולכן לא נאספות כל סיבות הכשל.
  }

  const index = Number(raw.index);
  if (isNaN(index) || index <= 0 || !Number.isInteger(index)) {
    reasons.push("Invalid index");
  } else if (seenIndexes.has(index)) {
    reasons.push("Duplicate index");
  } else {
    seenIndexes.add(index);
  }

  if (raw.customerName.trim().length === 0) {
    reasons.push("Invalid customerName");
  }

  if (!Array.isArray(raw.products) || raw.products.length === 0) {
    reasons.push("Invalid products array");
  } else if (raw.products.some(p => p.trim().length === 0)) {
    reasons.push("Empty product name");
  }

  const productNumber = Number(raw.productNumber);
  if (isNaN(productNumber) || productNumber <= 0 || !Number.isInteger(productNumber)) {
    reasons.push("Invalid productNumber");
  } else if (productNumber !== raw.products.length) {
    reasons.push("productNumber does not match products.length");
  }

  if (!["true", "false", "1", "0", ""].includes(raw.delivered)) {
    reasons.push("Invalid delivered value");
  }

  return reasons;
}

function processOrders(rawOrders: RawOrder[]): ProcessResult {
  const invalidOrders: InvalidEntry[] = [];
  const seenIndexes = new Set<number>();

  for (const raw of rawOrders) {
    const reasons = validateOrder(raw, seenIndexes);// בעיה: normalizeOrder בכלל לא נקראת, ולכן שלב ה-normalization שהוגדר ב-spec לא משתתף ב-flow.
    if (reasons.length > 0) {
      invalidOrders.push({ order: raw, reasons });
    }
  }

  return { invalidOrders, total: invalidOrders.length };// בעיה: אין טיפול במקרה שבו total === 0, ולכן ההודעה "All orders are valid. Have a nice day." לא מודפסת.
}