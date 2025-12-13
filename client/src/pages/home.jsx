import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { db, serverTimestamp } from "../firebaseInit";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Footer from "../components/Footer";

/* ---------------- MENU ---------------- */
const MENU = [
  { id: "w1", name: "Classic Belgian Waffle", price: 100, img: "/images/waffle1.jpeg", desc: "Crispy outside, soft inside. Traditional Belgian taste." },
  { id: "w2", name: "Strawberry Cream Waffle", price: 150, img: "/images/waffle2.jpeg", desc: "Fresh strawberries with whipped cream." },
  { id: "w3", name: "Nutella Chocolate Waffle", price: 180, img: "/images/waffle3.jpeg", desc: "Loaded with Nutella & chocolate drizzle." },
  { id: "w4", name: "Banana Caramel Waffle", price: 150, img: "/images/waffle4.jpeg", desc: "Banana slices with caramel sauce." },
  { id: "w5", name: "Blueberry Bliss Waffle", price: 180, img: "/images/waffle5.jpeg", desc: "Blueberry compote with vanilla cream." }
];

/* ---------------- STYLES ---------------- */
const ui = {
  page: { background: "#0b0b0b", color: "#f6e8c1", minHeight: "100vh", padding: 16 },

  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  brand: { fontSize: 26, fontWeight: 900, color: "#ffd166" },

  tokenBtn: {
    background: "transparent",
    border: "1px solid #ffd166",
    color: "#ffd166",
    padding: "8px 14px",
    borderRadius: 20,
    fontWeight: 700
  },

  cartBtn: {
    background: "#222",
    color: "#ffd166",
    border: "1px solid #ffd166",
    padding: "8px 14px",
    borderRadius: 20,
    fontWeight: 800,
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
    alignItems: "center",
    cursor: "pointer"
  },

  img: { width: 80, height: 80, borderRadius: 10, objectFit: "cover" },

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
    alignItems: "center"
  },

  popup: {
    background: "#111",
    borderRadius: 14,
    width: "90%",
    maxWidth: 420,
    maxHeight: "85vh",
    overflowY: "auto",
    padding: 16
  },

  popupImg: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 12,
    marginBottom: 12
  },

  popupTitle: { fontSize: 22, fontWeight: 900, color: "#ffd166" },
  popupDesc: { marginTop: 8, color: "#ddd", lineHeight: 1.6 },

  popupFooter: {
    marginTop: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  closeBtn: {
    background: "#333",
    color: "#ffd166",
    border: "none",
    padding: "8px 14px",
    borderRadius: 8,
    fontWeight: 800
  }
};

/* ---------------- COMPONENT ---------------- */
export default function Home() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState([]);
  const [openItem, setOpenItem] = useState(null);
  const [openCart, setOpenCart] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [session, setSession] = useState("Session 1");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSession() {
      const ref = doc(db, "settings", "activeSession");
      const snap = await getDoc(ref);
      if (snap.exists()) setSession(snap.data().session_id);
    }
    loadSession();
  }, []);

  function add(item) {
    setCart(c =>
      c.find(x => x.id === item.id)
        ? c.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x)
        : [...c, { ...item, qty: 1 }]
    );
    setOpenItem(null);
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const canSubmit = cart.length && name.trim() && phone.trim();

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);

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
      {/* HEADER */}
      <div style={ui.header}>
        <div style={ui.brand}>Waffle Lounge</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={ui.cartBtn} onClick={() => setOpenCart(true)}>
            🛒 Cart {cart.length > 0 && <span style={ui.badge}>{cart.length}</span>}
          </button>
          <button style={ui.tokenBtn} onClick={() => {
            const ph = localStorage.getItem("myPhone");
            ph ? setLocation(`/mytoken?phone=${ph}`) : alert("No previous order");
          }}>
            🎟 My Token
          </button>
        </div>
      </div>

      {/* MENU */}
      <div style={ui.menuGrid}>
        {MENU.map(m => (
          <div key={m.id} style={ui.card} onClick={() => setOpenItem(m)}>
            <img src={m.img} alt="" style={ui.img} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{m.name}</div>
              ₹{m.price}
            </div>
            <button style={ui.addBtn} onClick={e => { e.stopPropagation(); add(m); }}>
              + Add
            </button>
          </div>
        ))}
      </div>

      {/* ITEM POPUP */}
      {openItem && (
        <div style={ui.overlay} onClick={() => setOpenItem(null)}>
          <div style={ui.popup} onClick={e => e.stopPropagation()}>
            <img src={openItem.img} alt="" style={ui.popupImg} />
            <div style={ui.popupTitle}>{openItem.name}</div>
            <div style={ui.popupDesc}>{openItem.desc}</div>

            <div style={ui.popupFooter}>
              <div style={{ fontWeight: 900 }}>₹{openItem.price}</div>
              <button style={ui.addBtn} onClick={() => add(openItem)}>Add</button>
              <button style={ui.closeBtn} onClick={() => setOpenItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
