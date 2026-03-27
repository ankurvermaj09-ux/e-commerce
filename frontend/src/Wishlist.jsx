export default function Wishlist({ wishlist, removeFromWishlist, addtocart }) {
  return (
    <div className="wishlist-container">
      <div className="wishlist-header">
        <h2>My Wishlist ({wishlist.length})</h2>
      </div>

      {wishlist.length === 0 ? (
        <div className="empty-wishlist">
          <p>Your wishlist is lonely. Add some products!</p>
        </div>
      ) : (
        <div className="wishlist-list">
          {wishlist.map((item) => (
            <div className="wishlist-item glass" key={item.product_id}>
              <img src={item.image} alt={item.name} width="70" height="70" />
              
              <div className="wishlist-info">
                <h4>{item.name}</h4>
                <p className="price">₹{item.price}</p>
              </div>

              <div className="wishlist-actions">
                <button className="btn-move-cart" onClick={() => addtocart(item.product_id)}>
                  Add to Cart
                </button>
                <button className="btn-remove" onClick={() => removeFromWishlist(item.product_id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}