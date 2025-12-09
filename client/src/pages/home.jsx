import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { db, serverTimestamp } from "../firebaseInit";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

const MENU = [
  { id: "m1", name: "Artisan Coffee", price: 4.5 },
  { id: "m2", name: "Avocado Toast", price: 12 },
  { id: "m3", name: "Daily Pastry", price: 5.5 },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // ⭐ Correct session from Firestore
  const [session, setSession] = useState("Loading...");

  // -------------------------------
  // Load Active Session from Firestore
  // -------------------------------
  useEffect(() => {
    async function fetchSession() {
      try {
        const ref = doc(db, "settings", "activeSession");
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const active = snap.data().session_id;
          setSession(active);

          // store locally for faster next page load
          localStorage.setItem("session", active);
        } else {
          // fallback if Firestore doc missing
          setSession("Session 1");
        }
      } catch (err) {
        console.error("Session load error", err);
        setSession("Session 1");
      }
    }

    fetchSession();
  }, []);

  function addToCart(item) {
    setCart(prev => {
      const p = prev.find(x => x.id === item.id);
      if (p) return prev.map(x =>
        x.id === item.id ? { ...x, qty: x.qty + 1 } : x
      );
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(x => x.id !== id));
  }

  const total = cart.reduce((s, it) => s + it.price * it.qty, 0);

  // -------------------------------
  // Submit Order
  // -------------------------------
  async function submit(e) {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || cart.length === 0) {
      alert("Please enter name, phone and add items.");
      return;
    }

    try {
      // ⭐ Always use Firestore session (correct)
      const session_id =
        session !== "Loading..."
          ? session
          : localStorage.getItem("session") || "Session 1";

      const items = cart.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.qty,
      }));

      const payload = {
        createdAt: serverTimestamp(),
        customerName: name.trim(),
        phone: String(phone).trim(),
        items,
        total,
        token: null,
        status: "pending",
        session_id,
      };

      console.log("Submitting order:", payload);

      const ref = await addDoc(collection(db, "orders"), payload);

      localStorage.setItem("myPhone", phone.trim());

      setLocation(`/mytoken?phone=${encodeURIComponent(phone.trim())}`);
    } catch (err) {
      console.error("Error submitting order:", err);
      alert("Failed to place order. Try again.");
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: "auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Cafe Queue</h1>
      </header>

      {/* Check token status */}
      <button
        onClick={() => {
          const ph = localStorage.getItem("myPhone");
          if (!ph) {
            alert("No recent order found.");
            return;
          }
          setLocation(`/mytoken?phone=${encodeURIComponent(ph)}`);
        }}
        style={{ padding: "8px 14px", marginLeft: 10 }}
      >
        Check My Token Status
      </button>

      <section style={{ marginTop: 20 }}>
        <h2>Menu</h2>

        {MENU.map(item => (
          <div
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 8,
              borderBottom: "1px solid #eee",
            }}
          >
            <div>
              <div style={{ fontWeight: "600" }}>{item.name}</div>
              <div style={{ fontSize: 13, color: "#666" }}>
                ${item.price.toFixed(2)}
              </div>
            </div>

            <button onClick={() => addToCart(item)}>+ Add</button>
          </div>
        ))}
      </section>

      {cart.length > 0 && (
        <section style={{ marginTop: 24, borderTop: "1px solid #ddd", paddingTop: 16 }}>
          <h3>Your Cart</h3>

          {cart.map(i => (
            <div
              key={i.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 6,
              }}
            >
              <div>
                {i.qty}× {i.name}
              </div>

              <div>
                ${(i.price * i.qty).toFixed(2)}
                <button
                  onClick={() => removeFromCart(i.id)}
                  style={{ marginLeft: 8 }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 12, fontWeight: 700 }}>
            Total: ${total.toFixed(2)}
          </div>

          {/* Submit order */}
          <form onSubmit={submit} style={{ marginTop: 12 }}>
            <input
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ marginBottom: 8 }}
            />

            <input
              placeholder="Phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{ marginBottom: 8 }}
            />

            <button type="submit">Place Order</button>
          </form>
        </section>
      )}
    </div>
  );
}
