import { useEffect, useState } from "react";
import api from "./api";
import { jwtDecode } from "jwt-decode";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./App.css";
import AdminDashboard from "./AdminDashboard";
import Navbar from "./Navbar";
import CartPage from "./CartPage";
import OrdersPage from "./OrdersPage";
import LoginPage from "./LoginPage";
import ProfilePage from "./ProfilePage";
import Wishlist from "./Wishlist";
import LandingPage from "./LandingPage";
import ForgotPassword from "./ForgotPassword";
import Aboutus from "./Aboutus";
import Register from "./Register";
import { Toaster, toast } from "react-hot-toast";
import { Search, X } from "lucide-react";
import Spinner from "./Spinner";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";




export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [adminOrders, setAdminOrders] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [psearch, setPsearch] = useState("");
  const [typingTimeOut, setTypingTimeout] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [cancelingId, setCancelingId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [homebestseller, sethomebestseller] = useState([]);
  const [pendingCost, setPendingCost] = useState(null);
  const [cancelledCost, setCancelledCost] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loginError,SetLoginError]=useState("");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [storeinfo,setStoreinfo]=useState([]);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [orderRatio,setOrderRatio]=useState(null);
  const [categorySales, setCategorySales] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    address: "",
    phone: "",
    city: "",
    pincode: ""
  });

  const navigate = useNavigate();



  // --- Initial Load ---
  useEffect(() => {
    setLoading(true);
    api.get("/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err))
      .finally(()=>setLoading(false));

    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          user_id: decoded.user_id,
          email: decoded.email,
          role: decoded.role,
          name: decoded.name
        });
      } catch {
        localStorage.removeItem("access_token");
      }
    }
  }, []);

 

useEffect(() => {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  try {
    const decoded = jwtDecode(token);
    const expTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const timeLeft = expTime - currentTime;

    if (timeLeft <= 0) {
      handleLogout();
      return;
    }

    const warningTime = timeLeft - 2 * 60 * 1000;

    let warningTimer;
    let logoutTimer;

    if (warningTime > 0) {
      // Show warning 2 min before expiry
      warningTimer = setTimeout(() => {
        setShowSessionWarning(true);
      }, warningTime);
    } else {
      // If less than 2 min left → show warning immediately
      setShowSessionWarning(true);
    }

    logoutTimer = setTimeout(() => {
      handleLogout();
    }, timeLeft);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    };

  } catch (err) {
    handleLogout();
  }
}, [user]);









  // --- API Functions ---
  const loadCart = () => api.get("/cart").then((res) => setCart(res.data.items || []));
  const loadOrders = () => api.get("/orders").then((res) => setOrders(res.data.orders || []));
  const loadwishlist = () => api.get("/wishlist").then((res) => setWishlist(res.data.items || []));
  const loadProducts = () => api.get("/products").then((res) => setProducts(res.data));

  const loadAdminStats = () => {
    api.get("/admin/stats").then((res) => setStats(res.data));
    api.get("/admin/stats/monthly").then((res) => setMonthly(res.data));
  };

  const loadAdminOrders = () => {
    api.get("/admin/orders")
      .then((res) => setAdminOrders(res.data))
      .catch((err) => console.error("Admin orders failed:", err));
  };

  const loadBestSellers = () => {
    api.get("/admin/stats/bestsellers")
      .then((res) => setBestSellers(res.data.products || []))
      .catch((err) => console.error("Bestsellers failed:", err));
  };

  const loadPendingCost = () => {
    api.get("/admin/stats/pending")
      .then((res) => setPendingCost(res.data))
      .catch((err) => console.error("pending_cost:", err));
  };

  const loadCancelledCost = () => {
    api.get("/admin/stats/cancelled")
      .then((res) => setCancelledCost(res.data))
      .catch((err) => console.error("Cancelled_cost:", err));
  };

  const loadstoreinfo=()=>{
    api.get("/store_details")
    .then((res)=>setStoreinfo(res.data))
    .catch((err)=>console.log("failed to load details"));
  }


  // --- Auth ---
  const login = () => {
    api.post("/login", { email, password })
      .then((res) => {
        const token = res.data.access_token;
        localStorage.setItem("access_token", token);
        const decoded = jwtDecode(token);
        setUser({ user_id: decoded.user_id, role: decoded.role, name: decoded.name });
        setEmail("");
        setPassword("");
        navigate("/");
      })
      .catch((err) => {SetLoginError(err.response?.data?.detail || "Invalid email or password");});
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
    setCart([]);
    setOrders([]);
    setWishlist([]);
    navigate("/login");
  };

  // --- Cart Helpers ---
  const getCartItem = (productId) => cart.find(item => item.product_id === productId);

  const addtocart = (productId) => {
    if (!user) return toast.error("Please login first");
    api.post("/cart", null, { params: { product_id: productId } })
      .then(() => { loadCart(); loadProducts(); })
      .catch((err) => toast.error(err.response?.data?.detail || "Error"));
  };

  const addtowishlist = (productId) => {
    if (!user) return toast.error("Please login first");
    api.post("/wishlist", null, { params: { product_id: productId } })
      .then(() => loadwishlist())
      .catch((err) => toast.error(err.response?.data?.detail || "Error"));
  };

  const increaseQty = (productId) => {
    api.put("/cart/increase", null, { params: { product_id: productId } }).then(() => { loadCart(); loadProducts(); });
  };

  const decreaseQty = (productId) => {
    api.put("/cart/decrease", null, { params: { product_id: productId } }).then(() => { loadCart(); loadProducts(); });
  };

  const checkout = async () => {
    try {
      const profileRes = await api.get("/user/profile");
      const shippingDetails = profileRes.data;
      if (!shippingDetails.address || !shippingDetails.phone) {
        toast.error("Please complete your profile details before checking out!");
        navigate("/profile");
        return;
      }
      await api.post("/checkout", shippingDetails);
      toast.success("Order Placed Successfully!");
      setCart([]);
      loadOrders();
      navigate("/orders");
    } catch (err) {
      toast.error("Checkout failed: " + (err.response?.data?.detail || "Error"));
    }
  };

  const cancelOrder = async (orderId) => {
    if (cancelingId === orderId) return;
    setCancelingId(orderId);
    try {
      await api.put(`/orders/${orderId}/cancel`);
      toast.success("Order cancelled");
      loadOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Cancel failed");
    } finally {
      setCancelingId(null);
    }
  };

  const removeFromWishlist = (productId) => {
    api.delete(`/wishlist/${productId}`)
      .then(() => loadwishlist())
      .catch((err) => console.error("Failed to remove from wishlist", err));
  };

  const updateOrderStatus = (orderId, newStatus) => {
    api.put(`/admin/orders/${orderId}/status`, null, { params: { status: newStatus } })
      .then(() => {
        toast.success("Status updated");
        loadAdminOrders();
      })
      .catch((err) => toast.error(err.response?.data?.detail || "Update failed"));
  };

  const loadReview = (productId) => {
    if (selectedProductId === productId) {
      setSelectedProductId(null);
      setReviews([]);
      return;
    }
    api.get(`/products/${productId}/reviews`)
      .then((res) => {
        setReviews(res.data);
        setSelectedProductId(productId);
      })
      .catch((err) => console.error(err));
  };

  const loadbestsellerhome = () => {
    api.get("/bestsellers")
      .then((res) => {
        const data = res.data.products ? res.data.products : res.data;
        sethomebestseller(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        sethomebestseller([]);
      });
  };

  const loadOrderRatio=()=>{
    api.get("/admin/stats/order-ratio")
       .then(res=>setOrderRatio(res.data))
       .catch(err=>console.error(err));
  }

  const loadCategorySales=()=>{
    api.get("/admin/stats/category_sales")
      .then(res=>setCategorySales(res.data))
      .catch(err=>console.error(err));
  };

  useEffect(() => {
    loadbestsellerhome();
    loadstoreinfo();
  }, []);

  useEffect(() => {
    if (user) {
      loadCart();
      loadOrders();
      loadwishlist();
      if (user.role === "admin") {
        loadAdminStats();
        loadAdminOrders();
        loadBestSellers();
        loadPendingCost();
        loadCancelledCost();
        loadOrderRatio();
        loadCategorySales();
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

  const selectedProduct = products.find(p => p.product_id === selectedProductId);
  

  return (
    
    <div>
      <Toaster position="top-right" />
      <Navbar user={user} cartCount={cart.length} onLogout={handleLogout} wishlistCount={wishlist.length}  />
              <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
      <Routes>
        <Route path="/" element={<LandingPage homebestseller={homebestseller} storeinfo={storeinfo}/>} />
        <Route
          path="/shop"
          element={
            <div className="container">
              {selectedProduct ? (
                <div className="product-detail-view-container">
                  <div className="product-detail-view glass">
                    <button className="back-btn" onClick={() => setSelectedProductId(null)}>
                      ← Back to Products
                    </button>
                    <div className="detail-layout">
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="detail-img-large" />
                      <div className="detail-info-content">
                        <h2>{selectedProduct.name}</h2>
                        <div className="price-stock-row">
                          <p className="price">₹{selectedProduct.price}</p>
                          <p className="qty">Stock: {selectedProduct.qty}</p>
                        </div>
                        <div className="detail-actions">
                          {getCartItem(selectedProduct.product_id) ? (
                            <div className="qty-controls">
                              <button onClick={() => decreaseQty(selectedProduct.product_id)}>-</button>
                              <span>{getCartItem(selectedProduct.product_id).qty}</span>
                              <button onClick={() => increaseQty(selectedProduct.product_id)}>+</button>
                            </div>
                          ) : (
                            <button
                              disabled={selectedProduct.qty <= 0}
                              onClick={() => addtocart(selectedProduct.product_id)}
                            >
                              {selectedProduct.qty <= 0 ? "Out of Stock" : "Add to Cart"}
                            </button>
                          )}
                          <button onClick={() => addtowishlist(selectedProduct.product_id)}>Wishlist</button>
                        </div>
                        <div className="description-section">
                          <h3>Description</h3>
                          <p>{selectedProduct.description || "No description available."}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="reviews-section">
                    <h3>Customer Reviews</h3>
                    {reviews.length > 0 ? (
                      reviews.map((r) => (
                        <div key={r._id} className="review-item">
                          <p><strong>{r.username}</strong> - {r.rating} ⭐</p>
                          <p>{r.comment || <em>No written comment.</em>}</p>
                        </div>
                      ))
                    ) : (
                      <p>No reviews yet for this product.</p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* --- FIXED: Category Filter Bar --- */}
                  <div className="category-container scroll-hide" >
                    {["All", ...new Set(products.map(p => p.category).filter(Boolean))].map((cat) => (
                      <button
                        key={cat}
                        className={`category-btn ${selectedCategory === cat ? "active" : ""}`}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="search-bar">
                    <Search className="search-icon-inner" size={18} />
                    <input placeholder="search products" value={psearch} onChange={handleProductSearch} />
                    {psearch && (
    <X 
      className="clear-search" 
      size={18} 
      onClick={() => { setPsearch(""); loadProducts(); }} 
    />
  )}
                  </div>

                  <h2>{selectedCategory === "All" ? "All Products" : `${selectedCategory} Products`}</h2>

                  <div className="products-grid">
                    {/* --- FIXED: Products Filtered by Category --- */}
                    {products
                      .filter(p => selectedCategory === "All" || p.category === selectedCategory)
                      .map((p) => {
                        const cartItem = getCartItem(p.product_id);
                        const qty = cartItem ? cartItem.qty : 0;
                        return (
                          <motion.div 
                          whileHover={{ scale: 1.03 }}
  transition={{ type: "spring", stiffness: 200 }}
                          className="product-card glass" key={p.product_id} onClick={() => loadReview(p.product_id)} style={{ cursor: 'pointer' }}>
                            <img src={`http://127.0.0.1:5000${p.image}`} width="80" alt={p.name} />
                            <p className="name"><strong>{p.name}</strong></p>
                            <p className="price">₹{p.price}</p>
                            <p className="qty">Stock: {p.qty}</p>
                            {qty === 0 ? (
                              <button
                                disabled={p.qty <= 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addtocart(p.product_id);
                                }}
                              >
                                {p.qty <= 0 ? "Out of Stock" : "Add to Cart"}
                              </button>
                            ) : (
                              <div className="qty-controls">
                                <button onClick={(e) => { e.stopPropagation(); decreaseQty(p.product_id) }}>-</button>
                                <span>{qty}</span>
                                <button onClick={(e) => { e.stopPropagation(); increaseQty(p.product_id) }}>+</button>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          }
        />
        <Route path="/cart" element={user ? <CartPage cart={cart} checkout={checkout} increaseQty={increaseQty} decreaseQty={decreaseQty} setFormData={setFormData} formData={formData} /> : <Navigate to="/login" />} />
        <Route path="/orders" element={user ? <OrdersPage orders={orders} cancelOrder={cancelOrder} reloadOrders={loadOrders} /> : <Navigate to="/login" />} />
        <Route path="/wishlist" element={user ? <Wishlist wishlist={wishlist} removeFromWishlist={removeFromWishlist} addtocart={addtocart} /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <ProfilePage user={user} /> : <Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage user={user} login={login} email={email} setEmail={setEmail} password={password} setPassword={setPassword} loginError={loginError} SetLoginError={SetLoginError}/>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/aboutus" element={<Aboutus />} />
        <Route path="/admin" element={user?.role === "admin" ? <AdminDashboard user={user} stats={stats} monthly={monthly} adminOrders={adminOrders} updateOrderStatus={updateOrderStatus} bestSellers={bestSellers} pendingCost={pendingCost} cancelledCost={cancelledCost} products={products} loadProducts={loadProducts} loadOrderRatio={loadOrderRatio} orderRatio={orderRatio} categorySales={categorySales} showSessionWarning={showSessionWarning} setShowSessionWarning={setShowSessionWarning} /> : <Navigate to="/" />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      {showSessionWarning && (
  <div className="session-modal">
    <div className="session-box">
      <h3>⚠ Session Expiring Soon</h3>
      <p>Your session will expire in 2 minutes.</p>
      <div className="session-actions">
        <button onClick={() => setShowSessionWarning(false)}>
          Stay Logged In
        </button>
        <button onClick={handleLogout}>
          Logout Now
        </button>
      </div>
    </div>
  </div>
)}
      </motion.div>
    </div>

  );
}