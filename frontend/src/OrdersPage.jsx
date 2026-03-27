export default function OrdersPage({orders,cancelOrder}){
  console.log(orders)
    return(
        <div>
            <h2>Your Orders</h2>
            <div className="orders-grid">
              {orders.slice().reverse().map((order) => (
                <div className="order-card" key={order._id}>
                  <div className="order-header">
                    <span>Total: ₹{order.total}</span>
                    <span>shipping price :₹{order.shipping_cost || 0}</span>
                        <span>tax :₹{order.tax_cost || 0}</span>
                    <span className={`order-status ${order.status}`}>
                      {order.status}
                    </span>
                    {order.status === "pending" && (
  <button onClick={()=>cancelOrder(order._id)}>Cancel Order</button>
)}
                    
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
    )
}