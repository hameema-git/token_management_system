// client/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { db, serverTimestamp } from "../firebaseInit";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from "firebase/firestore";
import Footer from "../components/Footer";

/* ---------------- STYLES (UNCHANGED) ---------------- */
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
  card: { display: "flex", gap: 14, padding: 12, background: "#111", borderRadius: 12, alignItems: "center" },
  img: { width: 80, height: 80, borderRadius: 10, objectFit: "cover", cursor: "pointer" },
  addBtn: { background: "#ffd166", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 800 },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000 },

  modalMobile: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#111",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "85vh",
    overflowY: "auto"
  },

  modalDesktop: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#111",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 520,
    maxHeight: "90vh",
    overflowY: "auto"
  },

  modalImgMobile: { width: "100%", height: 220, objectFit: "cover", borderRadius: 12 },
  modalImgDesktop: { width: "100%", height: 180, objectFit: "cover", borderRadius: 12 },

  modalTitle: { fontSize: 22, fontWeight: 900, marginTop: 12, color: "#ffd166" },
  modalDesc: { marginTop: 8, color: "#bfb39a" },
  modalPrice: { marginTop: 12, fontSize: 20, fontWeight: 900 },

  modalAdd: {
    marginTop: 16,
    width: "100%",
    padding: 14,
    background: "#ffd166",
    border: "none",
    borderRadius: 10,
    fontWeight: 900
  },

  closeBtn: {
    position: "absolute",
    top: 8,
    right: 12,
    background: "transparent",
    color: "#fff",
    border: "none",
    fontSize: 22
  }
};

/* ---------------- COMPONENT ---------------- */
export default function Home() {
  const [, setLocation] = useLocation();

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [item, setItem] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [session, setSession] = useState("Session 1");

  const isDesktop = window.innerWidth >= 768;

  /* 🔹 LOAD ACTIVE SESSION */
  useEffect(() => {
    async function loadSession() {
      const snap = await getDoc(doc(db, "settings", "activeSession"));
      if (snap.exists()) setSession(snap.data().session_id);
    }
    loadSession();
  }, []);

  /* 🔹 LOAD MENU FROM FIRESTORE */
  useEffect(() => {
    const q = query(
      collection(db, "menu"),
      where("active", "==", true),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, snap => {
      setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  /* ---------------- CART ---------------- */
  function add(i) {
    setCart(c =>
      c.find(x => x.id === i.id)
        ? c.map(x => x.id === i.id ? { ...x, qty: x.qty + 1 } : x)
        : [...c, { ...i, qty: 1 }]
    );
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const canSubmit = cart.length > 0 && name.trim() && phone.trim();

  async function submit() {
    if (!canSubmit) return;

    await addDoc(collection(db, "orders"), {
      createdAt: serverTimestamp(),
      customerName: name.trim(),
      phone: phone.trim(),
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
        <div style={ui.headerBtns}>
          <button style={ui.cartBtn} onClick={() => setCartOpen(true)}>
            🛒 Cart {cart.length > 0 && <span style={ui.badge}>{cart.length}</span>}
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
        {menu.map(m => (
          <div key={m.id} style={ui.card}>
            <img src={m.img} style={ui.img} onClick={() => setItem(m)} />
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setItem(m)}>
              <b>{m.name}</b><br />₹{m.price}
            </div>
            <button style={ui.addBtn} onClick={() => add(m)}>+ Add</button>
          </div>
        ))}
      </div>

      {/* ITEM POPUP */}
      {item && (
        <div style={ui.overlay} onClick={() => setItem(null)}>
          <div
            style={isDesktop ? ui.modalDesktop : ui.modalMobile}
            onClick={e => e.stopPropagation()}
          >
            <button style={ui.closeBtn} onClick={() => setItem(null)}>✕</button>
            <img
              src={item.img}
              style={isDesktop ? ui.modalImgDesktop : ui.modalImgMobile}
            />
            <div style={ui.modalTitle}>{item.name}</div>
            <div style={ui.modalDesc}>{item.desc || "Freshly prepared item"}</div>
            <div style={ui.modalPrice}>₹{item.price}</div>
            <button style={ui.modalAdd} onClick={() => { add(item); setItem(null); }}>
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {/* CART DRAWER (UNCHANGED) */}
{cartOpen && (
  <div style={ui.overlay} onClick={() => setCartOpen(false)}>
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "100%",
        maxWidth: 420,
        background: "#0f0f0f",
        display: "flex",
        flexDirection: "column"
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* HEADER */}
      <div style={{ padding: 16, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>Your Cart</h3>
        <button
          onClick={() => setCartOpen(false)}
          style={{ background: "none", color: "#fff", border: "none", fontSize: 20 }}
        >
          ✕
        </button>
      </div>

      {/* ITEMS */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {cart.length === 0 && <p>Your cart is empty</p>}

        {cart.map(i => (
          <div
            key={i.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 12,
              alignItems: "center",
              marginBottom: 14
            }}
          >
            <div>
              <b>{i.name}</b>
              <div>₹{i.price * i.qty}</div>
            </div>

            <div>
              <button onClick={() =>
                setCart(c =>
                  c.map(x => x.id === i.id ? { ...x, qty: x.qty - 1 } : x)
                    .filter(x => x.qty > 0)
                )
              }>−</button>

              <span style={{ margin: "0 8px" }}>{i.qty}</span>

              <button onClick={() =>
                setCart(c =>
                  c.map(x => x.id === i.id ? { ...x, qty: x.qty + 1 } : x)
                )
              }>+</button>
            </div>

            <button
              onClick={() => setCart(c => c.filter(x => x.id !== i.id))}
              style={{
                background: "#8b0000",
                color: "#fff",
                border: "none",
                padding: "6px 10px",
                borderRadius: 6,
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ padding: 16, borderTop: "1px solid #222" }}>
        <input
          placeholder="Your Name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: "100%", padding: 12, marginBottom: 10 }}
        />

        <input
          placeholder="Phone Number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ width: "100%", padding: 12, marginBottom: 10 }}
        />

        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          Total: ₹{total}
        </div>

        <button
          disabled={!canSubmit}
          onClick={submit}
          style={{
            width: "100%",
            padding: 14,
            background: canSubmit ? "#ffd166" : "#444",
            color: "#111",
            border: "none",
            borderRadius: 10,
            fontWeight: 900,
            fontSize: 16,
            cursor: canSubmit ? "pointer" : "not-allowed"
          }}
        >
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
