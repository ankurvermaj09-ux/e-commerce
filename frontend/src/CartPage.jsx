import { Plus, Minus, CreditCard, ShoppingBasket } from "lucide-react";

export default function CartPage({ cart, checkout, increaseQty, decreaseQty }) {

  return (
    <div>
      <h2>Checkout Details</h2>
      <div className="cart-container">
          <h2>Cart</h2>
          <div className="cart-list">
            {cart.length === 0 ? (
              <p>Empty</p>
            ) : (
              <div className="cart-card">
                {cart.map((item) => (
                  <div className="cart-item" key={item.product_id}>
                    <img src={item.image} alt={item.name} width="30" />
                    <span>{item.name}</span>
                    <span>x {item.qty}</span>
                    <button type="button" onClick={() => decreaseQty(item.product_id)}><Minus size={16}/></button>
                    <button type="button" onClick={() => increaseQty(item.product_id)}><Plus size={16}/></button>
                  </div>
                ))}
                <button onClick={checkout}><CreditCard size={18}/> Checkout</button>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}