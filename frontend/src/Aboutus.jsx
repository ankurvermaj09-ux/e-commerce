import { useNavigate } from "react-router-dom";

export default function Aboutus(){
    const navigate = useNavigate();

    return(
        <div className="landing-container">
      <section className="hero-section">
        <div className="hero-left">
          <h1>About this project</h1>
          <p>
           A modern full-stack e-commerce platform built with performance, scalability, and real-world architecture in mind.
          </p>
        </div>
      </section>


      <section className="hero-section">
        <div className="hero-left">
          <h1>The Vision Behind This Project</h1>
          <p>
            This project was built to simulate a real-world production-grade e-commerce platform.
It focuses on clean architecture, secure authentication, scalable backend design, and modern frontend user experience.

The goal was not just to create a shopping website — but to build a system that reflects real SaaS-level development practices.
          </p>
        </div>
      </section>
      

      <section className="hero-section">
        <div className="hero-left">
          <h1>Technology Stack</h1>
          <p>
            Frontend:

React (Vite)

Framer Motion (animations)

Axios (API communication)

React Router
<br />
Backend:

FastAPI

JWT Authentication

MongoDB

Secure Role-Based Access Control
          </p>
        </div>
      </section>


      <section className="hero-section">
        <div className="hero-left">
          <h1>Key Features</h1>
          <p>
            User Authentication (JWT-based)<br />
 Role-Based Access (Admin / User separation)<br />
 Admin Dashboard with Business Analytics<br />
 Category-wise Revenue Reports<br />
 Order Status Tracking<br />
 Wishlist & Cart System<br />
 Secure Checkout Flow<br />
 Inventory Management<br />
 Real-time Business KPIs<br />
 Session Expiry Handling<br />
          </p>
        </div>
      </section>


      <section className="hero-section">
        <div className="hero-left">
          <h1>Advanced Admin Capabilities</h1>
          <p>
            The admin dashboard includes:
          </p>
          
          <p>
            Revenue analytics<br />

Category-wise sales breakdown<br />

Cancellation ratio<br />

Best-selling products<br />

Top customers<br />

Inventory monitoring<br />

CSV export functionality<br />
          </p>
        </div>
      </section>

       <section className="hero-section">
        <div className="hero-left">
          <h1>Why This Project Matters</h1>
          <p>
            This project demonstrates:
          </p>
          <p>
            Full-stack integration<br />

Secure authentication handling<br />

Production-style API structure<br />

Business metric calculations<br />

Clean UI/UX principles<br />

Scalable architecture design<br />
          </p>
        </div>
      </section>

      <section className="hero-section">
        <div className="hero-left">
          <h1>Planned Enhancements</h1>
          <p>
            Refresh token system<br />

Real-time notifications (WebSockets)<br />

Payment gateway integration<br />

Performance optimization<br />

Cloud deployment<br />

Dockerized backend<br />
          </p>
        </div>
      </section>


<section className="hero-section">
        <div className="hero-left">
          <h1>Explore the Platform</h1>
         <button onClick={() => navigate("/shop")}>
          View Store
        </button>
        </div>
      </section>


    </div>
    )
}