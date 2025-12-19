import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import {
  query,
  collection,
  where,
  orderBy,
  getDoc,
  doc,
  onSnapshot
} from "firebase/firestore";
import { Link } from "wouter";
import Footer from "../components/Footer";

/* ---------------- COMPONENT ---------------- */
export default function TokenStatus() {
  const params = new URLSearchParams(window.location.search);
  const initialPhone =
    params.get("phone") || localStorage.getItem("myPhone") || "";

  const [phone, setPhone] = useState(initialPhone);
  const [session, setSession] = useState("");
  const [currentToken, setCurrentToken] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showItems, setShowItems] = useState(null);

  /* 🔹 LOAD ACTIVE SESSION */
  useEffect(() => {
    async function loadSession() {
      const snap = await getDoc(doc(db, "settings", "activeSession"));
      if (snap.exists()) setSession(snap.data().session_id);
    }
    loadSession();
  }, []);

  /* 🔴 LIVE NOW SERVING TOKEN */
  useEffect(() => {
    if (!session) return;

    const unsub = onSnapshot(
      doc(db, "tokens", "session_" + session),
      snap => {
        if (snap.exists()) {
          setCurrentToken(snap.data().currentToken || 0);
        }
      }
    );

    return () => unsub();
  }, [session]);

  /* 🔍 LOAD ALL ORDERS FOR PHONE */
  useEffect(() => {
    if (!phone || !session) return;

    setLoading(true);
    localStorage.setItem("myPhone", phone);

    const q = query(
      collection(db, "orders"),
      where("phone", "==", phone),
      where("session_id", "==", session),
      orderBy("token", "asc")
    );

    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(list);
      setLoading(false);
    });

    return () => unsub();
  }, [phone, session]);

  /* 🔎 FIND ACTIVE (NEAREST) ORDER */
  const activeOrder =
    orders.find(
      o => o.status !== "completed" && o.token >= currentToken
    ) || orders.find(o => o.status !== "completed");

  /* 📍 POSITION */
  const position =
    activeOrder && activeOrder.token && currentToken
      ? Math.max(activeOrder.token - currentToken, 0)
      : null;

  /* ---------------- UI ---------------- */
  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <h2 style={styles.title}>Live Token Status</h2>
          <div style={styles.subtitle}>Track your order in real time</div>
        </div>

        {/* SEARCH */}
        <input
          style={styles.input}
          placeholder="Enter phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />

        {loading && <div style={styles.center}>Loading…</div>}

        {/* 🔝 TOP SUMMARY */}
        {activeOrder && (
          <div style={styles.summaryCard}>
            <div style={styles.row}>
              <div>
                <div style={styles.label}>Now Serving</div>
                <div style={styles.value}>{currentToken || "-"}</div>
              </div>

              <div>
                <div style={styles.label}>Your Token</div>
                <div style={styles.value}>{activeOrder.token}</div>
              </div>
            </div>

            <div style={styles.row}>
              <div>
                <div style={styles.label}>Position</div>
                <div style={styles.value}>
                  {position === 0 ? "You’re Next!" : position}
                </div>
              </div>

              <div>
                <div style={styles.label}>Amount</div>
                <div style={styles.value}>
                  ₹{Number(activeOrder.total || 0).toFixed(2)}
                </div>
              </div>
            </div>

            <button
              style={styles.btn}
              onClick={() => setShowItems(activeOrder.items || [])}
            >
              View Ordered Items
            </button>
          </div>
        )}

        {/* 📜 ALL TOKENS */}
        {orders.map(order => {
          let status = "Waiting";
          let color = "#ffd166";

          if (order.status === "completed") {
            status = "Completed";
            color = "#2ecc71";
          } else if (currentToken > order.token) {
            status = "Skipped";
            color = "#ff7a00";
          } else if (currentToken === order.token) {
            status = "Now Serving";
            color = "#3498db";
          }

          return (
            <div
              key={order.id}
              style={{
                ...styles.tokenCard,
                borderLeft: `6px solid ${color}`
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 22, color }}>
                TOKEN {order.token}
              </div>
              <div>Status: <b>{status}</b></div>
              <div>Payment: <b>{order.paid ? "PAID" : "UNPAID"}</b></div>
            </div>
          );
        })}

        {/* FOOTER ACTIONS */}
        <Link href="/">
          <button style={styles.btnAlt}>← Back to Menu</button>
        </Link>

        <Footer />
      </div>

      {/* ITEMS MODAL */}
      {showItems && (
        <Modal onClose={() => setShowItems(null)}>
          {showItems.map((i, idx) => (
            <div key={idx}>
              {i.quantity} × {i.name}
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const styles = {
  page: { background: "#0b0b0b", minHeight: "100vh", color: "#f6e8c1", padding: 16 },
  container: { maxWidth: 720, margin: "auto" },

  header: { textAlign: "center", marginBottom: 16 },
  title: { color: "#ffd166", fontWeight: 900 },
  subtitle: { color: "#bfb39a" },

  input: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    background: "#111",
    border: "1px solid #222",
    color: "#fff"
  },

  center: { textAlign: "center", marginTop: 20 },

  summaryCard: {
    marginTop: 20,
    background: "#111",
    padding: 16,
    borderRadius: 12,
    borderLeft: "6px solid #ffd166"
  },

  row: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  label: { fontSize: 12, color: "#bfb39a" },
  value: { fontSize: 20, fontWeight: 900 },

  tokenCard: {
    marginTop: 14,
    background: "#111",
    padding: 14,
    borderRadius: 10
  },

  btn: {
    marginTop: 12,
    width: "100%",
    padding: 12,
    background: "#ffd166",
    border: "none",
    borderRadius: 8,
    fontWeight: 900
  },

  btnAlt: {
    marginTop: 20,
    width: "100%",
    padding: 12,
    background: "#222",
    color: "#ffd166",
    border: "none",
    borderRadius: 8,
    fontWeight: 900
  }
};

/* ---------------- MODAL ---------------- */
function Modal({ children, onClose }) {
  return (
    <div style={modalBg}>
      <div style={modal}>
        <h3>Ordered Items</h3>
        {children}
        <button style={styles.btnAlt} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const modalBg = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const modal = {
  background: "#111",
  padding: 20,
  borderRadius: 12,
  width: "90%",
  maxWidth: 400
};
