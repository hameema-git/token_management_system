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
  const [activeOrder, setActiveOrder] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  /* 🔴 LIVE CURRENT TOKEN */
  useEffect(() => {
    let unsub = null;

    async function listenCurrentToken() {
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

    listenCurrentToken();
    return () => unsub && unsub();
  }, []);

  /* 🔍 LOAD ONLY LATEST ORDER FOR THIS PHONE (FIXED) */
  useEffect(() => {
    if (!phone) return;

    setLoading(true);
    localStorage.setItem("myPhone", phone);

    let unsub = null;

    async function listenLatestOrder() {
      const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
      const session = sessionSnap.exists()
        ? sessionSnap.data().session_id
        : "Session 1";

      const q = query(
        collection(db, "orders"),
        where("phone", "==", phone),
        where("session_id", "==", session),
        orderBy("createdAt", "desc")
      );

      unsub = onSnapshot(q, snap => {
        if (!snap.docs.length) {
          setActiveOrder(null);
          setCompleted(false);
          setLoading(false);
          return;
        }

        const latest = snap.docs[0].data();

        if (latest.status === "completed") {
          setActiveOrder(null);
          setCompleted(true);
        } else {
          setActiveOrder(latest);
          setCompleted(false);
        }

        setLoading(false);
      });
    }

    listenLatestOrder();
    return () => unsub && unsub();
  }, [phone]);

  /* 📍 POSITION CALCULATION (FAIR & STABLE) */
  useEffect(() => {
    if (!activeOrder?.queueOrder) {
      setPosition(null);
      return;
    }

    async function calcPosition() {
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

      const ahead = snap.docs
        .map(d => d.data())
        .filter(o => o.queueOrder < activeOrder.queueOrder);

      setPosition(ahead.length);
    }

    calcPosition();
  }, [activeOrder]);

  const isSkipped = activeOrder?.status === "skipped";
  const isImmediate =
    activeOrder &&
    (activeOrder.status === "called" ||
      activeOrder.status === "serving");

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

        {/* ⚠️ SKIPPED */}
        {activeOrder && isSkipped && (
          <div style={{ ...card, borderLeft: "8px solid #ff7a00" }}>
            <h3>Your token was skipped</h3>
            <p>
              Please go to the staff counter and wait.
              <br />
              You will be served in the next available turn.
            </p>
            {position !== null && (
              <p>Current position: <b>{position}</b></p>
            )}
          </div>
        )}

        {/* 🎟️ ACTIVE TOKEN */}
        {activeOrder &&
          ["approved", "paid", "called", "serving"].includes(
            activeOrder.status
          ) && (
            <div style={card}>
              <div style={tokenNumber}>
                TOKEN {activeOrder.token}
              </div>

              <div>Now Serving: <b>{current || "-"}</b></div>

              {position === 0 && (
                <div style={{ marginTop: 10 }}>
                  <b>You’re next. Please come near the counter.</b>
                </div>
              )}

              {position > 0 && (
                <div style={{ marginTop: 10 }}>
                  {position} people before you
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                Amount: ₹{Number(activeOrder.total || 0).toFixed(2)}
              </div>

              <button style={btn} onClick={() => setShowItems(true)}>
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
        <Modal onClose={() => setShowItems(false)}>
          {(activeOrder?.items || []).map((i, idx) => (
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
