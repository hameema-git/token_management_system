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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  brand: { fontSize: 26, fontWeight: 900, color: "#ffd166" },

  menuList: { display: "grid", gap: 14 },
  card: {
    display: "flex", gap: 12, padding: 12, background: "#111",
    borderRadius: 12, alignItems: "center"
  },
  img: { width: 70, height: 70, borderRadius: 10, objectFit: "cover" },
  addBtn: {
    background: "#ffd166", border: "none", padding: "8px 14px",
    borderRadius: 8, fontWeight: 800, cursor: "pointer"
  },

  floatingCart: {
    position: "fixed",
    bottom: 18,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#111",
    color: "#ffd166",
    padding: "14px 22px",
    borderRadius: 999,
    border: "2px solid #ffd166",
    fontWeight: 900,
    zIndex: 2000
  },

  drawerOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.7)", zIndex: 3000
  },

  drawer: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    maxHeight: "85vh",
    background: "#0f0f0f",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    overflowY: "auto"
  },

  row: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },

  qtyBtn: {
    padding: "6px 10px", borderRadius: 6,
    background: "#222", color: "#ffd166",
    border: "none", fontWeight: 900
  },

  input: {
    width: "100%", padding: 12,
    borderRadius: 8, border: "1px solid #222",
    background: "#0c0c0c", color: "#fff"
  },

  placeBtn: {
    width: "100%", padding: 14,
    background: "#ffd166", border: "none",
    borderRadius: 10, fontWeight: 900,
    marginTop: 10
  },

  tokenBtn: {
    background: "#222", color: "#ffd166",
    border: "1px solid #ffd166",
    padding: "8px 14px", borderRadius: 999,
    fontWeight: 800
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

  function add(item) {
    setCart(c =>
      c.find(i => i.id === item.id)
        ? c.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
        : [...c, { ...item, qty: 1 }]
    );
  }

  function updateQty(id, d) {
    setCart(c =>
      c.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i)
    );
  }

  function remove(id) {
    setCart(c => c.filter(i => i.id !== id));
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const canSubmit = cart.length && name.trim() && phone.trim();

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    await addDoc(collection(db, "orders"), {
      createdAt: serverTimestamp(),
      customerName: name.trim(),
      phone: phone.trim(),
      items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.qty })),
      total,
      status: "pending",
      token: null,
      session_id: session
    });

    localStorage.setItem("myPhone", phone.trim());
    setLocation(`/mytoken?phone=${phone.trim()}`);
  }

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.brand}>Waffle Spot</div>
        <button
          style={styles.tokenBtn}
          onClick={() => {
            const p = localStorage.getItem("myPhone");
            if (!p) return alert("No previous order");
            setLocation(`/mytoken?phone=${p}`);
          }}
        >
          🎟 My Token
        </button>
      </div>

      {/* MENU */}
      <div style={styles.menuList}>
        {MENU.map(i => (
          <div key={i.id} style={styles.card}>
            <img src={i.img} style={styles.img} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{i.name}</div>
              <div>₹{i.price}</div>
            </div>
            <button style={styles.addBtn} onClick={() => add(i)}>+ Add</button>
          </div>
        ))}
      </div>

      {/* CART BUTTON */}
      {cart.length > 0 && (
        <button style={styles.floatingCart} onClick={() => setOpen(true)}>
          🛒 Cart ({cart.reduce((s, i) => s + i.qty, 0)}) • ₹{total}
        </button>
      )}

      {/* CART DRAWER */}
      {open && (
        <div style={styles.drawerOverlay} onClick={() => setOpen(false)}>
          <div style={styles.drawer} onClick={e => e.stopPropagation()}>
            <h2>Your Cart</h2>

            {cart.map(i => (
              <div key={i.id} style={styles.row}>
                <div>
                  <div style={{ fontWeight: 800 }}>{i.name}</div>
                  <div>₹{i.price * i.qty}</div>
                </div>
                <div>
                  <button style={styles.qtyBtn} onClick={() => updateQty(i.id, -1)}>-</button>
                  <span style={{ margin: "0 8px" }}>{i.qty}</span>
                  <button style={styles.qtyBtn} onClick={() => updateQty(i.id, 1)}>+</button>
                  <button onClick={() => remove(i.id)} style={{ marginLeft: 10 }}>❌</button>
                </div>
              </div>
            ))}

            <input style={styles.input} placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
            <input style={styles.input} placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />

            <div style={{ marginTop: 8, fontWeight: 800 }}>Total: ₹{total}</div>

            <button
              disabled={!canSubmit || submitting}
              onClick={submit}
              style={{
                ...styles.placeBtn,
                opacity: canSubmit ? 1 : 0.5
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
