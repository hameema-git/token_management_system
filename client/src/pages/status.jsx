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
  const [showInfo, setShowInfo] = useState(false);
  const [showItems, setShowItems] = useState(false);

  /* 🔴 LIVE CURRENT TOKEN */
  useEffect(() => {
    async function listenToken() {
      const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
      const session = sessionSnap.exists()
        ? sessionSnap.data().session_id
        : "Session 1";

      return onSnapshot(doc(db, "tokens", "session_" + session), snap => {
        if (snap.exists()) setCurrent(snap.data().currentToken || 0);
      });
    }
    listenToken();
  }, []);

  /* 🔍 LOAD ORDER */
  async function loadOrder() {
    if (!phone) return;
    setLoading(true);

    localStorage.setItem("myPhone", phone);

    const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
    const session = sessionSnap.exists()
      ? sessionSnap.data().session_id
      : "Session 1";

    const q = query(
      collection(db, "orders"),
      where("phone", "==", phone),
      where("session_id", "==", session),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!orders.length) {
      setActiveOrder(null);
      setCompleted(false);
      setLoading(false);
      return;
    }

    const completedOrders = orders.filter(o => o.status === "completed");
    if (completedOrders.length === orders.length) {
      setCompleted(true);
      setActiveOrder(null);
      setLoading(false);
      return;
    }

    const active = orders
      .filter(o => o.status !== "completed")
      .sort((a, b) => (a.token || 999) - (b.token || 999))[0];

    setActiveOrder(active);
    setCompleted(false);
    setLoading(false);
  }

  /* 📍 POSITION CALCULATION (CORRECT LOGIC) */
  useEffect(() => {
    if (!activeOrder?.token || !current) {
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
        where("status", "in", ["approved", "paid"])
      );

      const snap = await getDocs(q);

      const ahead = snap.docs
        .map(d => d.data())
        .filter(o => o.token > current && o.token < activeOrder.token);

      setPosition(ahead.length);
    }

    calcPosition();
  }, [activeOrder, current]);

  return (
    <div style={{ background: "#0b0b0b", minHeight: "100vh", color: "#f6e8c1", padding: 20 }}>
      <div style={{ maxWidth: 720, margin: "auto" }}>

        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src="/logo.png" alt="Shop Logo" style={{ height: 50 }} />
          <h2 style={{ color: "#ffd166", marginTop: 8 }}>Waffle Lounge</h2>
          <div style={{ color: "#bfb39a" }}>Live Order Status</div>
        </div>

        {/* SEARCH */}
        <div style={{ background: "#111", padding: 16, borderRadius: 12 }}>
          <input
            placeholder="Enter phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #222",
              background: "#0c0c0c",
              color: "#fff"
            }}
          />
          <button
            onClick={loadOrder}
            style={{
              marginTop: 10,
              width: "100%",
              padding: 12,
              background: "#ffd166",
              border: "none",
              borderRadius: 8,
              fontWeight: 800
            }}
          >
            Find My Order
          </button>
        </div>

        {loading && <div style={{ textAlign: "center", marginTop: 20 }}>Loading…</div>}

        {/* WAITING FOR APPROVAL */}
        {activeOrder && activeOrder.status === "pending" && (
          <div style={cardStyle}>
            <h2>⏳ Waiting for Approval</h2>
            <p>Your order is being reviewed by staff</p>
            <p>Payment: <b>{activeOrder.paid ? "PAID" : "UNPAID"}</b></p>
          </div>
        )}

        {/* TOKEN CARD */}
        {activeOrder?.token && (
          <div style={cardStyle}>
            <div style={{ fontSize: 60, fontWeight: 900, color: "#ffd166" }}>
              TOKEN {activeOrder.token}
            </div>

            <div style={{ marginTop: 10 }}>
              Now Serving: <b>{current || "-"}</b>
            </div>

            {position === 0 && (
              <div style={{ marginTop: 10, fontSize: 18 }}>
                🎉 <b>You’re next! Please come near the counter</b>
              </div>
            )}

            {position > 0 && (
              <div style={{ marginTop: 10 }}>
                👥 <b>{position}</b> people before you
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              Amount: ₹{Number(activeOrder.total || 0).toFixed(2)}
            </div>

            <div style={{ marginTop: 6 }}>
              Payment: <b>{activeOrder.paid ? "PAID ✅" : "UNPAID ⚠️"}</b>
            </div>

            <button onClick={() => setShowItems(true)} style={smallBtn}>
              View Ordered Items
            </button>

            <button onClick={() => setShowInfo(true)} style={infoBtn}>
              ⓘ How this works
            </button>
          </div>
        )}

        {/* COMPLETED */}
        {completed && (
          <div style={{ ...cardStyle, borderLeft: "8px solid #2ecc71" }}>
            <h2>✅ Order Completed</h2>
            <p>Please collect your order at the counter</p>
          </div>
        )}

        <Link href="/">
          <button style={{ marginTop: 20, ...smallBtn }}>⬅ Back to Menu</button>
        </Link>

        <Footer />
      </div>

      {/* INFO MODAL */}
      {showInfo && (
        <Modal onClose={() => setShowInfo(false)} title="Order Info">
          <ul>
            <li>Tokens are served in order</li>
            <li>Skipped tokens do not affect your position</li>
            <li>If skipped, please wait near the counter</li>
            <li>Position may change slightly in live situations</li>
          </ul>
        </Modal>
      )}

      {/* ITEMS MODAL */}
      {showItems && (
        <Modal onClose={() => setShowItems(false)} title="Your Order">
          {(activeOrder.items || []).map((i, idx) => (
            <div key={idx}>
              {i.quantity} × {i.name}
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}

/* STYLES */
const cardStyle = {
  marginTop: 20,
  background: "#111",
  padding: 20,
  borderRadius: 12,
  borderLeft: "8px solid #ffd166",
  textAlign: "center"
};

const smallBtn = {
  marginTop: 12,
  padding: "10px 14px",
  background: "#222",
  color: "#ffd166",
  border: "none",
  borderRadius: 8,
  fontWeight: 800
};

const infoBtn = {
  ...smallBtn,
  background: "#333"
};

/* MODAL */
function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999
    }}>
      <div style={{ background: "#111", padding: 20, borderRadius: 12, width: "90%", maxWidth: 400 }}>
        <h3 style={{ color: "#ffd166" }}>{title}</h3>
        {children}
        <button onClick={onClose} style={smallBtn}>Close</button>
      </div>
    </div>
  );
}


