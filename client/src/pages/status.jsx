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
  helpBtn: { background: "#333", color: "#ffd166" },
  itemBtn: { marginTop: 10, background: "#333", color: "#ffd166" },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999
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
  const [showHelp, setShowHelp] = useState(false);

  /* -------- SAFE LOAD PHONE -------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setPhone(params.get("phone") || localStorage.getItem("myPhone") || "");
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

  /* -------- REALTIME ORDERS -------- */
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
        orderBy("token", "asc")
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

              {!skipped ? (
                <div style={{ marginTop: 6 }}>
                  Position: <b>{position}</b>
                </div>
              ) : (
                <div style={{ marginTop: 6 }}>⚠ Token skipped — go to counter</div>
              )}

              <div style={{ marginTop: 6 }}>
                Amount to Pay: <b>₹{o.total || 0}</b>
              </div>

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
          <button
            style={{ ...styles.btn, ...styles.helpBtn }}
            onClick={() => setShowHelp(true)}
          >
            Help
          </button>
        </div>

        <Footer />
      </div>

      {/* ITEMS MODAL */}
      {showItems && (
        <div style={styles.modalBackdrop} onClick={() => setShowItems(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Token {showItems.token}</h3>

            {(showItems.items || []).map((i, idx) => (
              <div key={idx} style={{ marginTop: 8 }}>
                {i.quantity} × {i.name}
              </div>
            ))}

            <div style={{ marginTop: 10, fontWeight: 800 }}>
              Total: ₹{showItems.total || 0}
            </div>

            <button
              style={{ ...styles.btn, ...styles.helpBtn, marginTop: 14 }}
              onClick={() => setShowItems(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* HELP MODAL */}
      {showHelp && (
        <div style={styles.modalBackdrop} onClick={() => setShowHelp(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>How this page works</h3>
            <p>• <b>Token</b>: Your order number</p>
            <p>• <b>Now Serving</b>: Current token at counter</p>
            <p>• <b>Position</b>: Tokens remaining before yours</p>
            <p>• <b>Skipped</b>: Please visit the counter</p>
            <p>• <b>Amount</b>: Amount to be paid at counter</p>

            <button
              style={{ ...styles.btn, ...styles.helpBtn, marginTop: 12 }}
              onClick={() => setShowHelp(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
