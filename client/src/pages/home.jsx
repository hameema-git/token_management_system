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
const ui = { /* 🔥 SAME styles you already have – unchanged */ };

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

  /* ---------------- CART LOGIC ---------------- */
  function add(i) {
    setCart(c =>
      c.find(x => x.id === i.id)
        ? c.map(x => x.id === i.id ? { ...x, qty: x.qty + 1 } : x)
        : [...c, { ...i, qty: 1 }]
    );
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const canSubmit = cart.length > 0 && name.trim() && phone.trim();

  /* ---------------- PLACE ORDER ---------------- */
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

  /* ---------------- UI ---------------- */
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
            <img
              src={m.img || "/images/default.png"}
              style={ui.img}
              onClick={() => setItem(m)}
            />
            <div style={{ flex: 1 }} onClick={() => setItem(m)}>
              <b>{m.name}</b><br />₹{m.price}
            </div>
            <button style={ui.addBtn} onClick={() => add(m)}>+ Add</button>
          </div>
        ))}
      </div>

      {/* ITEM MODAL (RESTORED) */}
      {item && (
        <div style={ui.overlay} onClick={() => setItem(null)}>
          <div
            style={isDesktop ? ui.modalDesktop : ui.modalMobile}
            onClick={e => e.stopPropagation()}
          >
            <button style={ui.closeBtn} onClick={() => setItem(null)}>✕</button>
            <img src={item.img} style={{ width: "100%", borderRadius: 12 }} />
            <div style={ui.modalTitle}>{item.name}</div>
            <div style={ui.modalPrice}>₹{item.price}</div>
            <button style={ui.modalAdd} onClick={() => { add(item); setItem(null); }}>
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {/* CART DRAWER (RESTORED) */}
      {cartOpen && (
        <div style={ui.overlay} onClick={() => setCartOpen(false)}>
          <div
            style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "100%", maxWidth: 420, background: "#0f0f0f", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: 16, borderBottom: "1px solid #222" }}>
              <h3>Your Cart</h3>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {cart.map(i => (
                <div key={i.id} style={{ marginBottom: 12 }}>
                  <b>{i.name}</b> — ₹{i.price * i.qty}
                </div>
              ))}
            </div>

            <div style={{ padding: 16 }}>
              <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
              <input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
              <div>Total: ₹{total}</div>
              <button disabled={!canSubmit} onClick={submit}>Place Order</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
