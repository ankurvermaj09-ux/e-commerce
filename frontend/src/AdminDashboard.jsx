import { useState, useEffect } from "react";
import api from "./api";
import RevenueChart from "./RevenueChart";
import OrderRationChart from "./OrderRatioChart";
import CategorySalesChart from "./CategorySalesChart";

function AdminDashboard({
  user,
  stats,
  monthly,
  adminOrders,
  updateOrderStatus,
  bestSellers,
  pendingCost,
  cancelledCost,
  products = [], 
  loadProducts,
  orderRatio,
  categorySales,
}) {
  const [activeTab, setActiveTab] = useState("stats");
  const [usearch, setuSearch] = useState("");
  const [ausers, setaUsers] = useState([]);
  const [userTypingTimeout, setUserTypingTimeout] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newQty, setNewQty] = useState(0);
  const [topCustomers, setTopCustomers] = useState([]);
  const [newProduct, setNewProduct] = useState({
  name: "",
  price: "",
  qty: "",
  category: "",
  description: "",
  images: []
});

  // Derived Data
  const lowStockProducts = products?.filter(p => p.qty < 5) || [];
  const totalStockValue = products?.reduce((acc, p) => acc + (p.price * p.qty), 0) || 0;
  const totalItemCount = products?.reduce((acc, p) => acc + p.qty, 0) || 0;



  const loadTopCustomers = () => {
    api.get("/admin/stats/top-customers")
      .then(res => setTopCustomers(res.data))
      .catch(err => console.error(err));
  };

    useEffect(() => {
    loadTopCustomers();
  }, []);

  const openEditModal = (product) => {
    if (!product) return;
    setEditingProduct(product);
    setNewQty(product.qty || 0);
  };

  const handleUpdateStock = () => {
    if (!editingProduct?.product_id) return;
    
    api.put(`/admin/products/${editingProduct.product_id}/stock?qty=${newQty}`)
      .then(() => {
        alert("Stock updated successfully!");
        setEditingProduct(null);
        loadProducts();
      })
      .catch(err => console.error("Update failed:", err));
  };

const handleChange = (e) => {
  setNewProduct({
    ...newProduct,
    [e.target.name]: e.target.value
  });
};

const handleSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();

  formData.append("name", newProduct.name);
  formData.append("price", newProduct.price);
  formData.append("qty", newProduct.qty);
  formData.append("category", newProduct.category);
  formData.append("description", newProduct.description);
  formData.append("image", newProduct.images[0]); // single image

  await api.post("http://127.0.0.1:5000/admin/products", formData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "multipart/form-data"
    }
  });
};


  const exportOrdersToCSV = () => {
    if (!adminOrders || adminOrders.length === 0) return alert("No orders to export!");
    const headers = ["Order ID", "Date", "Customer Email", "Total Amount (₹)", "Status", "Items"];
    const rows = adminOrders.map(order => [
      order._id,
      new Date(order.created_at).toLocaleDateString('en-IN'),
      order.email,
      order.total,
      order.status,
      order.items.map(i => `${i.name}(${i.qty})`).join(" | ")
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Orders_Report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const promoteUser = (userId) => {
    if (window.confirm("Are you sure you want to make this user an admin?")) {
      api.put(`/admin/promote/${userId}`)
        .then(() => alert("Promotion successful!"))
        .catch(err => alert(err.response?.data?.detail || "Error"));
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setuSearch(value);
    if (userTypingTimeout) clearTimeout(userTypingTimeout);
    const timeout = setTimeout(() => {
      if (!value.trim()) {
        setaUsers([]);
        return;
      }
      api.get("/admin/users/search", { params: { q: value } })
        .then((res) => setaUsers(res.data.users))
        .catch(() => alert("User search failed"));
    }, 500);
    setUserTypingTimeout(timeout);
  };


  


  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
          <p className="admin-name">{user?.name}</p>
        </div>
        <nav className="sidebar-nav">
  <button
    className={activeTab === "stats" ? "active" : ""}
    onClick={() => setActiveTab("stats")}
  >
    Overview
  </button>

  <button
    className={activeTab === "orders" ? "active" : ""}
    onClick={() => setActiveTab("orders")}
  >
    Manage Orders
  </button>

  <button
    className={activeTab === "users" ? "active" : ""}
    onClick={() => setActiveTab("users")}
  >
    User Search
  </button>

  <button
    className={activeTab === "stock" ? "active" : ""}
    onClick={() => setActiveTab("stock")}
  >
    Stock Management
  </button>

</nav>
      </aside>

      <main className="admin-main">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "stats" && (
          <div className="tab-content animate-fade">
            <h2 style={{ marginTop: "30px" }}>Monthly Revenue</h2>

{monthly && monthly.length > 0 ? (
  <RevenueChart data={monthly} />
) : (
  <p>No revenue data available.</p>
)}

<h2 style={{margin:"40px"}}>order status Ratio</h2>
{orderRatio?(<OrderRationChart data={orderRatio}/>):(<p>loading ratio...</p>)}


<h2 style={{ marginTop: "40px" }}>Category-wise Sales</h2>
{categorySales ? (
  <CategorySalesChart data={categorySales} />
) : (
  <p>Loading category sales...</p>
)}

            <h1>Business Overview</h1>
            <div className="stats-grid">
              <div className="stat-card"><h3>₹{stats?.total_revenue || 0}</h3><p>Total Revenue</p></div>
              <div className="stat-card"><h3>{stats?.total_orders || 0}</h3><p>Total Orders</p></div>
              <div className="stat-card"><h3>{stats?.pending_orders || 0}</h3><p>Pending</p></div>
              <div className="stat-card"><h3>₹{monthly?.monthly_revenue || 0}</h3><p>Monthly Sales</p></div>
              <div className="stat-card"><h3>₹{pendingCost?.pending_cost || 0}</h3><p>Pending Cost</p></div>
              <div className="stat-card"><h3>₹{cancelledCost?.cancelled_cost || 0}</h3><p>Cancelled Cost</p></div>
              <div className="stat-card">
  <h3>{stats?.cancellation_rate || 0}%</h3>
  <p>Cancellation Rate</p>
</div>

<div className="stat-card">
  <h3>₹{stats?.average_order_value || 0}</h3>
  <p>Avg Order Value</p>
</div>

<div className="stat-card">
  <h3>{stats?.revenue_growth || 0}%</h3>
  <p>Revenue Growth</p>
</div>

            </div>

            <div className="admin-dashboard-row" style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
              <div className="best-sellers-section glass" style={{ flex: 1 }}>
                <h2>🔥 Best Selling Products</h2>
                {!bestSellers?.length ? <p className="no-data">No sales data yet.</p> : (
                  <ul className="admin-best-list">
                    {bestSellers.map((p) => (
                      <li key={p.product_id} className="best-item">
                        <img src={p.image} alt={p.name} width="50" height="50" />
                        <div className="best-details">
                          <strong>{p.name}</strong>
                          <p>Sold: {p.total_sold} | Revenue: ₹{p.revenue}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="top-customers-section glass" style={{ flex: 1 }}>
                <h3>💎 Top Customers</h3>
                <table className="admin-table">
                  <thead>
                    <tr><th>Email</th><th>Orders</th><th>Total Spent</th></tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((customer) => (
                      <tr key={customer._id}>
                        <td>{customer.email}</td>
                        <td>{customer.order_count}</td>
                        <td>₹{customer.total_spent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-section low-stock-alerts glass" style={{ marginTop: '20px' }}>
              <h2>⚠️ Restock Required</h2>
              {lowStockProducts.length > 0 ? (
                <div className="restock-grid">
                  {lowStockProducts.map((p) => (
                    <div key={p.product_id} className="restock-card">
                      <img src={p.image} alt={p.name} width="50" />
                      <div className="restock-info">
                        <strong>{p.name}</strong>
                        <p className={p.qty === 0 ? "out-of-stock" : "low-stock"}>Stock: {p.qty}</p>
                      </div>
                      <button onClick={() => openEditModal(p)}>Update Stock</button>
                    </div>
                  ))}
                </div>
              ) : <p className="success-text">✅ All products are well-stocked!</p>}
              <div className="stock-summary">
                <hr />
                <h3>Total Inventory Value: ₹{totalStockValue}</h3>
                <p>Total items in warehouse: {totalItemCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS */}
        {activeTab === "orders" && (
          <div className="tab-content animate-fade">
            <h1>Order Management</h1>
            <button onClick={exportOrdersToCSV} className="export-btn">Download CSV Report</button>
            <div className="orders-list">
              {[...(adminOrders || [])].reverse().map((order) => (
                <div key={order._id} className="order-card-admin glass">
                  <div className="order-header">
                    <p><strong>Order ID:</strong> {order._id}</p>
                    <select
                      value={order.status}
                      className={`status-select ${order.status}`}
                      onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                      disabled={["delivered", "cancelled"].includes(order.status)}
                    >
                      <option value="pending">Pending</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: USER SEARCH */}
        {activeTab === "users" && (
          <div className="tab-content animate-fade">
            <h1>Customer Database</h1>
            <input className="admin-input-search" placeholder="Search by name or ID..." value={usearch} onChange={handleSearchChange} />
            <div className="user-results-list">
              {ausers.map((u) => (
                <div key={u.user_id} className="user-row glass">
                  <span>{u.name} ({u.email})</span>
                  <button onClick={() => promoteUser(u.user_id)}>Promote to Admin</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: Fixed safety checks to prevent 'null' errors */}
        {editingProduct && (
          <div className="modal-overlay">
            <div className="modal-content glass">
              <h3>Update Stock: {editingProduct?.name || "Product"}</h3>
              <div className="qty-input-group">
                <label>New Quantity:</label>
                <input 
                  type="number" 
                  value={newQty} 
                  onChange={(e) => setNewQty(parseInt(e.target.value) || 0)} 
                />
              </div>
              <div className="modal-actions">
                <button onClick={handleUpdateStock}>Save Changes</button>
                <button onClick={() => setEditingProduct(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}


         {/* TAB 2: ORDERS */}
        {activeTab === "orders" && (
          <div className="tab-content animate-fade">
            <h1>Order Management</h1>
            <button onClick={exportOrdersToCSV} className="export-btn">Download CSV Report</button>
            <div className="orders-list">
              {[...(adminOrders || [])].reverse().map((order) => (
                <div key={order._id} className="order-card-admin glass">
                  <div className="order-header">
                    <p><strong>Order ID:</strong> {order._id}</p>
                    <select
                      value={order.status}
                      className={`status-select ${order.status}`}
                      onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                      disabled={["delivered", "cancelled"].includes(order.status)}
                    >
                      <option value="pending">Pending</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: STOCK MANAGEMENT */}
        {activeTab === "stock" && (
  <div className="tab-content animate-fade">
    <h1>Add New Product</h1>

    <form onSubmit={handleSubmit} className="admin-form">

      <input
        type="file"
        multiple
        onChange={(e) =>
          setNewProduct({
            ...newProduct,
            images: Array.from(e.target.files)
          })
        }
      />

      <input
        type="text"
        name="name"
        placeholder="Product Name"
        value={newProduct.name}
        onChange={handleChange}
      />

      <input
        type="number"
        name="price"
        placeholder="Price"
        value={newProduct.price}
        onChange={handleChange}
      />

      <input
        type="number"
        name="qty"
        placeholder="Stock Quantity"
        value={newProduct.qty}
        onChange={handleChange}
      />

      <input
        type="text"
        name="category"
        placeholder="Category"
        value={newProduct.category}
        onChange={handleChange}
      />

      <textarea
        name="description"
        placeholder="Description"
        value={newProduct.description}
        onChange={handleChange}
      />

      <button type="submit">Add Product</button>
    </form>
  </div>
)}





      </main>
    </div>
  );
}

export default AdminDashboard;