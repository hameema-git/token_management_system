// client/src/pages/home.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { db, serverTimestamp } from "../firebaseInit";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Footer from "../components/Footer";

/* ---------------- MENU ---------------- */
const MENU = [
  { id: "w1", name: "Classic Belgian Waffle", price: 100, img: "/images/waffle1.jpeg" },
  { id: "w2", name: "Strawberry Cream Waffle", price: 150, img: "/images/waffle2.jpeg" },
  { id: "w3", name: "Nutella Chocolate Waffle", price: 180, img: "/images/waffle3.jpeg" },
  { id: "w4", name: "Banana Caramel Waffle", price: 150, img: "/images/waffle4.jpeg" },
  { id: "w5", name: "Blueberry Bliss Waffle", price: 180, img: "/images/waffle5.jpeg" }
];

/* ---------------- STYLES ---------------- */
const ui = {
  page: { background: "#0b0b0b", color: "#f6e8c1", minHeight: "100vh", padding: 16 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  brand: { fontSize: 26, fontWeight: 900, color: "#ffd166" },

  headerBtns: { display: "flex", gap: 12 },

  tokenBtn: {
    background: "transparent",
    border: "1px solid #ffd166",
    color: "#ffd166",
    padding: "8px 14px",
    borderRadius: 20,
    fontWeight: 700,
    cursor: "pointer"
  },

  cartBtn: {
    background: "#ffd166",
    color: "#111",
    border: "none",
    padding: "8px 14px",
    borderRadius: 20,
    fontWeight: 900,
    cursor: "pointer",
    position: "relative"
  },

  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    background: "#e63946",
    color: "#fff",
    fontSize: 12,
    padding: "2px 6px",
    borderRadius: 20
  },

  menuGrid: { display: "grid", gap: 14 },

  card: {
    display: "flex",
    gap: 14,
    padding: 12,
    background: "#111",
    borderRadius: 12,
    alignItems: "center"
  },

  img: { width: 80, height: 80, borderRadius: 10, objectFit: "cover" },

  addBtn: {
    background: "#ffd166",
    border: "none",
    padding: "8px 14px",
    borderRadius: 8,
    fontWeight: 800,
    cursor: "pointer"
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.6)",
    zIndex: 999
  },

  drawer: {
    position: "fixed",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    maxWidth: 420,
    background: "#0f0f0f",
    display: "flex",
    flexDirection: "column"
  },

  drawerHeader: {
    padding: 16,
    borderBottom: "1px solid #222",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  drawerBody: {
    flex: 1,
    overflowY: "auto",
    padding: 16
  },

  cartRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    gap: 10,
    alignItems: "center",
    marginBottom: 14
  },

  qtyBtn: {
    background: "#222",
    color: "#ffd166",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    fontWeight: 900
  },

  removeBtn: {
    background: "#441111",
    color: "#ff9b9b",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    fontWeight: 900
  },

  drawerFooter: {
    padding: 16,
    borderTop: "1px solid #222"
  },

  input: {
    width: "100%",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #222",
    background: "#111",
    color: "#fff"
  },

  placeBtn: {
    width: "100%",
    padding: "14px",
    background: "#ffd166",
    border: "none",
    borderRadius: 10,
    fontWeight: 900
  }
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [session, setSession] = useState("Session 1");

  useEffect(() => {
    getDoc(doc(db, "settings", "activeSession")).then(snap => {
      if (snap.exists()) setSession(snap.data().session_id);
    });
  }, []);

  function add(item) {
    setCart(c =>
      c.find(x => x.id === item.id)
        ? c.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x)
        : [...c, { ...item, qty: 1 }]
    );
  }

  function updateQty(id, d) {
    setCart(c =>
      c.map(x => x.id === id ? { ...x, qty: x.qty + d } : x).filter(x => x.qty > 0)
    );
  }

  function remove(id) {
    setCart(c => c.filter(x => x.id !== id));
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const canSubmit = cart.length && name.trim() && phone.trim();

  async function submit() {
    if (!canSubmit) return;

    await addDoc(collection(db, "orders"), {
      createdAt: serverTimestamp(),
      customerName: name,
      phone,
      items: cart.map(i => ({
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
    <div style={ui.page}>
      <div style={ui.header}>
        <div style={ui.brand}>Waffle Lounge</div>

        <div style={ui.headerBtns}>
          <button style={ui.cartBtn} onClick={() => setOpen(true)}>
            🛒 Cart
            {cart.length > 0 && <span style={ui.badge}>{cart.length}</span>}
          </button>

          <button
            style={ui.tokenBtn}
            onClick={() => {
              const ph = localStorage.getItem("myPhone");
              ph ? setLocation(`/mytoken?phone=${ph}`) : alert("No previous order");
            }}
          >
            🎟 My Token
          </button>
        </div>
      </div>

      <div style={ui.menuGrid}>
        {MENU.map(m => (
          <div key={m.id} style={ui.card}>
            <img src={m.img} alt="" style={ui.img} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{m.name}</div>
              ₹{m.price}
            </div>
            <button style={ui.addBtn} onClick={() => add(m)}>+ Add</button>
          </div>
        ))}
      </div>

      {open && (
        <div style={ui.overlay} onClick={() => setOpen(false)}>
          <div style={ui.drawer} onClick={e => e.stopPropagation()}>
            <div style={ui.drawerHeader}>
              <h3>Your Cart</h3>
              <button onClick={() => setOpen(false)}>✕</button>
            </div>

            <div style={ui.drawerBody}>
              {cart.map(i => (
                <div key={i.id} style={ui.cartRow}>
                  <div>
                    <b>{i.name}</b>
                    <div>₹{i.price * i.qty}</div>
                  </div>

                  <div>
                    <button style={ui.qtyBtn} onClick={() => updateQty(i.id, -1)}>−</button>
                    <span style={{ margin: "0 6px" }}>{i.qty}</span>
                    <button style={ui.qtyBtn} onClick={() => updateQty(i.id, 1)}>+</button>
                  </div>

                  <button style={ui.removeBtn} onClick={() => remove(i.id)}>✕</button>
                </div>
              ))}
            </div>

            <div style={ui.drawerFooter}>
              <input style={ui.input} placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
              <input style={ui.input} placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Total: ₹{total}</div>
              <button style={ui.placeBtn} disabled={!canSubmit} onClick={submit}>
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
