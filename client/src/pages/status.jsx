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
  const [activeOrders, setActiveOrders] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [positionMap, setPositionMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [showItems, setShowItems] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  /* 🔴 LIVE CURRENT TOKEN */
  useEffect(() => {
    let unsub = null;

    async function listenToken() {
      const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
      const session = sessionSnap.exists()
        ? sessionSnap.data().session_id
        : "Session 1";

      unsub = onSnapshot(
        doc(db, "tokens", "session_" + session),
        snap => {
          if (snap.exists()) {
            setCurrent(snap.data().currentToken || 0);
          }
        }
      );
    }

    listenToken();
    return () => unsub && unsub();
  }, []);

  /* 🔍 LOAD ALL ORDERS FOR PHONE (LIVE) */
  useEffect(() => {
    if (!phone) return;

    setLoading(true);
    localStorage.setItem("myPhone", phone);

    let unsub = null;

    async function listenOrders() {
      const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
      const session = sessionSnap.exists()
        ? sessionSnap.data().session_id
        : "Session 1";

      const q = query(
        collection(db, "orders"),
        where("phone", "==", phone),
        where("session_id", "==", session),
        orderBy("queueOrder", "asc")
      );

      unsub = onSnapshot(q, snap => {
        const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const nonCompleted = orders.filter(o => o.status !== "completed");

        if (!nonCompleted.length) {
          setActiveOrders([]);
          setCompleted(true);
          setLoading(false);
          return;
        }

        setActiveOrders(nonCompleted);
        setCompleted(false);
        setLoading(false);
      });
    }

    listenOrders();
    return () => unsub && unsub();
  }, [phone]);

  /* 📍 POSITION CALCULATION FOR ALL ACTIVE ORDERS */
  useEffect(() => {
    async function calcPositions() {
      if (!activeOrders.length) {
        setPositionMap({});
        return;
      }

      const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
      const session = sessionSnap.exists()
        ? sessionSnap.data().session_id
        : "Session 1";

      const q = query(
        collection(db, "orders"),
        where("session_id", "==", session),
        where("status", "!=", "completed")
      );

      const snap = await getDocs(q);
      const allActive = snap.docs.map(d => d.data());

      const map = {};
      activeOrders.forEach(order => {
        map[order.id] = allActive.filter(
          o => o.queueOrder < order.queueOrder
        ).length;
      });

      setPositionMap(map);
    }

    calcPositions();
  }, [activeOrders]);

  /* 🎯 CURRENT SERVING ORDER (FIRST NON-SKIPPED) */
  const currentOrder = activeOrders.find(
    o => o.status !== "skipped"
  );

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
            placeholder="Enter phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={input}
          />
        </div>

        {loading && <div style={{ textAlign: "center" }}>Loading…</div>}

        {/* ⚠️ SKIPPED TOKENS */}
        {activeOrders
          .filter(o => o.status === "skipped")
          .map(o => (
            <div
              key={o.id}
              style={{ ...card, borderLeft: "8px solid #ff7a00" }}
            >
              <h3>Token {o.token} was skipped</h3>
              <p>
                Please go to the staff counter and wait.
                <br />
                You will be served in the next available turn.
              </p>
              <div>
                Current position:{" "}
                <b>{positionMap[o.id]}</b>
              </div>
            </div>
          ))}

        {/* 🎟️ ACTIVE / CURRENT TOKEN */}
        {currentOrder && (
          <div style={card}>
            <div style={tokenNumber}>
              TOKEN {currentOrder.token}
            </div>

            <div>
              Now Serving: <b>{current || "-"}</b>
            </div>

            {positionMap[currentOrder.id] === 0 && (
              <div style={{ marginTop: 10 }}>
                <b>You’re next. Please come near the counter.</b>
              </div>
            )}

            {positionMap[currentOrder.id] > 0 && (
              <div style={{ marginTop: 10 }}>
                {positionMap[currentOrder.id]} people before you
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              Amount: ₹{Number(currentOrder.total || 0).toFixed(2)}
            </div>

            <button
              style={btn}
              onClick={() => setShowItems(currentOrder)}
            >
              View ordered items
            </button>
          </div>
        )}

        {/* ✅ COMPLETED */}
        {completed && (
          <div style={{ ...card, borderLeft: "8px solid #2ecc71" }}>
            <h3>Order completed</h3>
            <p>Please collect your order at the counter</p>
          </div>
        )}

        {/* ℹ️ INFO */}
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
          <p>• If you miss your call, your token may be skipped</p>
          <p>• Skipped tokens are served manually by staff</p>
          <p>• Your turn is never cancelled</p>
        </Modal>
      )}
    </div>
  );
}

/* STYLES */
const page = {
  background: "#0b0b0b",
  minHeight: "100vh",
  color: "#f6e8c1",
  padding: 20
};
const urgentBg = {
  background: "#7a0000",
  animation: "pulse 1s infinite"
};
const container = { maxWidth: 720, margin: "auto" };
const header = { textAlign: "center", marginBottom: 20 };
const searchBox = { background: "#111", padding: 16, borderRadius: 12 };
const input = {
  width: "100%",
  padding: 12,
  background: "#0c0c0c",
  color: "#fff",
  borderRadius: 8,
  border: "1px solid #222"
};
const card = {
  marginTop: 20,
  background: "#111",
  padding: 20,
  borderRadius: 12,
  borderLeft: "8px solid #ffd166",
  textAlign: "center"
};
const tokenNumber = {
  fontSize: 60,
  fontWeight: 900,
  color: "#ffd166"
};
const btn = {
  marginTop: 12,
  padding: "10px 14px",
  background: "#222",
  color: "#ffd166",
  border: "none",
  borderRadius: 8,
  fontWeight: 800
};

function Modal({ children, onClose }) {
  return (
    <div style={modalBg}>
      <div style={modal}>
        {children}
        <button style={btn} onClick={onClose}>
          Close
        </button>
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
