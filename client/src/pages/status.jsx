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
import Footer from "../components/Footer";

const styles = {
  page: {
    background: "#0b0b0b",
    color: "#f6e8c1",
    minHeight: "100vh",
    padding: 20
  },
  container: { maxWidth: 720, margin: "auto" },

  header: { marginBottom: 20, textAlign: "center" },
  logo: { fontSize: 26, fontWeight: 900, color: "#ffd166" },
  subtitle: { color: "#bfb39a", fontSize: 13 },

  inputRow: {
    background: "#111",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #222",
    background: "#0c0c0c",
    color: "#fff",
    fontSize: 16
  },
  findBtn: {
    marginTop: 10,
    width: "100%",
    padding: 12,
    background: "#ffd166",
    color: "#111",
    border: "none",
    borderRadius: 10,
    fontWeight: 900,
    fontSize: 15
  },

  card: {
    marginTop: 16,
    padding: 22,
    borderRadius: 14,
    background: "#111",
    borderLeft: "8px solid #ffd166",
    textAlign: "center"
  },

  token: {
    fontSize: 64,
    fontWeight: 900,
    color: "#ffd166"
  },

  badgePaid: { color: "#2ecc71", fontWeight: 800 },
  badgeUnpaid: { color: "#ffb86b", fontWeight: 800 },

  infoBtn: {
    marginTop: 14,
    background: "#222",
    color: "#ffd166",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700
  },

  infoBox: {
    marginTop: 14,
    padding: 14,
    background: "#0f0f0f",
    borderRadius: 10,
    textAlign: "left",
    fontSize: 13,
    color: "#ccc"
  }
};

export default function TokenStatus() {
  const [phone, setPhone] = useState(localStorage.getItem("myPhone") || "");
  const [current, setCurrent] = useState(0);
  const [activeOrder, setActiveOrder] = useState(null);
  const [position, setPosition] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ---- listen current token ---- */
  useEffect(() => {
    async function listenToken() {
      const snap = await getDoc(doc(db, "settings", "activeSession"));
      const session = snap.exists() ? snap.data().session_id : "Session 1";

      return onSnapshot(doc(db, "tokens", "session_" + session), s => {
        if (s.exists()) setCurrent(s.data().currentToken || 0);
      });
    }
    listenToken();
  }, []);

  /* ---- load order ---- */
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

    const active = orders.find(o => o.status !== "completed") || null;
    setActiveOrder(active);
    setLoading(false);
  }

  /* ---- correct position calculation ---- */
  useEffect(() => {
    if (!activeOrder || !activeOrder.token || !current) {
      setPosition(null);
      return;
    }

    async function calc() {
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

    calc();
  }, [activeOrder, current]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo}>🍫 Waffle Lounge</div>
          <div style={styles.subtitle}>Live Order & Token Status</div>
        </div>

        <div style={styles.inputRow}>
          <input
            placeholder="Enter your phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={styles.input}
          />
          <button onClick={loadOrder} style={styles.findBtn}>
            Track My Order
          </button>
        </div>

        {loading && <div style={{ textAlign: "center" }}>Loading…</div>}

        {/* Waiting for approval */}
        {activeOrder && !activeOrder.token && (
          <div style={styles.card}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>⏳ Waiting for approval</div>
            <div style={{ marginTop: 8 }}>
              Payment:{" "}
              <span style={activeOrder.paid ? styles.badgePaid : styles.badgeUnpaid}>
                {activeOrder.paid ? "PAID" : "UNPAID"}
              </span>
            </div>
          </div>
        )}

        {/* Active token */}
        {activeOrder && activeOrder.token && (
          <div style={styles.card}>
            <div style={styles.token}>TOKEN {activeOrder.token}</div>

            <div style={{ marginTop: 8 }}>
              Now Serving: <b>{current || "-"}</b>
            </div>

            {Number.isFinite(position) && (
              <div style={{ marginTop: 6 }}>
                {position === 0
                  ? "🎉 You’re next!"
                  : `👥 ${position} people before you`}
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              Payment:{" "}
              <span style={activeOrder.paid ? styles.badgePaid : styles.badgeUnpaid}>
                {activeOrder.paid ? "PAID" : "UNPAID"}
              </span>
            </div>

            <button
              style={styles.infoBtn}
              onClick={() => setShowInfo(v => !v)}
            >
              ℹ️ How this works
            </button>

            {showInfo && (
              <div style={styles.infoBox}>
                • Please be near the counter when your token is close<br />
                • If a customer is not present, staff may continue serving others<br />
                • Skipped tokens are served once the customer returns<br />
                • Service continues after the current order is completed
              </div>
            )}
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}

