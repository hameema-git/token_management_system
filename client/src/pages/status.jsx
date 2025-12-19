import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import {
  collection,
  query,
  where,
  orderBy,
  getDoc,
  doc,
  onSnapshot
} from "firebase/firestore";
import { Link } from "wouter";
import Footer from "../components/Footer";

/* ---------------- STYLES ---------------- */
const styles = {
  page: { background: "#0b0b0b", color: "#f6e8c1", minHeight: "100vh", padding: 20 },
  container: { maxWidth: 720, margin: "auto" },
  header: { marginBottom: 18 },
  title: { fontSize: 22, fontWeight: 900, color: "#ffd166" },
  subtitle: { color: "#bfb39a", fontSize: 13 },

  inputRow: { background: "#111", padding: 14, borderRadius: 10, marginBottom: 18 },
  input: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #222", background: "#0c0c0c", color: "#fff" },
  findBtn: { marginTop: 8, padding: "10px 14px", background: "#ffd166", color: "#111", border: "none", borderRadius: 8, fontWeight: 800 },

  card: { marginTop: 14, padding: 20, borderRadius: 12, background: "#111", borderLeft: "8px solid #ffd166", textAlign: "center" },
  skippedCard: { marginTop: 14, padding: 20, borderRadius: 12, background: "#111", borderLeft: "8px solid #ff7a00", textAlign: "center" },
  completedCard: { marginTop: 20, padding: 22, borderRadius: 12, background: "#111", borderLeft: "8px solid #2ecc71", textAlign: "center" },

  btn: { padding: 10, borderRadius: 8, border: "none", fontWeight: 800, cursor: "pointer" },
  backBtn: { background: "#222", color: "#ffd166" },
  refreshBtn: { background: "#ffd166", color: "#111" },
  itemBtn: { marginTop: 10, background: "#333", color: "#ffd166" },

  modalBackdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
  },
  modal: { background: "#111", padding: 20, borderRadius: 12, width: "90%", maxWidth: 400 }
};

/* ---------------- COMPONENT ---------------- */
export default function TokenStatus() {
  const [phone, setPhone] = useState("");
  const [current, setCurrent] = useState(0);
  const [orders, setOrders] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [showItems, setShowItems] = useState(null);

  /* -------- SAFE LOAD PHONE (VERCEL SAFE) -------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const saved =
      params.get("phone") || localStorage.getItem("myPhone") || "";
    setPhone(saved);
  }, []);

  /* -------- REALTIME CURRENT TOKEN -------- */
  useEffect(() => {
    let unsub;

    async function listenToken() {
      const snap = await getDoc(doc(db, "settings", "activeSession"));
      const session = snap.exists() ? snap.data().session_id : "Session 1";

      unsub = onSnapshot(doc(db, "tokens", "session_" + session), s => {
        if (s.exists()) setCurrent(s.data().currentToken || 0);
      });
    }

    listenToken();
    return () => unsub && unsub();
  }, []);

  /* -------- REALTIME ORDERS (AUTO REFRESH) -------- */
  useEffect(() => {
    if (!phone) return;

    let unsub;

    async function listenOrders() {
      const snap = await getDoc(doc(db, "settings", "activeSession"));
      const session = snap.exists() ? snap.data().session_id : "Session 1";

      const q = query(
        collection(db, "orders"),
        where("phone", "==", String(phone)),
        where("session_id", "==", session),
        orderBy("token", "asc") // ✅ ASCENDING ORDER
      );

      unsub = onSnapshot(q, snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const active = list.filter(o => o.status !== "completed");

        if (!active.length && list.length) {
          setCompleted(true);
          setOrders([]);
        } else {
          setCompleted(false);
          setOrders(active);
        }
      });
    }

    listenOrders();
    return () => unsub && unsub();
  }, [phone]);

  function handleFind() {
    if (typeof window !== "undefined") {
      localStorage.setItem("myPhone", phone);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>Waffle Lounge — Order Status</div>
          <div style={styles.subtitle}>Live token tracking</div>
        </div>

        <div style={styles.inputRow}>
          <input
            placeholder="Enter phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={styles.input}
          />
          <button style={styles.findBtn} onClick={handleFind}>Find Order</button>
        </div>

        {/* TOKENS */}
        {orders.map(o => {
          const position = o.token - current;
          const skipped = position < 0;

          return (
            <div key={o.id} style={skipped ? styles.skippedCard : styles.card}>
              <div style={{ fontSize: 46, fontWeight: 900 }}>TOKEN {o.token}</div>
              <div>Now Serving: <b>{current || "-"}</b></div>

              {skipped ? (
                <div style={{ marginTop: 8 }}>
                  ⚠ Token skipped — come to counter
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  Position: <b>{position}</b>
                </div>
              )}

              <button
                style={{ ...styles.btn, ...styles.itemBtn }}
                onClick={() => setShowItems(o)}
              >
                View Items
              </button>
            </div>
          );
        })}

        {completed && (
          <div style={styles.completedCard}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>✅ Order Completed</div>
            Please collect your order
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <Link href="/">
            <button style={{ ...styles.btn, ...styles.backBtn }}>Back</button>
          </Link>
          <button style={{ ...styles.btn, ...styles.refreshBtn }}>Live</button>
        </div>

        <Footer />
      </div>

      {/* ITEMS MODAL */}
      {showItems && (
        <div style={styles.modalBackdrop} onClick={() => setShowItems(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Token {showItems.token} Items</h3>

            {(showItems.items || []).map((i, idx) => (
              <div key={idx} style={{ marginTop: 8 }}>
                {i.quantity} × {i.name}
              </div>
            ))}

            <button
              style={{ ...styles.btn, ...styles.refreshBtn, marginTop: 14 }}
              onClick={() => setShowItems(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
