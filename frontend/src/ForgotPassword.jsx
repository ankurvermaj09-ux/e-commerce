import { useState } from "react";
import api from "./api";

export default function ForgotPassword(){
    const [email,setEmail]=useState("");

    const submit =async ()=>{
        try{
            await api.post("/forgot-password",{email});
            alert("reset link sent to your email");
        }catch{
            alert("user not found");
        }
    };

    return(
        <div className="frontend-header">
            <h2>forgot password</h2>
        <input 
          type="email"
          placeholder="enter your email"
          onChange={(e)=>setEmail(e.target.value)}
          />

        <button onClick={submit}>send link</button>
        </div>
    )
}