import { Link } from "react-router-dom";
import { Home, Package, ShoppingCart, Heart, ClipboardList, User, LayoutDashboard, LogOut,LogIn,Info } from "lucide-react";


export default function Navbar({user,cartCount,onLogout,wishlistCount}){
    return(
        <div className="navbar">
        <nav>
            <div className="nav-left">
            <Link to="/"><Home size={18}/></Link>
            <Link to="/shop"><Package size={18} /></Link> 
            <Link to="/cart"><ShoppingCart size={18}
                            color={cartCount >0 ? "#007bff":"currentColor"}/>
            </Link>
            <Link to="/wishlist"><Heart size={18}
                       fill={wishlistCount>0 ? "#ff4d4d":"none"}
                       color={wishlistCount >0 ? "#ff4d4d":"currentColor"}/>
            </Link>
            <Link to="/orders"><ClipboardList size={18}/></Link>
            <Link to="/aboutus"><Info size={18}/></Link>
            {user && user.role ==="admin" && (
            <Link to="/admin"><LayoutDashboard size={18}/> </Link>
            )
            }
            </div>

            <div className="nav-right">
            {user &&(
            <Link to="/profile"><User size={18}/></Link>)
            }

             {!user?(
            <Link to="/login"><LogIn size={18}/></Link>
            ):(
                <>
                <span>{user.name}</span>
                <button onClick={onLogout}><LogOut size={18}/></button>
                </>
            )
            }
            </div>
        </nav>
        </div>
    )
}