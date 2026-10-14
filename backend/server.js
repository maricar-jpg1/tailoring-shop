
const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function asyncHandler(fn) {
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
}

function generateOrderCode() {
  return `SF-${randomUUID().toUpperCase()}`;
}

function getId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getMeasurementValues(body) {
  return {
    customerId: body.customer_id ?? body.customerId,
    chest: body.chest ?? body.chest_cm ?? null,
    waist: body.waist ?? body.waist_cm ?? null,
    hips: body.hips ?? body.hips_cm ?? null,
    shoulder: body.shoulder ?? body.shoulder_cm ?? null,
    sleeve: body.sleeve ?? body.sleeve_cm ?? null,
    length: body.length ?? body.length_cm ?? null,
    notes: body.notes || null,
  };
}

// Accept snake_case and camelCase from the frontend.
function validateOrder(body) {
  const customerId = getId(body.customer_id ?? body.customerId);
  const quantity = Number(body.quantity ?? 1);
  const totalPrice = Number(body.total_price ?? body.totalPrice ?? 0);

  const garmentType = String(
    body.garment_type ?? body.garmentType ?? ""
  ).trim();

  const status = body.status || "Pending";

  if (!customerId) {
    return { error: "Please select a valid customer." };
  }

  if (!garmentType) {
    return { error: "Garment type is required." };
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: "Quantity must be at least 1." };
  }

  if (!Number.isFinite(totalPrice) || totalPrice < 0) {
    return { error: "Total price must be a valid non-negative number." };
  }

  const allowedStatuses = [
    "Pending",
    "In Progress",
    "Completed",
    "Cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    return { error: "Invalid order status." };
  }

  const orderCode = String(
    body.order_code ?? body.orderCode ?? ""
  ).trim();

  return {
    values: {
      orderCode: orderCode || null,
      customerId,
      garmentType,
      description: body.description || null,
      quantity,
      orderDate: body.order_date ?? body.orderDate ?? null,
      dueDate: body.due_date ?? body.dueDate ?? null,
      status,
      totalPrice,
      notes: body.notes || null,
    },
  };
}

// HEALTH CHECK
app.get(
  "/api/health",
  asyncHandler(async (req, res) => {
    await db.query("SELECT 1");

    res.json({
      success: true,
      message: "StitchFlow API and PostgreSQL are connected.",
    });
  })
);

// ==============================
// CUSTOMERS
// ==============================

// GET all customers
app.get(
  "/api/customers",
  asyncHandler(async (req, res) => {
    const result = await db.query(
      "SELECT * FROM public.customers ORDER BY id DESC"
    );

    res.json(result.rows);
  })
);

// GET one customer
app.get(
  "/api/customers/:id",
  asyncHandler(async (req, res) => {
    const id = getId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid customer ID." });
    }

    const result = await db.query(
      "SELECT * FROM public.customers WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.json(result.rows[0]);
  })
);

// CREATE customer
app.post(
  "/api/customers",
  asyncHandler(async (req, res) => {
    const name = String(
      req.body.name ?? req.body.full_name ?? ""
    ).trim();

    const { phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Customer name is required.",
      });
    }

    const result = await db.query(
      `INSERT INTO public.customers
        (name, phone, email, address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, phone || null, email || null, address || null]
    );

    res.status(201).json(result.rows[0]);
  })
);

// UPDATE customer
app.put(
  "/api/customers/:id",
  asyncHandler(async (req, res) => {
    const id = getId(req.params.id);
    const name = String(
      req.body.name ?? req.body.full_name ?? ""
    ).trim();

    if (!id) {
      return res.status(400).json({ error: "Invalid customer ID." });
    }

    if (!name) {
      return res.status(400).json({
        error: "Customer name is required.",
      });
    }

    const { phone, email, address } = req.body;

    const result = await db.query(
      `UPDATE public.customers
       SET name = $1, phone = $2, email = $3, address = $4
       WHERE id = $5
       RETURNING *`,
      [name, phone || null, email || null, address || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.json(result.rows[0]);
  })
);

// DELETE customer
app.delete(
  "/api/customers/:id",
  asyncHandler(async (req, res) => {
    const id = getId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid customer ID." });
    }

    const result = await db.query(
      "DELETE FROM public.customers WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.json({ message: "Customer deleted successfully." });
  })
);

// ==============================
// MEASUREMENTS
// ==============================

// GET all measurements
app.get(
  "/api/measurements",
  asyncHandler(async (req, res) => {
    const result = await db.query(
      `SELECT m.*, c.name AS customer_name
       FROM public.measurements m
       LEFT JOIN public.customers c ON c.id = m.customer_id
       ORDER BY m.id DESC`
    );

    res.json(result.rows);
  })
);

// GET one measurement
app.get(
  "/api/measurements/:id",
  asyncHandler(async (req, res) => {
    const id = getId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid measurement ID." });
    }

    const result = await db.query(
      `SELECT m.*, c.name AS customer_name
       FROM public.measurements m
       LEFT JOIN public.customers c ON c.id = m.customer_id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Measurement not found." });
    }

    res.json(result.rows[0]);
  })
);

// CREATE measurement
app.post(
  "/api/measurements",
  asyncHandler(async (req, res) => {
    const m = getMeasurementValues(req.body);
    const customerId = getId(m.customerId);

    if (!customerId) {
      return res.status(400).json({
        error: "Please select a valid customer.",
      });
    }

    const customer = await db.query(
      "SELECT id FROM public.customers WHERE id = $1",
      [customerId]
    );

    if (customer.rowCount === 0) {
      return res.status(400).json({
        error: "The selected customer does not exist.",
      });
    }

    const result = await db.query(
      `INSERT INTO public.measurements
        (customer_id, chest, waist, hips, shoulder, sleeve, length, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        customerId,
        m.chest,
        m.waist,
        m.hips,
        m.shoulder,
        m.sleeve,
        m.length,
        m.notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  })
);

// UPDATE measurement
app.put(
  "/api/measurements/:id",
  asyncHandler(async (req, res) => {
    const id = getId(req.params.id);
    const m = getMeasurementValues(req.body);
    const customerId = getId(m.customerId);

    if (!id) {
      return res.status(400).json({ error: "Invalid measurement ID." });
    }

    if (!customerId) {
      return res.status(400).json({
        error: "Please select a valid customer.",
      });
    }

    const result = await db.query(
      `UPDATE public.measurements
       SET customer_id = $1,
           chest = $2,
           waist = $3,
           hips = $4,
           shoulder = $5,
           sleeve = $6,
           length = $7,
           notes = $8
       WHERE id = $9
       RETURNING *`,
      [
        customerId,
        m.chest,
        m.waist,
        m.hips,
        m.shoulder,
        m.sleeve,
        m.length,
        m.notes,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Measurement not found." });
    }

    res.json(result.rows[0]);
  })
);

// DELETE measurement
app.delete(
  "/api/measurements/:id",
  asyncHandler(async (req, res) => {
    const id = getId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid measurement ID." });
    }

    const result = await db.query(
      "DELETE FROM public.measurements WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Measurement not found." });
    }

    res.json({ message: "Measurement deleted successfully." });
  })
);

// ==============================
// ORDERS
// ==============================

// GET all orders
app.get(
  "/api/orders",
  asyncHandler(async (req, res) => {
    const result = await db.query(
      `SELECT o.*, c.name AS customer_name
       FROM public.orders o
       LEFT JOIN public.customers c ON c.id = o.customer_id
       ORDER BY o.id DESC`
    );

    res.json(result.rows);
  })
);

// GET one order
app.get(
  "/api/orders/:id",
  asyncHandler(async (req, res) => {
    const id = getId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid order ID." });
    }

    const result = await db.query(
      `SELECT o.*, c.name AS customer_name
       FROM public.orders o
       LEFT JOIN public.customers c ON c.id = o.customer_id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json(result.rows[0]);
  })
);

// CREATE order
app.post(
  "/api/orders",
  asyncHandler(async (req, res) => {
    const parsed = validateOrder(req.body);

    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const order = parsed.values;

    // Generate an order code when the frontend sends none.
    if (!order.orderCode) {
      order.orderCode = generateOrderCode();
    }

    const customer = await db.query(
      "SELECT id FROM public.customers WHERE id = $1",
      [order.customerId]
    );

    if (customer.rowCount === 0) {
      return res.status(400).json({
        error: "The selected customer does not exist.",
      });
    }

    const result = await db.query(
      `INSERT INTO public.orders
        (order_code, customer_id, garment_type, description,
         quantity, order_date, due_date, status, total_price, notes)
       VALUES
        ($1, $2, $3, $4, $5,
         COALESCE($6::date, CURRENT_DATE), $7, $8, $9, $10)
       RETURNING *`,
      [
        order.orderCode,
        order.customerId,
        order.garmentType,
        order.description,
        order.quantity,
        order.orderDate,
        order.dueDate,
        order.status,
        order.totalPrice,
        order.notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  })
);

// UPDATE order
app.put(
  "/api/orders/:id",
  asyncHandler(async (req, res) => {
    const id = getId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid order ID." });
    }

    const parsed = validateOrder(req.body);

    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const order = parsed.values;

    const existing = await db.query(
      "SELECT order_code FROM public.orders WHERE id = $1",
      [id]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (!order.orderCode) {
      order.orderCode =
        existing.rows[0].order_code || generateOrderCode();
    }

    const customer = await db.query(
      "SELECT id FROM public.customers WHERE id = $1",
      [order.customerId]
    );

    if (customer.rowCount === 0) {
      return res.status(400).json({
        error: "The selected customer does not exist.",
      });
    }

    const result = await db.query(
      `UPDATE public.orders
       SET order_code = $1,
           customer_id = $2,
           garment_type = $3,
           description = $4,
           quantity = $5,
           order_date = COALESCE($6::date, order_date),
           due_date = $7,
           status = $8,
           total_price = $9,
           notes = $10
       WHERE id = $11
       RETURNING *`,
      [
        order.orderCode,
        order.customerId,
        order.garmentType,
        order.description,
        order.quantity,
        order.orderDate,
        order.dueDate,
        order.status,
        order.totalPrice,
        order.notes,
        id,
      ]
    );

    res.json(result.rows[0]);
  })
);

// DELETE order
app.delete(
  "/api/orders/:id",
  asyncHandler(async (req, res) => {
    const id = getId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid order ID." });
    }

    const result = await db.query(
      "DELETE FROM public.orders WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json({ message: "Order deleted successfully." });
  })
);

// ==============================
// ERROR HANDLING
// ==============================

app.use((req, res) => {
  res.status(404).json({
    error: "API endpoint not found.",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("\n========== STITCHFLOW API ERROR ==========");
  console.error("Request:", req.method, req.originalUrl);
  console.error("Message:", err.message);
  console.error("PostgreSQL code:", err.code || "N/A");
  console.error("Detail:", err.detail || "N/A");
  console.error("==========================================\n");

  if (res.headersSent) {
    return next(err);
  }

  if (err.code === "23503") {
    return res.status(400).json({
      error: "A related customer or record does not exist.",
      code: err.code,
    });
  }

  if (err.code === "23505") {
    return res.status(409).json({
      error: "A record with this unique value already exists.",
      code: err.code,
    });
  }

  if (err.code === "23502") {
    return res.status(400).json({
      error: "A required database field is missing.",
      field: err.column || null,
      code: err.code,
    });
  }

  if (err.code === "42703") {
    return res.status(500).json({
      error: "Database column mismatch. Check the backend SQL and schema.",
      field: err.column || null,
      code: err.code,
    });
  }

  if (err.code === "42P01") {
    return res.status(500).json({
      error: "A required database table was not found.",
      table: err.table || null,
      code: err.code,
    });
  }

  if (
    ["22P02", "22007", "23514", "22003", "22001"].includes(err.code)
  ) {
    return res.status(400).json({
      error: "One or more values have an invalid format or value.",
      code: err.code,
    });
  }

  res.status(500).json({
    error: "Internal server error. Check the backend terminal.",
    code: err.code || "INTERNAL_ERROR",
  });
});

// START SERVER
async function startServer() {
  try {
    await db.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`StitchFlow API running at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error.message);
    process.exit(1);
  }
}

startServer();
