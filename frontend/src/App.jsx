import { useEffect, useState } from "react";
import api from "./api";
import { jwtDecode } from "jwt-decode";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./App.css"
import AdminDashboard from "./AdminDashboard";



export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [name, setName] = useState("");
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [monthly, setmonthly] = useState(null);
  const [adminOrders, setAdminOrders] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [psearch, setPsearch] = useState("");
  const [typingTimeOut,setTypingTimeout]=useState(null);


  const navigate = useNavigate();

  useEffect(() => {
    api.get("/products").then(res => setProducts(res.data)).catch(err => console.error(err));
  }, []);

  const loadCart = () => api.get("/cart").then(res => setCart(res.data.items || []));
  const loadOrders = () => api.get("/orders").then(res => setOrders(res.data.orders || []));
  const loadAdminStats = () => {
    api.get("/admin/stats").then(res => setStats(res.data));
    api.get("/admin/stats/monthly").then(res => setmonthly(res.data));
  };

  const login = () => {
    api.post("/login", { name }).then(res => {
      const token = res.data.access_token;
      localStorage.setItem("access_token", token);
      const decoded = jwtDecode(token);
      setUser({ user_id: decoded.user_id, role: decoded.role, name: decoded.name });
      setName("");
    }).catch(() => alert("Login failed"));
  };

  const addtocart = (productId) => {
    if (!user) return alert("Please login first");
    api.post("/cart", null, { params: { product_id: productId } })
      .then(() => loadCart())
      .catch(err => alert(err.response?.data?.detail || "Error"));
  };

  const checkout = async () => {
    try {
      const res = await api.post("/checkout");
      alert("Success! Total: ₹" + res.data.total);
      setCart([]);
      loadOrders();
    } catch (err) { alert("Checkout failed"); }
  };

  const loadAdminOrders = () => {
    api.get("/admin/orders")
      .then(res => {
        setAdminOrders(res.data);
        console.log("admin orders:", res.data);
      })
      .catch(err => {
        console.error(err);
        alert("failed to laod admin orders");
      });
  }

  const updateOrderStatus = (orderId, newStatus) => {
    api.put(`/admin/orders/${orderId}/status`, null, {
      params: { status: newStatus }
    })
      .then(() => {
        alert("Status updated");
        loadAdminOrders(); // refresh admin orders
      })
      .catch(err => {
        alert(err.response?.data?.detail || "Status update failed");
      });
  };

  const loadBestSellers = () => {
    api.get("/admin/stats/bestsellers")
      .then(res => {
        console.log("best sellers:", res.data);
        setBestSellers(res.data.products || []);
      })
      .catch(err => {
        console.error(err);
        alert("failed to load best sellers");
      });
  }


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

  return (
    <Routes>
      <Route path="/" element={
        <div>
          <h1>Frontend</h1>
          {!user ? (
            <div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
              <button onClick={login}>Login</button>
            </div>
          ) : (
            <div>
              <h3>Welcome {user.name}</h3>
              {user.role === "admin" && (
                <button onClick={() => navigate("/admin")}>Admin Dashboard</button>
              )}
            </div>
          )}
          <div>
            <input
              placeholder="search products"
              value={psearch}
              onChange={(e) => {
  const value = e.target.value;
  setPsearch(value);

  // clear old timer
  if (typingTimeOut) {
    clearTimeout(typingTimeOut);
  }

  // start new debounce timer
  const timeout = setTimeout(() => {
    if (!value.trim()) {
      api.get("/products")
        .then(res => setProducts(res.data));
    } else {
      api.get("/products/search", {
        params: { q: value }
      })
      .then(res => setProducts(res.data));
    }
  }, 500); // 500ms debounce

  setTypingTimeout(timeout);
}} />
          </div>

          <h2>Products</h2>
          <div className="product">
            {products.map(p => (
              <div key={p.product_id} >
                <img src={p.image} width="80" />
                <p><strong>{p.name}</strong> - ₹{p.price}</p>
                <button disabled={p.qty <= 0} onClick={() => addtocart(p.product_id)}>
                  Add to Cart
                </button>
              </div>
            ))}
          </div>

          <h2>Cart</h2>
          {cart.length === 0 ? <p>Empty</p> : (
            <div>
              <ul>
                {cart.map(item => (
                  <li key={item.product_id}>
                    {item.name} x {item.qty}
                  </li>
                ))}
              </ul>
              <button onClick={checkout}>Checkout</button>
            </div>
          )}

          <h2>Your Orders</h2>
          <div>
            {orders.map(order => (
              <div key={order._id}>
                <p>Total: ₹{order.total} ({order.status})</p>
                <div>
                  {order.items.map(item => (
                    <div key={item.product_id}>
                      <img src={item.image} width={"80"} />
                      {item.name} x {item.qty}{" "}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      } />
      <Route
        path="/admin"
        element={
          user?.role === "admin" ? (
            <AdminDashboard user={user} stats={stats} monthly={monthly} adminOrders={adminOrders} updateOrderStatus={updateOrderStatus} bestSellers={bestSellers} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
    </Routes>
  );
}