// client/src/pages/home.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { db, serverTimestamp } from "../firebaseInit";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Footer from "../components/Footer";

const MENU = [
  { id: "w1", name: "Classic Belgian Waffle", price: 100, img: "/images/waffle1.jpeg" },
  { id: "w2", name: "Strawberry Cream Waffle", price: 150, img: "/images/waffle2.jpeg" },
  { id: "w3", name: "Nutella Chocolate Waffle", price: 180, img: "/images/waffle3.jpeg" },
  { id: "w4", name: "Banana Caramel Waffle", price: 150, img: "/images/waffle4.jpeg" },
  { id: "w5", name: "Blueberry Bliss Waffle", price: 180, img: "/images/waffle5.jpeg" }
];

const styles = {
  page: { background: "#0b0b0b", color: "#f6e8c1", minHeight: "100vh", padding: 20 },
  brand: { fontSize: 28, fontWeight: 900, color: "#ffd166" },

  menuCard: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: 12,
    background: "#111",
    borderRadius: 12,
    marginBottom: 14
  },

  img: { width: 80, height: 80, borderRadius: 10, objectFit: "cover" },

  addBtn: {
    background: "#ffd166",
    color: "#111",
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    fontWeight: 800,
    cursor: "pointer"
  },

  /* CART DRAWER */
  drawer: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    height: "85vh",
    background: "#0b0b0b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    display: "flex",
    flexDirection: "column",
    zIndex: 1000
  },

  drawerHeader: {
    padding: 16,
    borderBottom: "1px solid #222",
    fontSize: 22,
    fontWeight: 900,
    color: "#ffd166"
  },

  drawerItems: {
    flex: 1,
    overflowY: "auto",
    padding: "14px 16px"
  },

  drawerFooter: {
    padding: 16,
    borderTop: "1px solid #222",
    background: "#111"
  },

  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: "none",
    background: "#222",
    color: "#ffd166",
    fontWeight: 900,
    fontSize: 18
  },

  placeBtn: {
    width: "100%",
    padding: 14,
    borderRadius: 10,
    border: "none",
    fontWeight: 900,
    fontSize: 16
  }
};

export default function Home() {
  const [, setLocation] = useLocation();

  const [cart, setCart] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [session, setSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- Load Active Session ---------- */
  useEffect(() => {
    async function loadSession() {
      const snap = await getDoc(doc(db, "settings", "activeSession"));
      setSession(snap.exists() ? snap.data().session_id : "Session 1");
    }
    loadSession();
  }, []);

  /* ---------- Cart helpers ---------- */
  function addToCart(item) {
    setDrawerOpen(true);
    setCart(prev => {
      const found = prev.find(i => i.id === item.id);
      if (found) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function increaseQty(id) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i));
  }

  function decreaseQty(id) {
    setCart(prev =>
      prev
        .map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i)
        .filter(i => i.qty > 0)
    );
  }

  function removeItem(id) {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  /* ---------- Submit ---------- */
  async function submit() {
    if (cart.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "orders"), {
        createdAt: serverTimestamp(),
        customerName: name,
        phone,
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.qty })),
        total,
        status: "pending",
        session_id: session
      });

      localStorage.setItem("myPhone", phone);
      setLocation(`/mytoken?phone=${phone}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={styles.brand}>Waffle Lounge</div>

        <button
          onClick={() => {
            const ph = localStorage.getItem("myPhone");
            if (ph) setLocation(`/mytoken?phone=${ph}`);
          }}
          style={styles.addBtn}
        >
          My Token
        </button>
      </div>

      {MENU.map(item => (
        <div key={item.id} style={styles.menuCard}>
          <img src={item.img} style={styles.img} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>{item.name}</div>
            <div>₹{item.price}</div>
          </div>
          <button style={styles.addBtn} onClick={() => addToCart(item)}>+ Add</button>
        </div>
      ))}

      {/* CART DRAWER */}
      {drawerOpen && (
        <div style={styles.drawer}>
          <div style={styles.drawerHeader}>Your Cart</div>

          <div style={styles.drawerItems}>
            {cart.map(item => (
              <div key={item.id} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 800 }}>{item.name}</div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={styles.qtyBtn} onClick={() => decreaseQty(item.id)}>−</button>
                    <div style={{ fontWeight: 800 }}>{item.qty}</div>
                    <button style={styles.qtyBtn} onClick={() => increaseQty(item.id)}>+</button>
                  </div>

                  <div>₹{item.qty * item.price}</div>

                  <button onClick={() => removeItem(item.id)} style={{ color: "#ff6b6b" }}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.drawerFooter}>
            <input
              placeholder="Your Name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 8 }}
            />
            <input
              placeholder="Phone Number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 12 }}
            />

            <div style={{ fontWeight: 900, marginBottom: 10 }}>
              Total: ₹{total.toFixed(2)}
            </div>

            <button
              onClick={submit}
              disabled={cart.length === 0 || submitting}
              style={{
                ...styles.placeBtn,
                background: cart.length === 0 ? "#555" : "#ffd166",
                color: cart.length === 0 ? "#999" : "#111",
                cursor: cart.length === 0 ? "not-allowed" : "pointer"
              }}
            >
              {submitting ? "Placing…" : "Place Order"}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
