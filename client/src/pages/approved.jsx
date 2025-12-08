import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import { collection, getDocs } from "firebase/firestore";

export default function ApprovedOrders() {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  // ⭐ Load current session from localStorage
  const currentSession = localStorage.getItem("session") || "Session 1";

  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);

      // Fetch all orders
      const snap = await getDocs(collection(db, "orders"));

      // Filter: Approved + Current session
      const approved = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(o => o.status === "approved" && o.session_id === currentSession)
        .sort((a, b) => (a.token || 0) - (b.token || 0));

      setOrders(approved);
      setFiltered(approved);
      setLoading(false);
    }

    loadOrders();
  }, []);

  // ⭐ SEARCH FUNCTION
  function handleSearch(text) {
    setSearch(text);

    const s = text.toLowerCase();

    const result = orders.filter(o =>
      (o.customerName || "").toLowerCase().includes(s) ||
      (o.phone || "").includes(s) ||
      String(o.token).includes(s)
    );

    setFiltered(result);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Approved Orders — {currentSession}</h1>

      {/* ⭐ SEARCH BAR */}
      <input
        value={search}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search by name, phone, or token"
        style={{
          padding: 8,
          width: "100%",
          marginBottom: 15,
          fontSize: 16
        }}
      />

      {loading && <p>Loading...</p>}
      {!loading && filtered.length === 0 && <p>No approved orders yet.</p>}

      {!loading &&
        filtered.map(order => (
          <div
            key={order.id}
            style={{
              border: "1px solid #ccc",
              padding: 10,
              marginBottom: 10,
              borderRadius: 6
            }}
          >
            <h3>Token #{order.token ?? "-"}</h3>
            <p><b>Name:</b> {order.customerName}</p>
            <p><b>Phone:</b> {order.phone}</p>

            <b>Items:</b>
            <ul>
              {(order.items || []).map((i, idx) => (
                <li key={idx}>{i.quantity}× {i.name}</li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
