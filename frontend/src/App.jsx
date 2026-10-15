import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

const measurementFields = [
  "chest",
  "waist",
  "hips",
  "shoulder",
  "sleeve",
  "length",
];

const emptyCustomer = {
  name: "",
  phone: "",
  email: "",
  address: "",
};

const emptyMeasurement = {
  customer_id: "",
  chest: "",
  waist: "",
  hips: "",
  shoulder: "",
  sleeve: "",
  length: "",
  notes: "",
};

const emptyOrder = {
  order_code: "",
  customer_id: "",
  garment_type: "",
  description: "",
  quantity: 1,
  order_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  status: "Pending",
  total_price: "",
  notes: "",
};

function getList(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);
}

function formatLabel(value) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function App() {
  const [page, setPage] = useState("customers");

  const [customers, setCustomers] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingMeasurementId, setEditingMeasurementId] =
    useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const [customerForm, setCustomerForm] = useState({
    ...emptyCustomer,
  });

  const [measurementForm, setMeasurementForm] = useState({
    ...emptyMeasurement,
  });

  const [orderForm, setOrderForm] = useState({
    ...emptyOrder,
  });

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        customerResponse,
        measurementResponse,
        orderResponse,
      ] = await Promise.all([
        api.get("/customers"),
        api.get("/measurements"),
        api.get("/orders"),
      ]);

      setCustomers(
        getList(customerResponse.data, "customers")
      );

      setMeasurements(
        getList(measurementResponse.data, "measurements")
      );

      setOrders(getList(orderResponse.data, "orders"));
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Cannot load data. Check the backend, database, and API routes."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function showSuccess(message) {
    setSuccess(message);
    setError("");
  }

  function resetCustomerForm() {
    setCustomerForm({ ...emptyCustomer });
    setEditingCustomerId(null);
  }

  function resetMeasurementForm() {
    setMeasurementForm({ ...emptyMeasurement });
    setEditingMeasurementId(null);
  }

  function resetOrderForm() {
    setOrderForm({
      ...emptyOrder,
      order_date: new Date().toISOString().slice(0, 10),
    });
    setEditingOrderId(null);
  }

  function updateCustomerField(event) {
    const { name, value } = event.target;

    setCustomerForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function updateMeasurementField(event) {
    const { name, value } = event.target;

    setMeasurementForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function updateOrderField(event) {
    const { name, value } = event.target;

    setOrderForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

 async function saveCustomer(event) {
  event.preventDefault();

  if (saving) return;

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    const payload = {
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim(),
      address: customerForm.address.trim(),
    };

    if (payload.email) {
  const duplicateEmail = customers.some((customer) => {
    const sameEmail =
      customer.email?.trim().toLowerCase() ===
      payload.email.toLowerCase();

    const isDifferentCustomer =
      Number(customer.id) !== Number(editingCustomerId);

    return sameEmail && isDifferentCustomer;
  });

  if (duplicateEmail) {
    throw new Error(
      "This email address is already registered to another customer."
    );
  }
}

    if (
      payload.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
    ) {
      throw new Error("Please enter a valid email address.");
    }

    if (editingCustomerId !== null) {
      await api.put(
        `/customers/${editingCustomerId}`,
        payload
      );

      showSuccess("Customer updated successfully.");
    } else {
      await api.post("/customers", payload);

      showSuccess("Customer added successfully.");
    }

    resetCustomerForm();
    await loadData();
  } catch (err) {
    setError(
      getErrorMessage(
        err,
        "Unable to save customer. Please check the customer details."
      )
    );
  } finally {
    setSaving(false);
  }
}

  function editCustomer(customer) {
    setCustomerForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });

    setEditingCustomerId(customer.id);
    setPage("customers");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCustomer(customer) {
    const confirmed = window.confirm(
      `Delete customer "${customer.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/customers/${customer.id}`);

      showSuccess("Customer deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to delete customer. Check whether the customer has measurements or orders."
        )
      );
    }
  }

  
async function saveMeasurement(event) {
  event.preventDefault();

  if (saving) return;

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    const payload = {
      customer_id: Number(measurementForm.customer_id),
      chest: measurementForm.chest || null,
      waist: measurementForm.waist || null,
      hips: measurementForm.hips || null,
      shoulder: measurementForm.shoulder || null,
      sleeve: measurementForm.sleeve || null,
      length: measurementForm.length || null,
      notes: measurementForm.notes.trim(),
    };

    if (!payload.customer_id) {
      throw new Error("Please select a customer.");
    }

    const hasMeasurement = measurementFields.some((field) => {
      const value = payload[field];
      return value !== null && value !== "";
    });

    if (!hasMeasurement) {
      throw new Error(
        "Please enter at least one body measurement."
      );
    }

  
    for (const field of measurementFields) {
      const value = payload[field];

      if (value === null || value === "") {
        payload[field] = null;
        continue;
      }

      const numericValue = Number(value);

      if (!Number.isFinite(numericValue) || numericValue < 0) {
        throw new Error(
          `${formatLabel(field)} must be a valid number zero or greater.`
        );
      }

      payload[field] = numericValue;
    }

    if (editingMeasurementId !== null) {
      await api.put(
        `/measurements/${editingMeasurementId}`,
        payload
      );

      showSuccess("Measurement updated successfully.");
    } else {
      await api.post("/measurements", payload);

      showSuccess("Measurement added successfully.");
    }

    // Reset the form and refresh the records
    resetMeasurementForm();
    await loadData();
  } catch (err) {
    setError(
      getErrorMessage(
        err,
        "Unable to save measurement. Please check the measurement details."
      )
    );
  } finally {
    setSaving(false);
  }
}

  async function deleteMeasurement(measurement) {
    const confirmed = window.confirm(
      "Delete this measurement record?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/measurements/${measurement.id}`);

      showSuccess("Measurement deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to delete measurement.")
      );
    }
  }

  // REVISED ORDER-SAVING FUNCTION
  async function saveOrder(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        order_code: orderForm.order_code.trim() || null,
        customer_id: Number(orderForm.customer_id),
        garment_type: orderForm.garment_type.trim(),
        description: orderForm.description.trim(),
        quantity: Number(orderForm.quantity),
        order_date: orderForm.order_date || null,
        due_date: orderForm.due_date || null,
        status: orderForm.status || "Pending",
        total_price: Number(orderForm.total_price),
        notes: orderForm.notes.trim(),
      };

      if (!payload.customer_id) {
        throw new Error("Please select a customer.");
      }

      if (!payload.garment_type) {
        throw new Error("Please enter the garment type.");
      }

      if (
        !Number.isInteger(payload.quantity) ||
        payload.quantity < 1
      ) {
        throw new Error(
          "Quantity must be a positive whole number."
        );
      }

      if (
        !Number.isFinite(payload.total_price) ||
        payload.total_price < 0
      ) {
        throw new Error(
          "Please enter a valid total price."
        );
      }

      if (!payload.order_date) {
        throw new Error("Please select an order date.");
      }

      if (
        payload.due_date &&
        payload.due_date < payload.order_date
      ) {
        throw new Error(
          "The due date cannot be earlier than the order date."
        );
      }

      if (editingOrderId !== null) {
        await api.put(
          `/orders/${editingOrderId}`,
          payload
        );

        showSuccess("Order updated successfully.");
      } else {
        const response = await api.post("/orders", payload);
        const generatedCode = response.data?.order_code;

        showSuccess(
          generatedCode
            ? `Order added successfully. Order Code: ${generatedCode}`
            : "Order added successfully."
        );
      }

      resetOrderForm();
      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to save order. Check your input and backend connection."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  function editOrder(order) {
    setOrderForm({
      order_code: order.order_code || "",
      customer_id: String(order.customer_id || ""),
      garment_type: order.garment_type || "",
      description: order.description || "",
      quantity: order.quantity ?? 1,
      order_date: order.order_date
        ? String(order.order_date).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      due_date: order.due_date
        ? String(order.due_date).slice(0, 10)
        : "",
      status: order.status || "Pending",
      total_price: order.total_price ?? "",
      notes: order.notes || "",
    });

    setEditingOrderId(order.id);
    setPage("orders");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteOrder(order) {
    const confirmed = window.confirm(
      `Delete order "${order.order_code || order.id}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/orders/${order.id}`);

      showSuccess("Order deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to delete order.")
      );
    }
  }

  function customerName(customerId) {
    const customer = customers.find(
      (item) => Number(item.id) === Number(customerId)
    );

    return customer?.name || "Unknown Customer";
  }

  function customerOptionLabel(customer) {
    return `${customer.name}${
      customer.phone ? ` — ${customer.phone}` : ""
    }`;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">S</div>
          <div>
            <h1>StitchFlow</h1>
            <p>Tailoring Management</p>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${
              page === "customers" ? "active" : ""
            }`}
            onClick={() => {
              setPage("customers");
              setError("");
              setSuccess("");
            }}
          >
            <span>♙</span> Customers
          </button>

          <button
            type="button"
            className={`nav-item ${
              page === "measurements" ? "active" : ""
            }`}
            onClick={() => {
              setPage("measurements");
              setError("");
              setSuccess("");
            }}
          >
            <span>♧</span> Measurements
          </button>

          <button
            type="button"
            className={`nav-item ${
              page === "orders" ? "active" : ""
            }`}
            onClick={() => {
              setPage("orders");
              setError("");
              setSuccess("");
            }}
          >
            <span>✂</span> Orders
          </button>
        </nav>

        <div className="sidebar-footer">
          <strong>StitchFlow System</strong>
          <p>Tailoring made organized.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">
              TAILORING MANAGEMENT SYSTEM
            </p>

            <h2>
              {page === "customers"
                ? "Customers"
                : page === "measurements"
                ? "Measurements"
                : "Orders"}
            </h2>

            <p>
              Manage your tailoring shop records in one place.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </header>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message" role="status">
            {success}
          </div>
        )}

        <section className="stats-grid">
          <div className="stat-card">
            <p>Total Customers</p>
            <h3>{customers.length}</h3>
          </div>

          <div className="stat-card">
            <p>Total Measurements</p>
            <h3>{measurements.length}</h3>
          </div>

          <div className="stat-card">
            <p>Total Orders</p>
            <h3>{orders.length}</h3>
          </div>
        </section>

        {page === "customers" && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <h3>
                  {editingCustomerId !== null
                    ? "Edit Customer"
                    : "Add Customer"}
                </h3>
                <p>
                  Enter the customer's contact information.
                </p>
              </div>

              <form onSubmit={saveCustomer}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="customer-name">
                      Full Name *
                    </label>
                    <input
                      id="customer-name"
                      name="name"
                      value={customerForm.name}
                      onChange={updateCustomerField}
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="customer-phone">
                      Phone Number
                    </label>
                    <input
                      id="customer-phone"
                      name="phone"
                      value={customerForm.phone}
                      onChange={updateCustomerField}
                      placeholder="09XX XXX XXXX"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="customer-email">
                      Email Address
                    </label>
                    <input
                      id="customer-email"
                      name="email"
                      type="email"
                      value={customerForm.email}
                      onChange={updateCustomerField}
                      placeholder="customer@email.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="customer-address">
                      Address
                    </label>
                    <input
                      id="customer-address"
                      name="address"
                      value={customerForm.address}
                      onChange={updateCustomerField}
                      placeholder="Enter address"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingCustomerId !== null
                      ? "Update Customer"
                      : "+ Add Customer"}
                  </button>

                  {editingCustomerId !== null && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetCustomerForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="panel">
              <div className="list-heading">
                <div>
                  <h3>Customer List</h3>
                  <p>
                    {customers.length} customer record(s)
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadData}
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-state">
                          No customers found. Add your first
                          customer above.
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer) => (
                        <tr key={customer.id}>
                          <td>{customer.name}</td>
                          <td>{customer.phone || "—"}</td>
                          <td>{customer.email || "—"}</td>
                          <td>{customer.address || "—"}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn btn-edit"
                                onClick={() =>
                                  editCustomer(customer)
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="btn btn-delete"
                                onClick={() =>
                                  deleteCustomer(customer)
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {page === "measurements" && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <h3>
                  {editingMeasurementId !== null
                    ? "Edit Measurement"
                    : "Add Measurement"}
                </h3>
                <p>
                  Record the customer's body measurements.
                </p>
              </div>

              {customers.length === 0 ? (
                <p className="empty-state">
                  Add a customer first before recording
                  measurements.
                </p>
              ) : (
                <form onSubmit={saveMeasurement}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="measurement-customer">
                        Customer *
                      </label>

                      <select
                        id="measurement-customer"
                        name="customer_id"
                        value={measurementForm.customer_id}
                        onChange={updateMeasurementField}
                        required
                      >
                        <option value="">
                          Select a customer
                        </option>

                        {customers.map((customer) => (
                          <option
                            key={customer.id}
                            value={customer.id}
                          >
                            {customerOptionLabel(customer)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {measurementFields.map((field) => (
                      <div className="form-group" key={field}>
                        <label htmlFor={`measurement-${field}`}>
                          {formatLabel(field)} (cm)
                        </label>

                        <input
                          id={`measurement-${field}`}
                          name={field}
                          type="number"
                          min="0"
                          step="0.01"
                          value={measurementForm[field]}
                          onChange={updateMeasurementField}
                          placeholder={`Enter ${field}`}
                        />
                      </div>
                    ))}

                    <div className="form-group form-group-full">
                      <label htmlFor="measurement-notes">
                        Notes
                      </label>

                      <textarea
                        id="measurement-notes"
                        name="notes"
                        value={measurementForm.notes}
                        onChange={updateMeasurementField}
                        placeholder="Additional measurement notes"
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingMeasurementId !== null
                        ? "Update Measurement"
                        : "+ Add Measurement"}
                    </button>

                    {editingMeasurementId !== null && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={resetMeasurementForm}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </section>

            <section className="panel">
              <div className="list-heading">
                <div>
                  <h3>Measurement List</h3>
                  <p>
                    {measurements.length} measurement record(s)
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadData}
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      {measurementFields.map((field) => (
                        <th key={field}>
                          {formatLabel(field)} (cm)
                        </th>
                      ))}
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {measurements.length === 0 ? (
                      <tr>
                        <td
                          colSpan={measurementFields.length + 3}
                          className="empty-state"
                        >
                          No measurements recorded yet.
                        </td>
                      </tr>
                    ) : (
                      measurements.map((measurement) => (
                        <tr key={measurement.id}>
                          <td>
                            {measurement.customer_name ||
                              customerName(
                                measurement.customer_id
                              )}
                          </td>

                          {measurementFields.map((field) => (
                            <td key={field}>
                              {measurement[field] ?? "—"}
                            </td>
                          ))}

                          <td>{measurement.notes || "—"}</td>

                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn btn-edit"
                                onClick={() =>
                                  editMeasurement(measurement)
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="btn btn-delete"
                                onClick={() =>
                                  deleteMeasurement(measurement)
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {page === "orders" && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <h3>
                  {editingOrderId !== null
                    ? "Edit Order"
                    : "Add Order"}
                </h3>
                <p>
                  Enter the details of the customer's tailoring
                  order.
                </p>
              </div>

              {customers.length === 0 ? (
                <p className="empty-state">
                  Add a customer first before creating an order.
                </p>
              ) : (
                <form onSubmit={saveOrder}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="order-code">
                        Order Code
                      </label>

                      <input
                        id="order-code"
                        name="order_code"
                        value={orderForm.order_code}
                        onChange={updateOrderField}
                        placeholder="Leave blank to generate automatically"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="order-customer">
                        Customer *
                      </label>

                      <select
                        id="order-customer"
                        name="customer_id"
                        value={orderForm.customer_id}
                        onChange={updateOrderField}
                        required
                      >
                        <option value="">
                          Select a customer
                        </option>

                        {customers.map((customer) => (
                          <option
                            key={customer.id}
                            value={customer.id}
                          >
                            {customerOptionLabel(customer)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="order-garment">
                        Garment Type *
                      </label>

                      <input
                        id="order-garment"
                        name="garment_type"
                        value={orderForm.garment_type}
                        onChange={updateOrderField}
                        placeholder="School Uniform, Dress, Barong"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="order-quantity">
                        Quantity *
                      </label>

                      <input
                        id="order-quantity"
                        name="quantity"
                        type="number"
                        min="1"
                        step="1"
                        value={orderForm.quantity}
                        onChange={updateOrderField}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="order-date">
                        Order Date *
                      </label>

                      <input
                        id="order-date"
                        name="order_date"
                        type="date"
                        value={orderForm.order_date}
                        onChange={updateOrderField}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="order-due-date">
                        Due Date
                      </label>

                      <input
                        id="order-due-date"
                        name="due_date"
                        type="date"
                        value={orderForm.due_date}
                        onChange={updateOrderField}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="order-status">
                        Status *
                      </label>

                      <select
                        id="order-status"
                        name="status"
                        value={orderForm.status}
                        onChange={updateOrderField}
                        required
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">
                          In Progress
                        </option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="order-price">
                        Total Price (PHP) *
                      </label>

                      <input
                        id="order-price"
                        name="total_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={orderForm.total_price}
                        onChange={updateOrderField}
                        placeholder="1500.00"
                        required
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label htmlFor="order-description">
                        Description
                      </label>

                      <textarea
                        id="order-description"
                        name="description"
                        value={orderForm.description}
                        onChange={updateOrderField}
                        placeholder="Describe the garment and requested design"
                        rows="3"
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label htmlFor="order-notes">Notes</label>

                      <textarea
                        id="order-notes"
                        name="notes"
                        value={orderForm.notes}
                        onChange={updateOrderField}
                        placeholder="Additional instructions"
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingOrderId !== null
                        ? "Update Order"
                        : "+ Add Order"}
                    </button>

                    {editingOrderId !== null && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={resetOrderForm}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </section>

            <section className="panel">
              <div className="list-heading">
                <div>
                  <h3>Order List</h3>
                  <p>{orders.length} order record(s)</p>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadData}
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Order Code</th>
                      <th>Customer</th>
                      <th>Garment</th>
                      <th>Qty</th>
                      <th>Order Date</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="empty-state">
                          No orders found. Add your first order
                          above.
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            {order.order_code ||
                              `ORD-${order.id}`}
                          </td>

                          <td>
                            {order.customer_name ||
                              customerName(order.customer_id)}
                          </td>

                          <td>{order.garment_type}</td>
                          <td>{order.quantity}</td>

                          <td>
                            {order.order_date
                              ? String(order.order_date).slice(0, 10)
                              : "—"}
                          </td>

                          <td>
                            {order.due_date
                              ? String(order.due_date).slice(0, 10)
                              : "—"}
                          </td>

                          <td>
                            <span className="order-status">
                              {order.status}
                            </span>
                          </td>

                          <td>
                            {formatCurrency(order.total_price)}
                          </td>

                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn btn-edit"
                                onClick={() => editOrder(order)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="btn btn-delete"
                                onClick={() => deleteOrder(order)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}