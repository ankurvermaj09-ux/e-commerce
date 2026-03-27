import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

export default function LoginPage({ user, login, email, setEmail, password, setPassword,loginError,SetLoginError }) {
  const loacation=useLocation();
  const navigate = useNavigate();
  useEffect(()=>{
    const passedEmail =loacation.state?.email;
    if (passedEmail){
      setEmail(passedEmail)
    }
  },[loacation.state,setEmail]);
    return(
        <div>
            <div className="frontend-header">
              <h1>Login To start shoping</h1>
              <br />
              {!user ? (
                <div>
                  <input
  type="email"
  value={email}
  onChange={(e) => {setEmail(e.target.value);SetLoginError("");}}
  placeholder="Email"
/>
                   <input
  type="password"
  value={password}
  onChange={(e) => {setPassword(e.target.value);SetLoginError();}}
  placeholder="Password"
/>

{loginError &&(<p style={{"color":"red"}}>{loginError}</p>)}


                  <button className="login-btn" onClick={login}>Login</button>
                </div>
              ) : (
                <div>
                  <h3>Welcome {user.name}</h3>
                  {user.role === "admin" && (
                    <button className="admin-btn" onClick={() => navigate("/admin")}>
                      Admin Dashboard
                    </button>
                  )}
                </div>
              )}
            </div>
            <p
  onClick={() => navigate("/register")}
>
  No account create a new one 
</p>
            <p
  onClick={() => navigate("/forgot-password")}
>
  Forgot Password?
</p>
        </div>
    );
}

