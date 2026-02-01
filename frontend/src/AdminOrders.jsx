import { useEffect, useState } from "react";
import api from "./api";

export default function AdminOrders({ onBack }) {
  const [orders, setOrders] = useState([]);

  const loadOrders = async () => {
    const res = await api.get("/admin/orders");
    setOrders(res.data);
  };

  const updateStatus = async (id, status) => {
    await api.put(`/admin/orders/${id}/status`, null, {
      params: { status }
    });
    loadOrders();
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div>
      <button onClick={onBack}>Back</button>
      <h2>Admin Orders</h2>

      {orders.map(o => (
        <div key={o._id}>
          <p>User: {o.user_id}</p>
          <p>Total: ₹{o.total}</p>
          <p>Status: {o.status}</p>

          <select
            value={o.status}
            onChange={e => updateStatus(o._id, e.target.value)}
          >
            <option value="pending">pending</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
      ))}
    </div>
  );
}
