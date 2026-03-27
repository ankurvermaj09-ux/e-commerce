import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function LandingPage({ homebestseller,storeinfo }) {
  const navigate = useNavigate();

  return (
    <div className="landing-container">

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-left">
          <h1>Upgrade Your Digital Lifestyle</h1>
          <p>
            Premium tech essentials designed for performance and style.
          </p>
          <div className="hero-buttons">
            <button onClick={() => navigate("/shop")} className="primary-btn">
              Start Shopping
            </button>
            <button onClick={() => navigate("/shop")} className="secondary-btn">
              Explore Categories
            </button>
          </div>
        </div>

        <div className="hero-right">
          <img src="/hero-image.png" alt="Tech showcase" />
        </div>
      </section>


      {/* TRUST SECTION */}
      <section className="trust-section">
        <div className="trust-card">
          <h3>⚡ Fast Delivery</h3>
          <p>Delivered within 2–5 business days.</p>
        </div>

        <div className="trust-card">
          <h3>🔒 Secure Payments</h3>
          <p>100% encrypted & safe checkout.</p>
        </div>

        <div className="trust-card">
          <h3>💬 24/7 Support</h3>
          <p>Always here to help you.</p>
        </div>
      </section>


      {/* CATEGORY SECTION */}
      <section className="category-section">
        <h2>Shop By Category</h2>
        <div className="category-grid">
          {["Laptops", "Accessories", "Audio", "Storage"].map(cat => (
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="category-card"
              key={cat}
              onClick={() => navigate("/shop")}
            >
              <h3>{cat}</h3>
            </motion.div>
          ))}
        </div>
      </section>


      {/* TRENDING PRODUCTS */}
      <section className="trending-section">
        <h2>Trending Products</h2>
        <div className="trending-grid">
          {homebestseller?.slice(0, 4).map(product => (
            <motion.div
              key={product.product_id}
              whileHover={{ y: -5 }}
              className="product-card"
            >
              <img src={product.image} alt={product.name} />
              <h4>{product.name}</h4>
              <p>₹{product.price}</p>
              <button onClick={() => navigate("/shop")}>
                View Product
              </button>
            </motion.div>
          ))}
        </div>
      </section>


      {/* FINAL CTA SECTION */}
      <section className="final-cta">
        <h2>Ready to Upgrade?</h2>
        <p>Discover the best tech curated just for you.</p>
        <button onClick={() => navigate("/shop")} className="primary-btn">
          Browse Products
        </button>
      </section>

      <section>
        { storeinfo != null &&(
          <div>
            <span>Mail address:  <b>{storeinfo.contactEmail}</b></span><br/>
            <span>Physical address: <b>{storeinfo?.physicalAddress?.city},{storeinfo?.physicalAddress?.state},{storeinfo?.physicalAddress?.street},{storeinfo?.physicalAddress?.zip}</b></span><br />
            <span>Phone no: <b>{storeinfo?.supportPhone}</b></span>
          </div>
        )
      }
      </section>

    </div>
  );
}