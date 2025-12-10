// client/src/pages/home.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { db, serverTimestamp } from "../firebaseInit";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Footer from "../components/Footer";

/*
  MENU has small thumbnail images (80x80). You can replace image URLs
  with your own hosted images. Use small thumbnails to keep load low.
*/
// const MENU = [
//   { id: "m1", name: "Artisan Coffee", price: 4.5, img: "https://picsum.photos/seed/m1/80/80" },
//   { id: "m2", name: "Avocado Toast", price: 12,   img: "https://picsum.photos/seed/m2/80/80" },
//   { id: "m3", name: "Daily Pastry",   price: 5.5, img: "https://picsum.photos/seed/m3/80/80" },
// ];

const MENU = [
  {
    id: "w1",
    name: "Classic Belgian Waffle",
    price: 100,
    img: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "w2",
    name: "Strawberry Cream Waffle",
    price: 150,
    img: "https://images.unsplash.com/photo-1601924582975-7d68d9a4e2fa?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "w3",
    name: "Nutella Chocolate Waffle",
    price: 180,
    img: "https://images.unsplash.com/photo-1606851092834-80e46068e930?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "w4",
    name: "Banana Caramel Waffle",
    price: 150,
    img: "https://images.unsplash.com/photo-1612198793932-bd42c1f7bfc1?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "w5",
    name: "Blueberry Bliss Waffle",
    price: 180,
    img: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
  }
];



const styles = {
  page: {
    background: "#0b0b0b",
    color: "#f6e8c1",
    minHeight: "100vh",
    padding: 20,
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif"
  },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  brand: { fontSize: 28, fontWeight: 800, color: "#ffd166", letterSpacing: 1 },
  menuList: { display: "grid", gap: 14 },
  card: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    background: "#111",
    border: "2px solid rgba(255,209,102,0.06)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.6)"
  },
  img: { width: 80, height: 80, objectFit: "cover", borderRadius: 10, flexShrink: 0 },
  itemTitle: { fontWeight: 800, fontSize: 18, color: "#fff" },
  itemPrice: { color: "#f0d9a3", marginTop: 6 },
  addBtn: {
    background: "#ffd166", color: "#111", border: "none", padding: "8px 12px", borderRadius: 8, fontWeight: 700, cursor: "pointer"
  },

  cartBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    background: "#111",
    border: "2px solid rgba(255,209,102,0.06)"
  },

  cartRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0" },
  removeBtn: { marginLeft: 10, padding: "4px 8px", background: "#2b2b2b", color: "#ff9b9b", border: "1px solid #ff9b9b", borderRadius: 6, cursor: "pointer" },

  checkoutForm: { marginTop: 12, display: "grid", gap: 8 },
  input: {
    width: "100%", padding: 12, borderRadius: 8, border: "1px solid #222", background: "#0c0c0c", color: "#fff",
    boxSizing: "border-box",
  },
  placeBtn: {
    marginTop: 6, background: "#ffd166", color: "#111", padding: "12px 14px", borderRadius: 10, border: "none", fontWeight: 800, cursor: "pointer"
  },
  smallMuted: { color: "#bfb39a", fontSize: 13 }
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [session, setSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Load active session
  useEffect(() => {
    async function fetchSession() {
      try {
        const ref = doc(db, "settings", "activeSession");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setSession(snap.data().session_id);
          localStorage.setItem("session", snap.data().session_id);
        } else {
          setSession("Session 1");
        }
      } catch (err) {
        console.error("Session load error", err);
        setSession("Session 1");
      }
    }
    fetchSession();
  }, []);

  function addToCart(item) {
    setCart(prev => {
      const found = prev.find(x => x.id === item.id);
      if (found) return prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(x => x.id !== id));
  }

  const total = cart.reduce((s, it) => s + it.price * it.qty, 0);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || cart.length === 0) {
      alert("Please enter name, phone and add items.");
      return;
    }

    setSubmitting(true);
    try {
      const session_id = session || localStorage.getItem("session") || "Session 1";

      const payload = {
        createdAt: serverTimestamp(),
        customerName: name.trim(),
        phone: String(phone).trim(),
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.qty })),
        total,
        token: null,
        status: "pending",
        session_id
      };

      await addDoc(collection(db, "orders"), payload);
      localStorage.setItem("myPhone", phone.trim());

      // small success flash then go to token page
      setLocation(`/mytoken?phone=${encodeURIComponent(phone.trim())}`);
    } catch (err) {
      console.error("Error submitting order:", err);
      alert("Failed to place order. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.brand}>Waffle Lounge</div>
        <div>
          {/* <Link href="/staff"><button style={{ ...styles.addBtn, background: "#222", color: "#ffd166" }}>Staff</button></Link> */}
          {" "}
          <button
            onClick={() => {
              const ph = localStorage.getItem("myPhone");
              if (!ph) return alert("No previous order found");
              setLocation(`/mytoken?phone=${ph}`);
            }}
            style={{ ...styles.addBtn, marginLeft: 8 }}
          >
            My Token
          </button>
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        <div>
          <h2 style={{ color: "#ffd166", marginBottom: 12 }}>Menu</h2>
          <div style={styles.menuList}>
            {MENU.map(item => (
              <div key={item.id} style={styles.card}>
                <img src={item.img} alt={item.name} style={styles.img} />
                <div style={{ flex: 1 }}>
                  <div style={styles.itemTitle}>{item.name}</div>
                  <div style={styles.itemPrice}>Rs.{item.price.toFixed(2)}</div>
                </div>
                <div>
                  <button onClick={() => addToCart(item)} style={styles.addBtn}>+ Add</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {cart.length > 0 && (
          <aside style={styles.cartBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#ffd166" }}>Your Cart</h3>
              <div style={styles.smallMuted}>{cart.length} item(s)</div>
            </div>

            <div style={{ marginTop: 10 }}>
              {cart.map(i => (
                <div key={i.id} style={styles.cartRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{i.qty} × {i.name}</div>
                    <div style={{ color: "#bfb39a", fontSize: 13 }}>Rs.{(i.qty * i.price).toFixed(2)}</div>
                  </div>
                  <div>
                    <button onClick={() => removeFromCart(i.id)} style={styles.removeBtn}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, fontWeight: 800, fontSize: 18 }}>Total: Rs.{total.toFixed(2)}</div>

            <form onSubmit={submit} style={styles.checkoutForm}>
              <input style={styles.input} placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
              <input style={styles.input} placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
              <button type="submit" disabled={submitting} style={styles.placeBtn}>
                {submitting ? "Placing…" : "Place Order"}
              </button>
            </form>
          </aside>
        )}
      </section>
       <Footer />
    </div>
  );
}
