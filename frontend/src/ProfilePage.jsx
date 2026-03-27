import { useState, useEffect } from "react";
import api from "./api";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    pincode: ""
  });

  useEffect(() => {
    // Load existing profile details when page opens
    api.get("/user/profile")
      .then((res) => {
        if (res.data.full_name) setProfile(res.data);
      })
      .catch((err) => console.error("Failed to load profile", err));
  }, []);

  const handleUpdate = (e) => {
    e.preventDefault();
    api.put("/user/profile", profile)
      .then(() => alert("Profile Updated!"))
      .catch(() => alert("Update failed"));
  };

  return (
    <div className="container">
      <h2>My Profile Details</h2>
      <form className="cart-card" onSubmit={handleUpdate} style={{padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
        <input 
          type="text" placeholder="Full Name" required 
          value={profile.full_name} 
          onChange={(e) => setProfile({...profile, full_name: e.target.value})} 
        />
        <input 
          type="text" placeholder="Phone Number" required 
          value={profile.phone} 
          onChange={(e) => setProfile({...profile, phone: e.target.value})} 
        />
        <textarea 
          placeholder="Complete Address" required 
          value={profile.address} 
          onChange={(e) => setProfile({...profile, address: e.target.value})} 
        />
        <input 
          type="text" placeholder="City" required 
          value={profile.city} 
          onChange={(e) => setProfile({...profile, city: e.target.value})} 
        />
        <input 
          type="text" placeholder="Pincode" required 
          value={profile.pincode} 
          onChange={(e) => setProfile({...profile, pincode: e.target.value})} 
        />
        <button type="submit" className="login-btn">Save Profile</button>
      </form>
    </div>
  );
}