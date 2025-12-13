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

const isMobile = window.innerWidth < 768;

const styles = {
  page: { background: "#0b0b0b", color: "#f6e8c1", minHeight: "100vh", padding: 20 },
  brand: { fontSize: 28, fontWeight: 900, color: "#ffd166" },

  menuGrid: { display: "grid", gap: 14 },
  card: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    background: "#111",
    border: "1px solid #222"
  },
  img: { width: 80, height: 80, borderRadius: 10, objectFit: "cover" },

  addBtn: {
    background: "#ffd166",
    color: "#111",
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    fontWeight: 800,
    cursor: "pointer"
  },

  /* Floating Cart Button */
  cartFab: {
    position: "fixed",
    right: 20,
    bottom: 20,
    background: "#ffd166",
    color: "#111",
    padding: "14px 18px",
    borderRadius: 999,
    fontWeight: 900,
    border: "none",
    zIndex: 999,
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
  },

  /* Drawer */
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 998
  },

  drawer: {
    position: "fixed",
    background: "#111",
    zIndex: 999,
    transition: "transform 0.3s ease",
    width: isMobile ? "100%" : 380,
    height: isMobile ? "70%" : "100%",
    right: isMobile ? 0 : 0,
    bottom: isMobile ? 0 : 0,
    borderTopLeftRadius: isMobile ? 16 : 0,
    borderTopRightRadius: isMobile ? 16 : 0,
    padding: 16,
    overflowY: "auto"
  },

  input: {
    width: "100%",
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
    background: "#0c0c0c",
    border: "1px solid #222",
    color: "#fff"
  },

  placeBtn: {
    marginTop: 12,
    background: "#ffd166",
    color: "#111",
    padding: "12px 14px",
    borderRadius: 10,
    border: "none",
    fontWeight: 900,
    width: "100%"
  }
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [session, setSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSession() {
      const snap = await getDoc(doc(db, "settings", "activeSession"));
      setSession(snap.exists() ? snap.data().session_id : "Session 1");
    }
    loadSession();
  }, []);

  function addToCart(item) {
    setCart((prev) => {
      const found = prev.find((x) => x.id === item.id);
      if (found) {
        return prev.map((x) =>
          x.id === item.id ? { ...x, qty: x.qty + 1 } : x
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setOpen(true);
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((x) => x.id !== id));
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  async function submit(e) {
    e.preventDefault();
    if (!name || !phone || cart.length === 0) return;

    setSubmitting(true);

    await addDoc(collection(db, "orders"), {
      createdAt: serverTimestamp(),
      customerName: name,
      phone,
      items: cart.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.qty
      })),
      total,
      status: "pending",
      session_id: session
    });

    localStorage.setItem("myPhone", phone);
    setLocation(`/mytoken?phone=${phone}`);
  }

  return (
    <div style={styles.page}>
      <div style={styles.brand}>Waffle Lounge</div>

      <div style={styles.menuGrid}>
        {MENU.map((item) => (
          <div key={item.id} style={styles.card}>
            <img src={item.img} alt={item.name} style={styles.img} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{item.name}</div>
              <div>₹{item.price}</div>
            </div>
            <button style={styles.addBtn} onClick={() => addToCart(item)}>
              + Add
            </button>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <button style={styles.cartFab} onClick={() => setOpen(true)}>
          Cart ({cart.length})
        </button>
      )}

      {open && <div style={styles.backdrop} onClick={() => setOpen(false)} />}

      {open && (
        <div
          style={{
            ...styles.drawer,
            transform: open
              ? "translateX(0)"
              : isMobile
              ? "translateY(100%)"
              : "translateX(100%)"
          }}
        >
          <h2 style={{ color: "#ffd166" }}>Your Cart</h2>

          {cart.map((i) => (
            <div key={i.id} style={{ marginBottom: 8 }}>
              {i.qty} × {i.name} — ₹{i.qty * i.price}
              <button
                onClick={() => removeFromCart(i.id)}
                style={{ marginLeft: 8, color: "#ff6b6b", background: "none", border: "none" }}
              >
                Remove
              </button>
            </div>
          ))}

          <div style={{ fontWeight: 900, marginTop: 10 }}>
            Total: ₹{total}
          </div>

          <form onSubmit={submit}>
            <input
              style={styles.input}
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <button disabled={submitting} style={styles.placeBtn}>
              {submitting ? "Placing…" : "Place Order"}
            </button>
          </form>
        </div>
      )}

      <Footer />
    </div>
  );
}
