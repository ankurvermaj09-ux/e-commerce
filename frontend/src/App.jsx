import { useEffect, useState } from "react";
import api from "./api";
import { jwtDecode } from "jwt-decode";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./App.css";
import AdminDashboard from "./AdminDashboard";

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [name, setName] = useState("");
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [adminOrders, setAdminOrders] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [psearch, setPsearch] = useState("");
  const [typingTimeOut, setTypingTimeout] = useState(null);

  const navigate = useNavigate();

  // Load initial data
  useEffect(() => {
    api.get("/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err));
  }, []);

  const loadCart = () => api.get("/cart").then((res) => setCart(res.data.items || []));
  const loadOrders = () => api.get("/orders").then((res) => setOrders(res.data.orders || []));
  
  const loadAdminStats = () => {
    api.get("/admin/stats").then((res) => setStats(res.data));
    api.get("/admin/stats/monthly").then((res) => setMonthly(res.data));
  };

  const login = () => {
    api.post("/login", { name })
      .then((res) => {
        const token = res.data.access_token;
        localStorage.setItem("access_token", token);
        const decoded = jwtDecode(token);
        setUser({ user_id: decoded.user_id, role: decoded.role, name: decoded.name });
        setName("");
      })
      .catch(() => alert("Login failed"));
  };

  const addtocart = (productId) => {
    if (!user) return alert("Please login first");
    api.post("/cart", null, { params: { product_id: productId } })
      .then(() => loadCart())
      .catch((err) => alert(err.response?.data?.detail || "Error"));
  };

  const checkout = async () => {
    try {
      const res = await api.post("/checkout");
      alert("Success! Total: ₹" + res.data.total);
      setCart([]);
      loadOrders();
    } catch (err) {
      alert("Checkout failed");
    }
  };

  const loadAdminOrders = () => {
    api.get("/admin/orders")
      .then((res) => setAdminOrders(res.data))
      .catch((err) => console.error("Admin orders failed:", err));
  };

  const updateOrderStatus = (orderId, newStatus) => {
    api.put(`/admin/orders/${orderId}/status`, null, { params: { status: newStatus } })
      .then(() => {
        alert("Status updated");
        loadAdminOrders();
      })
      .catch((err) => alert(err.response?.data?.detail || "Update failed"));
  };

  const loadBestSellers = () => {
    api.get("/admin/stats/bestsellers")
      .then((res) => setBestSellers(res.data.products || []))
      .catch((err) => console.error("Bestsellers failed:", err));
  };

  useEffect(() => {
    if (user) {
      loadCart();
      loadOrders();
      if (user.role === "admin") {
        loadAdminStats();
        loadAdminOrders();
        loadBestSellers();
      }
    }
  }, [user]);

  const handleProductSearch = (e) => {
    const value = e.target.value;
    setPsearch(value);

    if (typingTimeOut) clearTimeout(typingTimeOut);

    const timeout = setTimeout(() => {
      const endpoint = !value.trim() ? "/products" : "/products/search";
      const params = !value.trim() ? {} : { params: { q: value } };

      api.get(endpoint, params)
        .then((res) => setProducts(res.data))
        .catch((err) => console.error(err));
    }, 500);

    setTypingTimeout(timeout);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div  className="frontend-header" >
            <h1>Frontend</h1>
            {!user ? (
              <div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                />
                <button className="login-btn" onClick={login}>Login</button>
              </div>
            ) : (
              <div>
                <h3>Welcome {user.name}</h3>
                {user.role === "admin" && (
                  <button className="admin-btn" onClick={() => navigate("/admin")}>Admin Dashboard</button>
                )}
              </div>
            )}

            <div>
              <input
                placeholder="search products"
                value={psearch}
                onChange={handleProductSearch}
              />
            </div>

            <h2>Products</h2>
            <div className="products-grid">
              {products.map((p) => (
                <div className="product-card glass" key={p.product_id}>
                  <img src={p.image} width="80" alt={p.name} />
                  <p className="name"><strong>{p.name}</strong></p>
                  <p className="price">₹{p.price}</p>
                  <p className="qty">qty : {p.qty}</p>
                  <button disabled={p.qty <= 0} onClick={() => addtocart(p.product_id)}>
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>

            <h2>Cart</h2>
            <div className="cart-container">
              {cart.length === 0 ? (
                <p>Empty</p>
              ) : (
                <div className="cart-card">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.product_id}>
                      <img src={item.image} alt={item.name} width="30" />
                      <span>{item.name}</span>
                      <span>x {item.qty}</span>
                    </div>
                  ))}
                  <button className="checkout-btn" onClick={checkout}>
                    Checkout
                  </button>
                </div>
              )}
            </div>

            <h2>Your Orders</h2>
            <div className="orders-grid">
              {orders.map((order) => (
                <div className="order-card" key={order._id}>
                  <div className="order-header">
                    <span>Total: ₹{order.total}</span>
                    <span className={`order-status ${order.status}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="order-items">
                    {order.items.map((item) => (
                      <div className="order-item" key={item.product_id}>
                        <img src={item.image} alt={item.name} width="30" />
                        <span>{item.name}</span>
                        <span>x {item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      />
      <Route
        path="/admin"
        element={
          user?.role === "admin" ? (
            <AdminDashboard
              user={user}
              stats={stats}
              monthly={monthly}
              adminOrders={adminOrders}
              updateOrderStatus={updateOrderStatus}
              bestSellers={bestSellers}
            />
          ) : (
            <Navigate to="/" />
          )
        }
      />
    </Routes>
  );
}