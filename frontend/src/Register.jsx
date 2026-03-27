import { useState } from "react";
import api from "./api";
import { useNavigate } from "react-router-dom";

export default function Register(){
    const [email,setEmail]=useState("");
    const [password,setpassword]=useState("");
    const navigate = useNavigate();

    const submit =async ()=>{
        if (!email) {
      alert("enter the email address");
      return;
    }
        if (password.length < 5) {
      alert("Password must be at least 6 characters");
      return;
    }
    
        try{
            await api.post("/register",{email,password});
            alert("account created successfully");
            navigate("/login",{state:{email}});
        }catch(error){
            const errormessage=error.response?.data?.detail || "an unexpected error occured"
            alert(errormessage)
        }
    };

    return(
        <div className="frontend-header">
            <h2>Register your account to login</h2>
        <input 
          type="email"
          placeholder="enter your email"
          onChange={(e)=>setEmail(e.target.value)}
          />
          <input 
          type="password"
          placeholder="enter your password"
          onChange={(e)=>setpassword(e.target.value)}
          />
          

        <button className="login-btn" onClick={submit}>create account</button>
        </div>
    )
}