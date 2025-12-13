import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { db, serverTimestamp } from "../firebaseInit";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Footer from "../components/Footer";

/* MENU */
const MENU = [
  { id: "w1", name: "Classic Belgian Waffle", price: 100, img: "/images/waffle1.jpeg" },
  { id: "w2", name: "Strawberry Cream Waffle", price: 150, img: "/images/waffle2.jpeg" },
  { id: "w3", name: "Nutella Chocolate Waffle", price: 180, img: "/images/waffle3.jpeg" },
  { id: "w4", name: "Banana Caramel Waffle", price: 150, img: "/images/waffle4.jpeg" },
  { id: "w5", name: "Blueberry Bliss Waffle", price: 180, img: "/images/waffle5.jpeg" }
];

export default function Home() {
  const [, setLocation] = useLocation();

  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [session, setSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  /* Load active session */
  useEffect(() => {
    async function loadSession() {
      try {
        const snap = await getDoc(doc(db, "settings", "activeSession"));
        setSession(snap.exists() ? snap.data().session_id : "Session 1");
      } catch {
        setSession("Session 1");
      }
    }
    loadSession();
  }, []);

  /* CART HELPERS */
  function addToCart(item) {
    setCart((prev) => {
      const f = prev.find((x) => x.id === item.id);
      if (f) return prev.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, qty: 1 }];
    });
    setOpen(true);
  }

  function updateQty(id, diff) {
    setCart((prev) =>
      prev
        .map((x) => x.id === id ? { ...x, qty: x.qty + diff } : x)
        .filter((x) => x.qty > 0)
    );
  }

  function remove(id) {
    setCart((prev) => prev.filter((x) => x.id !== id));
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const canSubmit = cart.length > 0 && name.trim() && phone.trim();

  /* SUBMIT */
  async function submit() {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "orders"), {
        createdAt: serverTimestamp(),
        customerName: name.trim(),
        phone: phone.trim(),
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.qty
        })),
        total,
        token: null,
        paid: false,
        status: "pending",
        session_id: session || "Session 1"
      });

      localStorage.setItem("myPhone", phone.trim());
      setLocation(`/mytoken?phone=${phone.trim()}`);
    } catch {
      alert("Order failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={ui.page}>
      {/* HEADER */}
      <div style={ui.header}>
        <div style={ui.brand}>Waffle Lounge</div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={ui.tokenBtn} onClick={() => {
            const ph = localStorage.getItem("myPhone");
            if (ph) setLocation(`/mytoken?phone=${ph}`);
            else alert("No previous order");
          }}>
            My Token
          </button>

          <button style={ui.cartBtn} onClick={() => setOpen(true)}>
            Cart ({cart.length})
          </button>
        </div>
      </div>

      {/* MENU */}
      <div style={ui.menu}>
        {MENU.map((m) => (
          <div key={m.id} style={ui.card}>
            <img src={m.img} alt={m.name} style={ui.img} />
            <div style={{ flex: 1 }}>
              <div style={ui.item}>{m.name}</div>
              <div style={ui.price}>₹{m.price}</div>
            </div>
            <button style={ui.addBtn} onClick={() => addToCart(m)}>+ Add</button>
          </div>
        ))}
      </div>

      {/* CART DRAWER */}
      {open && (
        <div style={ui.overlay} onClick={() => setOpen(false)}>
          <div style={ui.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={ui.drawerHeader}>
              <h2 style={{ margin: 0 }}>Your Cart</h2>
              <button style={ui.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>

            {cart.map((i) => (
              <div key={i.id} style={ui.cartItem}>
                <div style={{ fontWeight: 800 }}>{i.name}</div>
                <div style={{ color: "#bfb39a" }}>₹{i.price * i.qty}</div>

                <div style={ui.cartRow}>
                  <div style={ui.qtyGroup}>
                    <button style={ui.qtyBtn} onClick={() => updateQty(i.id, -1)}>−</button>
                    <span>{i.qty}</span>
                    <button style={ui.qtyBtn} onClick={() => updateQty(i.id, 1)}>+</button>
                  </div>

                  <button style={ui.removeBtn} onClick={() => remove(i.id)}>✕</button>
                </div>
              </div>
            ))}

            <input style={ui.input} placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input style={ui.input} placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <div style={ui.total}>Total: ₹{total}</div>

            <button
              style={{ ...ui.placeBtn, opacity: canSubmit ? 1 : 0.5 }}
              disabled={!canSubmit || submitting}
              onClick={submit}
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

/* STYLES */
const ui = {
  page: { background: "#0b0b0b", color: "#f6e8c1", minHeight: "100vh", padding: 16 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  brand: { fontSize: 26, fontWeight: 900, color: "#ffd166" },
  cartBtn: { background: "#ffd166", color: "#111", padding: "8px 12px", borderRadius: 8, border: "none", fontWeight: 800 },
  tokenBtn: { background: "#222", color: "#ffd166", padding: "8px 12px", borderRadius: 8, border: "1px solid #ffd166" },

  menu: { display: "grid", gap: 14 },
  card: { display: "flex", gap: 14, background: "#111", padding: 12, borderRadius: 12 },
  img: { width: 80, height: 80, borderRadius: 10, objectFit: "cover" },
  item: { fontWeight: 800 },
  price: { color: "#bfb39a" },
  addBtn: { background: "#ffd166", border: "none", padding: "8px 12px", borderRadius: 8 },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 999 },
  drawer: { position: "fixed", right: 0, top: 0, bottom: 0, width: "100%", maxWidth: 420, background: "#0f0f0f", padding: 16, overflowY: "auto" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  closeBtn: { background: "none", color: "#ffd166", border: "none", fontSize: 22 },

  cartItem: { background: "#111", padding: 12, borderRadius: 10, marginBottom: 12 },
  cartRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  qtyGroup: { display: "flex", gap: 10, alignItems: "center" },
  qtyBtn: { background: "#222", color: "#ffd166", border: "none", padding: "4px 10px", borderRadius: 6 },
  removeBtn: { background: "#331111", color: "#ff6b6b", border: "1px solid #ff6b6b", borderRadius: 6 },

  input: { width: "100%", padding: 10, marginTop: 8, background: "#111", border: "1px solid #333", color: "#fff", borderRadius: 8 },
  total: { marginTop: 10, fontWeight: 900 },
  placeBtn: { marginTop: 10, width: "100%", padding: 12, background: "#ffd166", border: "none", borderRadius: 10, fontWeight: 900 }
};
