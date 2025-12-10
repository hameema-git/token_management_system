import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import {
  query,
  collection,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  onSnapshot
} from "firebase/firestore";
import { Link, useLocation } from "wouter";
import "../styles.css";

export default function TokenStatus() {
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const initialPhone = params.get("phone") || localStorage.getItem("myPhone") || "";

  const [phone, setPhone] = useState(initialPhone);
  const [session, setSession] = useState(null);

  const [orderInfo, setOrderInfo] = useState(null);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load active session
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

  async function fetchMyToken(p) {
    if (!p || !session) return setOrderInfo(null);

    setLoading(true);

    const q = query(
      collection(db, "orders"),
      where("phone", "==", String(p)),
      where("session_id", "==", session),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const snap = await getDocs(q);

    setOrderInfo(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
    setLoading(false);
  }

  useEffect(() => {
    if (!session) return;

    fetchMyToken(phone);

    const tokenDoc = doc(db, "tokens", "session_" + session);

    const unsub = onSnapshot(tokenDoc, snap => {
      setCurrent(snap.exists() ? snap.data().currentToken || 0 : 0);
    });

    return () => unsub();
  }, [phone, session]);

  return (
    <div className="container">
      <h1 style={{ color: "#ffcc66" }}>My Token</h1>

      <div className="card">
        <input
          className="input"
          placeholder="Enter phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />

        <button className="button" style={{ marginTop: 10 }}
          onClick={() => {
            localStorage.setItem("myPhone", phone);
            fetchMyToken(phone);
          }}
        >
          Find
        </button>
      </div>

      {loading && <div>Loading…</div>}

      {orderInfo && (
        <div className="token-box">
          <h2>Now Serving</h2>
          <div className="token-number">#{current}</div>

          <h2 style={{ marginTop: 20 }}>Your Token</h2>
          <div className="token-number">
            {orderInfo.token ?? "Waiting…"}
          </div>

          <p>Status: {orderInfo.status}</p>

          <p style={{ marginTop: 10 }}>
            <b>Total Amount:</b> ${orderInfo.total.toFixed(2)}
          </p>

          {orderInfo.token && (
            <p>
              <b>People Ahead:</b> {Math.max(0, orderInfo.token - current)}
            </p>
          )}
        </div>
      )}

      <Link href="/">
        <button className="button" style={{ width: "100%", marginTop: 20 }}>
          Place Another Order
        </button>
      </Link>
    </div>
  );
}
