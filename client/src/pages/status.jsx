// client/src/pages/status.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import {
  query, collection, where, orderBy, limit, getDocs,
  doc, getDoc, onSnapshot
} from "firebase/firestore";
import { Link, useLocation } from "wouter";

const styles = {
  page: { background: "#0b0b0b", color: "#f6e8c1", minHeight: "100vh", padding: 20, fontFamily: "'Segoe UI', Roboto, Arial, sans-serif" },
  container: { maxWidth: 720, margin: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title: { fontSize: 30, fontWeight: 800, color: "#ffd166" },
  inputRow: { background: "#111", padding: 14, borderRadius: 10, marginBottom: 18, border: "1px solid rgba(255,209,102,0.05)" },
  input: { width: "100%", padding: 12, borderRadius: 8, border: "1px solid #222", background: "#0c0c0c", color: "#fff", boxSizing: "border-box" },
  findBtn: { marginTop: 8, padding: "10px 14px", background: "#ffd166", color: "#111", border: "none", borderRadius: 8, fontWeight: 800 },
  ticket: {
    marginTop: 12,
    padding: 20,
    borderRadius: 12,
    background: "#111",
    borderLeft: "8px solid #ffd166",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 16,
    alignItems: "center"
  },
  bigToken: { fontSize: 40, fontWeight: 900, color: "#fff" },
  smallMuted: { color: "#bfb39a" },
  nowServing: { fontSize: 20, fontWeight: 800, color: "#ffd166" },
  actionRow: { display: "flex", gap: 10, marginTop: 18 },
  btn: { padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 800 },
  placeAnother: { background: "#222", color: "#ffd166" },
  refreshBtn: { background: "#ffd166", color: "#111" }
};

export default function TokenStatus() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const initialPhone = params.get("phone") || localStorage.getItem("myPhone") || "";
  const [phone, setPhone] = useState(initialPhone);
  const [session, setSession] = useState(null);

  const [orderInfo, setOrderInfo] = useState(null);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  // load active session
  useEffect(() => {
    async function loadSession() {
      try {
        const ref = doc(db, "settings", "activeSession");
        const snap = await getDoc(ref);
        if (snap.exists()) setSession(snap.data().session_id);
        else setSession("Session 1");
      } catch (err) {
        console.error("Failed to load session:", err);
        setSession("Session 1");
      }
    }
    loadSession();
  }, []);

  // fetch order for this phone & subscribe tokens doc
  async function fetchMyToken(p) {
    if (!p || !session) return;
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), where("phone", "==", String(p)), where("session_id", "==", session), orderBy("createdAt", "desc"), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) setOrderInfo(null);
      else setOrderInfo({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch (err) {
      console.error(err);
      setOrderInfo(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    fetchMyToken(phone);

    const tokenDoc = doc(db, "tokens", "session_" + session);
    const unsub = onSnapshot(tokenDoc, snap => {
      if (!snap.exists()) setCurrent(0);
      else setCurrent(snap.data().currentToken || 0);
    }, err => console.error(err));

    return () => unsub();
  }, [phone, session]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>My Token</div>
          <div style={styles.smallMuted}>Session: {session || "—"}</div>
        </div>

        <div style={styles.inputRow}>
          <input
            placeholder="Enter phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={styles.input}
          />
          <button style={styles.findBtn} onClick={() => { localStorage.setItem("myPhone", phone); fetchMyToken(phone); }}>
            Find
          </button>
        </div>

        {(!session || loading) && <div style={{ color: "#bfb39a" }}>Loading…</div>}

        {session && !loading && (
          <>
            <div style={styles.ticket}>
              <div>
                <div style={styles.nowServing}>Now Serving: #{current}</div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ color: "#bfb39a", fontSize: 14 }}>Token</div>
                  <div style={styles.bigToken}>{orderInfo ? (orderInfo.token ?? "Waiting") : "-"}</div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={styles.smallMuted}>Status</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>{orderInfo ? orderInfo.status : "-"}</div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={styles.smallMuted}>Position</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>
                    {orderInfo && orderInfo.token ? Math.max(0, orderInfo.token - current) : "-"}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#bfb39a", fontSize: 14 }}>Amount</div>
                <div style={{ fontSize: 24, color: "#ffd166", fontWeight: 900, marginTop: 6 }}>
                  {orderInfo ? `$${(orderInfo.total ?? 0).toFixed(2)}` : "-"}
                </div>

                <div style={{ marginTop: 24 }}>
                  <div style={styles.smallMuted}>Customer</div>
                  <div style={{ fontWeight: 800, marginTop: 6 }}>{orderInfo ? orderInfo.customerName : "-"}</div>

                  <div style={{ marginTop: 8, color: "#bfb39a" }}>{orderInfo ? `Phone: ${orderInfo.phone}` : ""}</div>
                </div>
              </div>
            </div>

            <div style={styles.actionRow}>
              <Link href="/">
                <button style={{ ...styles.btn, ...styles.placeAnother }}>Place Another Order</button>
              </Link>

              <button
                onClick={() => {
                  const ph = localStorage.getItem("myPhone");
                  if (ph) setLocation(`/mytoken?phone=${ph}`);
                }}
                style={{ ...styles.btn, ...styles.refreshBtn }}
              >
                Refresh My Status
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
