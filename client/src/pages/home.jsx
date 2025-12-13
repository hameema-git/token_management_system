// client/src/pages/home.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { db, serverTimestamp } from "../firebaseInit";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Footer from "../components/Footer";

/* ---------------- MENU ---------------- */
const MENU = [
  {
    id: "w1",
    name: "Classic Belgian Waffle",
    price: 100,
    img: "/images/waffle1.jpeg",
    desc: "Crispy outside, fluffy inside. Authentic Belgian taste."
  },
  {
    id: "w2",
    name: "Strawberry Cream Waffle",
    price: 150,
    img: "/images/waffle2.jpeg",
    desc: "Fresh strawberries with smooth whipped cream."
  },
  {
    id: "w3",
    name: "Nutella Chocolate Waffle",
    price: 180,
    img: "/images/waffle3.jpeg",
    desc: "Rich Nutella spread with premium chocolate drizzle."
  },
  {
    id: "w4",
    name: "Banana Caramel Waffle",
    price: 150,
    img: "/images/waffle4.jpeg",
    desc: "Caramelized bananas with golden caramel sauce."
  },
  {
    id: "w5",
    name: "Blueberry Bliss Waffle",
    price: 180,
    img: "/images/waffle5.jpeg",
    desc: "Juicy blueberries with a sweet tangy glaze."
  }
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
    fontWeight: 700
  },

  cartBtn: {
    background: "#ffd166",
    color: "#111",
    border: "none",
    padding: "8px 14px",
    borderRadius: 20,
    fontWeight: 900,
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

  img: { width: 80, height: 80, borderRadius: 10, objectFit: "cover", cursor: "pointer" },

  addBtn: {
    background: "#ffd166",
    border: "none",
    padding: "8px 14px",
    borderRadius: 8,
    fontWeight: 800
  },

  /* ---------- ITEM POPUP ---------- */
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.7)",
    zIndex: 1000,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end"
  },

  modal: {
    background: "#111",
    width: "100%",
    maxWidth: 420,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "90vh",
    overflowY: "auto"
  },

  modalImg: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 12
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: 900,
    marginTop: 12,
    color: "#ffd166"
  },

  modalDesc: {
    marginTop: 8,
    color: "#bfb39a",
    lineHeight: 1.5
  },

  modalPrice: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: 900
  },

  modalAdd: {
    marginTop: 16,
    width: "100%",
    padding: "14px",
    background: "#ffd166",
    border: "none",
    borderRadius: 10,
    fontWeight: 900
  },

  closeBtn: {
    position: "absolute",
    top: 10,
    right: 16,
    fontSize: 22,
    background: "transparent",
    color: "#fff",
    border: "none"
  }
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState([]);
  const [item, setItem] = useState(null);
  const [session, setSession] = useState("Session 1");

  useEffect(() => {
    getDoc(doc(db, "settings", "activeSession")).then(snap => {
      if (snap.exists()) setSession(snap.data().session_id);
    });
  }, []);

  function add(i) {
    setCart(c =>
      c.find(x => x.id === i.id)
        ? c.map(x => x.id === i.id ? { ...x, qty: x.qty + 1 } : x)
        : [...c, { ...i, qty: 1 }]
    );
  }

  return (
    <div style={ui.page}>
      {/* HEADER */}
      <div style={ui.header}>
        <div style={ui.brand}>Waffle Lounge</div>
        <div style={ui.headerBtns}>
          <button style={ui.cartBtn}>
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

      {/* MENU */}
      <div style={ui.menuGrid}>
        {MENU.map(m => (
          <div key={m.id} style={ui.card}>
            <img src={m.img} alt="" style={ui.img} onClick={() => setItem(m)} />
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setItem(m)}>
              <div style={{ fontWeight: 800 }}>{m.name}</div>
              ₹{m.price}
            </div>
            <button style={ui.addBtn} onClick={() => add(m)}>+ Add</button>
          </div>
        ))}
      </div>

      {/* ITEM POPUP */}
      {item && (
        <div style={ui.overlay} onClick={() => setItem(null)}>
          <div style={ui.modal} onClick={e => e.stopPropagation()}>
            <button style={ui.closeBtn} onClick={() => setItem(null)}>✕</button>
            <img src={item.img} alt="" style={ui.modalImg} />
            <div style={ui.modalTitle}>{item.name}</div>
            <div style={ui.modalDesc}>{item.desc}</div>
            <div style={ui.modalPrice}>₹{item.price}</div>
            <button style={ui.modalAdd} onClick={() => { add(item); setItem(null); }}>
              Add to Cart
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
