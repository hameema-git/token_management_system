// client/src/pages/status.jsx
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
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ---------------- LISTEN CURRENT TOKEN ---------------- */
  useEffect(() => {
    async function listenToken() {
      const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
      const session = sessionSnap.exists()
        ? sessionSnap.data().session_id
        : "Session 1";

      return onSnapshot(
        doc(db, "tokens", "session_" + session),
        (snap) => {
          if (snap.exists()) setCurrent(snap.data().currentToken || 0);
        }
      );
    }
    listenToken();
  }, []);

  /* ---------------- LOAD ORDER ---------------- */
  async function loadOrder() {
    if (!phone) return;
    setLoading(true);

    const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
    const session = sessionSnap.exists()
      ? sessionSnap.data().session_id
      : "Session 1";

    const q = query(
      collection(db, "orders"),
      where("phone", "==", String(phone)),
      where("session_id", "==", session),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!orders.length) {
      setActiveOrder(null);
      setPosition(null);
      setLoading(false);
      return;
    }

    const active = orders
      .filter(o => o.status !== "completed")
      .sort((a, b) => (a.token || 999) - (b.token || 999))[0];

    setActiveOrder(active);
    setLoading(false);
  }

  /* ---------------- CALCULATE POSITION (FIXED) ---------------- */
  useEffect(() => {
    if (!activeOrder || !activeOrder.token || !current) {
      setPosition(null);
      return;
    }

    async function calculatePosition() {
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
        .filter(o =>
          o.token &&
          o.token > current &&
          o.token < activeOrder.token
        );

      setPosition(ahead.length);
    }

    calculatePosition();
  }, [activeOrder, current]);

  function handleFind() {
    localStorage.setItem("myPhone", phone);
    loadOrder();
  }

  /* ---------------- UI TEXT HELPERS ---------------- */
  const waitText =
    position === 0
      ? "🎉 You're next!"
      : position === 1
      ? "Just 1 person before you 😊"
      : `${position} people before you`;

  const approxWait =
    position != null ? `${position * 3}–${position * 5} mins` : null;

  return (
    <div style={{ background: "#0b0b0b", color: "#f6e8c1", minHeight: "100vh", padding: 20 }}>
      <div style={{ maxWidth: 720, margin: "auto" }}>

        <h2 style={{ color: "#ffd166" }}>Order Status</h2>
        <p style={{ color: "#bfb39a" }}>Track your token in real time</p>

        <input
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 8, marginTop: 10 }}
        />

        <button onClick={handleFind} style={{ marginTop: 10, padding: 10 }}>
          Find My Order
        </button>

        {loading && <p>Loading…</p>}

        {/* NOT APPROVED */}
        {activeOrder && !activeOrder.token && (
          <div style={{ marginTop: 20 }}>
            <h3>⏳ Waiting for approval</h3>
            <p>Your order is being prepared for the queue.</p>
            <p>
              Payment:{" "}
              <b>{activeOrder.paid ? "PAID ✅" : "UNPAID ⚠️"}</b>
            </p>
          </div>
        )}

        {/* ACTIVE TOKEN */}
        {activeOrder && activeOrder.token && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: "#ffd166" }}>
              TOKEN {activeOrder.token}
            </div>

            <p>Now Serving: <b>{current || "-"}</b></p>

            {position != null && (
              <>
                <p style={{ fontSize: 18 }}>{waitText}</p>
                <p style={{ color: "#bfb39a" }}>
                  ⏱️ Approx wait time: {approxWait}
                </p>
              </>
            )}

            <p>
              Payment Status:{" "}
              <b>{activeOrder.paid ? "PAID ✅" : "UNPAID ⚠️"}</b>
            </p>
          </div>
        )}

        {/* FRIENDLY NOTE */}
        <div style={{ marginTop: 30, fontSize: 13, color: "#bfb39a" }}>
          <p><b>Please note:</b></p>
          <ul>
            <li>If your token is skipped, please come to the counter when called.</li>
            <li>Skipped tokens are served after the current order completes.</li>
            <li>Being nearby helps us serve you faster 😊</li>
          </ul>
        </div>

        <div style={{ marginTop: 30 }}>
          <Link href="/">
            <button>Back to Menu</button>
          </Link>
        </div>

        <Footer />
      </div>
    </div>
  );
}
