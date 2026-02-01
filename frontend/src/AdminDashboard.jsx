import { useState } from "react";
import api from "./api";
import "./App.css";


function AdminDashboard({ user, stats, monthly, adminOrders, updateOrderStatus, bestSellers }) {

  const [usearch, setuSearch] = useState("");
  const [ausers, setaUsers] = useState([]);
  const [userTypingTimeout, setUserTypingTimeout] = useState(null);



  return (
    <div>
      <h1>Admin Dashboard</h1>
      <input
        placeholder="Search users"
        value={usearch}
        onChange={(e) => {
  const value = e.target.value;
  setuSearch(value);

  // clear previous debounce timer
  if (userTypingTimeout) {
    clearTimeout(userTypingTimeout);
  }

  // start new debounce timer
  const timeout = setTimeout(() => {
    if (!value.trim()) {
      setaUsers([]); // clear results if empty
      return;
    }

    api.get("/admin/users/search", {
      params: { q: value }
    })
    .then(res => setaUsers(res.data.users))
    .catch(() => alert("User search failed"));
  }, 500); // 500ms debounce

  setUserTypingTimeout(timeout);
}}

      />
      <div >
        <ul>
          {ausers.map(u => (
            <li key={u.name}>
              <strong>{u.name}</strong>(Id:{u.user_id})-Role:{u.role}
            </li>
          ))}
        </ul>
      </div>
      <h1>all orders</h1>
      {/* FIXED: Changed .lenght to .length */}
      {adminOrders.length === 0 ? (
        <p> no orders found</p>
      ) : (
        adminOrders.map(order => (
          <div
            key={order._id} className="product">
            <p>
              <strong>User:</strong> {order.user_id} <br />
              <strong>Total:</strong> ₹{order.total} <br />
              <strong>Status:</strong>{order.status} {" "}
              <select value={order.status}
                onChange={(e) => updateOrderStatus(order._id, e.target.value)}>
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
            {order.items.map(item => (
              <div key={item.product_id} >
                <img src={item.image} width="50" />
                <p>{item.name}X{item.qty}</p>
              </div>
            ))}
          </div>
        ))
      )}
      {user?.role === "admin" && stats && (
        <div>
          <div>
            <h2>Admin Stats</h2>
            <p>Total Orders: {stats.total_orders}</p>
            <p>Total Revenue: ₹{stats.total_revenue}</p>
            <p>Pending Orders: {stats.pending_orders}</p>
            <p>Delivered Orders: {stats.delivered_orders}</p>
            <p>Monthly Revenue: ₹{monthly?.monthly_revenue || 0}</p>
          </div>
          <div>
            <h2>Best selleing products</h2>
            {/* FIXED: Changed .lenght to .length */}
            {bestSellers.length === 0 ? (
              <p>No sales yet</p>
            ) : (
              <ul>
                {bestSellers.map(p => (
                  <li key={p._id}>
                    <img src={p.image} width="50" />
                    <strong>{p.name}</strong><br />
                    sold:{p.total_sold}<br />
                    revenue:₹{p.revenue}
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