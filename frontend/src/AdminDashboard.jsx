import { useState } from "react";
import api from "./api";
import "./Admin.css";

function AdminDashboard({
  user,
  stats,
  monthly,
  adminOrders,
  updateOrderStatus,
  bestSellers
}) {
  const [usearch, setuSearch] = useState("");
  const [ausers, setaUsers] = useState([]);
  const [userTypingTimeout, setUserTypingTimeout] = useState(null);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setuSearch(value);

    if (userTypingTimeout) {
      clearTimeout(userTypingTimeout);
    }

    const timeout = setTimeout(() => {
      if (!value.trim()) {
        setaUsers([]);
        return;
      }

      api
        .get("/admin/users/search", { params: { q: value } })
        .then((res) => setaUsers(res.data.users))
        .catch(() => alert("User search failed"));
    }, 500);

    setUserTypingTimeout(timeout);
  };

  return (
    <div className="admin-dashboard">
      {/* ===== Header ===== */}
      <h1>Admin Dashboard</h1>

      {/* ===== User Search ===== */}
      <div className="user-search">
        <input
          placeholder="Search users"
          value={usearch}
          onChange={handleSearchChange}
        />

        <ul className="user-list">
          {ausers.map((u) => (
            <li key={u.user_id}>
              <strong>{u.name}</strong> (Id: {u.user_id}) – Role: {u.role}
            </li>
          ))}
        </ul>
      </div>

      {/* ===== Orders ===== */}
      <h1>All Orders</h1>

      {adminOrders.length === 0 ? (
        <p>No orders found</p>
      ) : (
        adminOrders.map((order) => (
          <div key={order._id} className="product">
            <p className="order-summary">
              <strong>User:</strong> {order.user_id} <br />
              <strong>Total:</strong> ₹{order.total} <br />
              <strong>Status:</strong>{" "}
              <select
                value={order.status}
                onChange={(e) =>
                  updateOrderStatus(order._id, e.target.value)
                }
              >
                {order.status === "pending" && (
                  <>
                    <option value="pending">pending</option>
                    <option value="shipped">shipped</option>
                    <option value="cancelled">cancelled</option>
                  </>
                )}
                {order.status === "shipped" && (
                  <>
                    <option value="shipped">shipped</option>
                    <option value="delivered">delivered</option>
                  </>
                )}
                {["delivered", "cancelled"].includes(order.status) && (
                  <option value={order.status}>{order.status}</option>
                )}
              </select>
            </p>

            <div className="order-items">
              {order.items.map((item) => (
                <div key={item.product_id} className="order-item">
                  <img src={item.image} alt={item.name} width="50" />
                  <p>
                    {item.name} × {item.qty}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ===== Admin Stats & Best Sellers ===== */}
      {user?.role === "admin" && stats && (
        <div className="admin-sections">
          {/* Stats */}
          <div className="admin-stats">
            <div>
              <h2>Admin Stats</h2>
              <p>Total Orders: {stats.total_orders}</p>
              <p>Total Revenue: ₹{stats.total_revenue}</p>
              <p>Pending Orders: {stats.pending_orders}</p>
              <p>Delivered Orders: {stats.delivered_orders}</p>
              <p>Monthly Revenue: ₹{monthly?.monthly_revenue || 0}</p>
            </div>
          </div>

          {/* Best Sellers */}
          <div className="best-sellers">
            <h2>Best Selling Products</h2>

            {bestSellers.length === 0 ? (
              <p>No sales yet</p>
            ) : (
              <ul>
                {bestSellers.map((p) => (
                  <li key={p.product_id}>
                    <img src={p.image} alt={p.name} width="50" />
                    <div>
                      <strong>{p.name}</strong>
                      <p>Sold: {p.total_sold}</p>
                      <p>Revenue: ₹{p.revenue}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
