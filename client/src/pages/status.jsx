// client/src/pages/TokenStatus.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import {
  query,
  collection,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  onSnapshot
} from "firebase/firestore";
import { Link } from "wouter";
import Footer from "../components/Footer";

export default function TokenStatus() {
  const params = new URLSearchParams(window.location.search);
  const initialPhone =
    params.get("phone") || localStorage.getItem("myPhone") || "";

  const [phone, setPhone] = useState(initialPhone);
  const [current, setCurrent] = useState(0);
  const [orders, setOrders] = useState([]);
  const [positionMap, setPositionMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [showItems, setShowItems] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  /* 🔴 CURRENT SERVING TOKEN (DISPLAY ONLY) */
  useEffect(() => {
    let unsub = null;

    async function listenCurrent() {
      const s = await getDoc(doc(db, "settings", "activeSession"));
      const session = s.exists() ? s.data().session_id : "Session 1";

      unsub = onSnapshot(
        doc(db, "tokens", "session_" + session),
        snap => {
          if (snap.exists()) setCurrent(snap.data().currentToken || 0);
        }
      );
    }

    listenCurrent();
    return () => unsub && unsub();
  }, []);

  /* 🔍 LOAD ALL NON-COMPLETED ORDERS FOR PHONE */
  useEffect(() => {
    if (!phone) return;

    setLoading(true);
    localStorage.setItem("myPhone", phone);

    let unsub = null;

    async function listenOrders() {
      const s = await getDoc(doc(db, "settings", "activeSession"));
      const session = s.exists() ? s.data().session_id : "Session 1";

      const q = query(
        collection(db, "orders"),
        where("phone", "==", phone),
        where("session_id", "==", session),
        where("status", "!=", "completed"),
        orderBy("queueOrder", "asc")
      );

      unsub = onSnapshot(q, snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrders(list);
        setLoading(false);
      });
    }

    listenOrders();
    return () => unsub && unsub();
  }, [phone]);

  /* 📍 POSITION CALCULATION (NO CURRENT-TOKEN MATH) */
  useEffect(() => {
    async function calcPositions() {
      if (!orders.length) {
        setPositionMap({});
        return;
      }

      const s = await getDoc(doc(db, "settings", "activeSession"));
      const session = s.exists() ? s.data().session_id : "Session 1";

      const q = query(
        collection(db, "orders"),
        where("session_id", "==", session),
        where("status", "!=", "completed")
      );

      const snap = await getDocs(q);
      const allActive = snap.docs.map(d => d.data());

      const map = {};
      orders.forEach(o => {
        map[o.id] = allActive.filter(
          x => x.queueOrder < o.queueOrder
        ).length;
      });

      setPositionMap(map);
    }

    calcPositions();
  }, [orders]);

  const currentOrder = orders.find(o => o.status !== "skipped");
  const isImmediate =
    currentOrder &&
    (currentOrder.status === "called" ||
      currentOrder.status === "serving");

  return (
    <div style={{ ...page, ...(isImmediate ? urgentBg : {}) }}>
      <div style={container}>

        {/* HEADER */}
        <div style={header}>
          <img src="/logo.png" alt="Logo" style={{ height: 50 }} />
          <h2 style={{ color: "#ffd166" }}>ABC SHOP</h2>
          <div style={{ color: "#bfb39a" }}>Live Order Status</div>
        </div>

        {/* SEARCH */}
        <div style={searchBox}>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Enter phone number"
            style={input}
          />
        </div>

        {loading && <div style={{ textAlign: "center" }}>Loading…</div>}

        {/* 🔁 ALL TOKENS FOR THIS PHONE */}
        {orders.map(o => (
          <div
            key={o.id}
            style={{
              ...card,
              borderLeft:
                o.status === "skipped"
                  ? "8px solid #ff7a00"
                  : "8px solid #ffd166"
            }}
          >
            <div style={tokenNumber}>TOKEN {o.token}</div>

            <div>Now Serving: <b>{current || "-"}</b></div>

            {/* SKIPPED INFO */}
            {o.status === "skipped" && (
              <p style={{ marginTop: 8 }}>
                ⚠ Your order was skipped.  
                Please go to the counter and wait.
              </p>
            )}

            {/* POSITION */}
            {positionMap[o.id] !== undefined && (
              <div style={{ marginTop: 8 }}>
                {positionMap[o.id] === 0
                  ? "You are next"
                  : `${positionMap[o.id]} people before you`}
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              Amount: ₹{Number(o.total || 0).toFixed(2)}
            </div>

            <button style={btn} onClick={() => setShowItems(o)}>
              View items
            </button>
          </div>
        ))}

        {!orders.length && !loading && (
          <div style={card}>
            <h3>No active orders</h3>
            <p>Please place an order from the menu</p>
          </div>
        )}

        <button style={btn} onClick={() => setShowInfo(true)}>
          How this works
        </button>

        <Link href="/">
          <button style={btn}>Back to Menu</button>
        </Link>

        <Footer />
      </div>

      {/* ITEMS MODAL */}
      {showItems && (
        <Modal onClose={() => setShowItems(null)}>
          {(showItems.items || []).map((i, idx) => (
            <div key={idx}>
              {i.quantity} × {i.name}
            </div>
          ))}
        </Modal>
      )}

      {/* INFO MODAL */}
      {showInfo && (
        <Modal onClose={() => setShowInfo(false)}>
          <p>• Tokens are served in order</p>
          <p>• If you miss your call, your order may be skipped</p>
          <p>• Skipped orders are handled by staff</p>
          <p>• Your turn is never cancelled</p>
        </Modal>
      )}
    </div>
  );
}

/* STYLES */
const page = { background: "#0b0b0b", minHeight: "100vh", color: "#f6e8c1", padding: 20 };
const urgentBg = { background: "#7a0000", animation: "pulse 1s infinite" };
const container = { maxWidth: 720, margin: "auto" };
const header = { textAlign: "center", marginBottom: 20 };
const searchBox = { background: "#111", padding: 16, borderRadius: 12 };
const input = { width: "100%", padding: 12, background: "#0c0c0c", color: "#fff", borderRadius: 8, border: "1px solid #222" };
const card = { marginTop: 20, background: "#111", padding: 20, borderRadius: 12, textAlign: "center" };
const tokenNumber = { fontSize: 44, fontWeight: 900, color: "#ffd166" };
const btn = { marginTop: 10, padding: "10px 14px", background: "#222", color: "#ffd166", border: "none", borderRadius: 8, fontWeight: 800 };

function Modal({ children, onClose }) {
  return (
    <div style={modalBg}>
      <div style={modal}>
        {children}
        <button style={btn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const modalBg = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" };
const modal = { background: "#111", padding: 20, borderRadius: 12, width: "90%", maxWidth: 400 };
