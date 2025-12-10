import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { db, serverTimestamp } from "../firebaseInit";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import "../styles.css";

const MENU = [
  { id: "m1", name: "Artisan Coffee", price: 4.5 },
  { id: "m2", name: "Avocado Toast", price: 12 },
  { id: "m3", name: "Daily Pastry", price: 5.5 }
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [session, setSession] = useState(null);

  // Load session
  useEffect(() => {
    async function loadSession() {
      try {
        const snap = await getDoc(doc(db, "settings", "activeSession"));
        setSession(snap.exists() ? snap.data().session_id : "Session 1");
      } catch {
        setSession("Session 1");
      }
    }
    loadSession();
  }, []);

  function addToCart(item) {
    setCart(prev => {
      const ex = prev.find(x => x.id === item.id);
      if (ex)
        return prev.map(x =>
          x.id === item.id ? { ...x, qty: x.qty + 1 } : x
        );
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(x => x.id !== id));
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  async function submit(e) {
    e.preventDefault();
    if (!name || !phone || cart.length === 0)
      return alert("Please complete all fields!");

    const payload = {
      createdAt: serverTimestamp(),
      customerName: name.trim(),
      phone: phone.trim(),
      items: cart.map(i => ({
        name: i.name,
        quantity: i.qty,
        price: i.price
      })),
      total,
      token: null,
      status: "pending",
      session_id: session
    };

    await addDoc(collection(db, "orders"), payload);
    localStorage.setItem("myPhone", phone);
    setLocation(`/mytoken?phone=${encodeURIComponent(phone)}`);
  }

  return (
    <div className="container">

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "28px", color: "#ffcc66" }}>Waffle Lounge</h1>

        <button
          className="header-button"
          onClick={() => {
            const ph = localStorage.getItem("myPhone");
            if (!ph) return alert("No previous order found");
            setLocation(`/mytoken?phone=${ph}`);
          }}
        >
          My Token
        </button>
      </header>

      {/* Menu List */}
      <h2 style={{ marginTop: 25 }}>Menu</h2>

      {MENU.map(item => (
        <div key={item.id} className="card">
          <div>
            <p style={{ fontSize: "18px", fontWeight: "bold" }}>{item.name}</p>
            <p style={{ color: "#aaa" }}>${item.price.toFixed(2)}</p>
          </div>

          <button className="button" onClick={() => addToCart(item)}>
            + Add
          </button>
        </div>
      ))}

      {/* Cart */}
      {cart.length > 0 && (
        <div className="card" style={{ marginTop: 30 }}>
          <h3>Your Cart</h3>

          {cart.map(i => (
            <div
              key={i.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                margin: "6px 0"
              }}
            >
              <span>{i.qty} × {i.name}</span>
              <span>
                ${(i.qty * i.price).toFixed(2)}
                <button
                  onClick={() => removeFromCart(i.id)}
                  style={{ marginLeft: 10, color: "red" }}
                >
                  Remove
                </button>
              </span>
            </div>
          ))}

          <h3 style={{ marginTop: 10 }}>Total: ${total.toFixed(2)}</h3>

          <form onSubmit={submit} style={{ marginTop: 20 }}>
            <input
              className="input"
              placeholder="Your Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <br />
            <input
              className="input"
              placeholder="Phone Number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <br />

            <button type="submit" className="button" style={{ width: "100%", marginTop: 10 }}>
              Place Order
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
