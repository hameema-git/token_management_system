// client/src/pages/home.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
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
  page: { background: "#0b0b0b", color: "#f6e8c1", minHeight: "100vh", padding: 16 },
  brand: { fontSize: 26, fontWeight: 900, color: "#ffd166", marginBottom: 16 },

  menuCard: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: 12,
    background: "#111",
    borderRadius: 12,
    marginBottom: 12
  },

  img: { width: 80, height: 80, borderRadius: 10, objectFit: "cover" },

  addBtn: {
    background: "#ffd166",
    color: "#111",
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    fontWeight: 800
  },

  /* Floating cart button */
  floatingCart: {
    position: "fixed",
    bottom: 20,
    right: 20,
    background: "#ffd166",
    color: "#111",
    padding: "14px 18px",
    borderRadius: 999,
    fontWeight: 900,
    zIndex: 2000,
    boxShadow: "0 8px 30px rgba(0,0,0,0.6)"
  },

  /* Cart drawer */
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 3000
  },

  cart: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "80vh",
    background: "#0b0b0b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 3001,
    display: "flex",
    flexDirection: "column"
  },

  cartHeader: {
    padding: 14,
    borderBottom: "1px solid #222",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: 900,
    color: "#ffd166"
  },

  cartItems: {
    flex: 1,
    overflowY: "auto",
    padding: 14
  },

  cartFooter: {
    padding: 14,
    borderTop: "1px solid #222"
  },

  qtyBtn: {
    width: 30,
    height: 30,
    background: "#222",
    color: "#ffd166",
    border: "none",
    borderRadius: 6,
    fontWeight: 900
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
    getDoc(doc(db, "settings", "activeSession")).then(snap => {
      setSession(snap.exists() ? snap.data().session_id : "Session 1");
    });
  }, []);

  function add(item) {
    setCart(p => {
      const f = p.find(i => i.id === item.id);
      return f ? p.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
               : [...p, { ...item, qty: 1 }];
    });
  }

  function change(id, d) {
    setCart(p =>
      p.map(i => i.id === id ? { ...i, qty: i.qty + d } : i)
       .filter(i => i.qty > 0)
    );
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  async function submit() {
    if (!cart.length || submitting) return;
    setSubmitting(true);

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
  }

  return (
    <div style={styles.page}>
      <div style={styles.brand}>Waffles Spot</div>

      {MENU.map(item => (
        <div key={item.id} style={styles.menuCard}>
          <img src={item.img} style={styles.img} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>{item.name}</div>
            <div>₹{item.price}</div>
          </div>
          <button style={styles.addBtn} onClick={() => add(item)}>+ Add</button>
        </div>
      ))}

      {cart.length > 0 && (
        <button style={styles.floatingCart} onClick={() => setOpen(true)}>
          Cart • ₹{total}
        </button>
      )}

      {open && (
        <>
          <div style={styles.overlay} onClick={() => setOpen(false)} />
          <div style={styles.cart}>
            <div style={styles.cartHeader}>
              <span>Your Cart</span>
              <button onClick={() => setOpen(false)}>✕</button>
            </div>

            <div style={styles.cartItems}>
              {cart.map(i => (
                <div key={i.id} style={{ marginBottom: 12 }}>
                  <b>{i.name}</b>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={styles.qtyBtn} onClick={() => change(i.id, -1)}>−</button>
                      <b>{i.qty}</b>
                      <button style={styles.qtyBtn} onClick={() => change(i.id, 1)}>+</button>
                    </div>
                    <span>₹{i.qty * i.price}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.cartFooter}>
              <input placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
              <input placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 10 }} />

              <button
                disabled={!cart.length}
                onClick={submit}
                style={{
                  width: "100%",
                  padding: 12,
                  fontWeight: 900,
                  background: cart.length ? "#ffd166" : "#444"
                }}
              >
                {submitting ? "Placing…" : `Place Order • ₹${total}`}
              </button>
            </div>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
