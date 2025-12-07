import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

export default function ApprovedOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const session = new Date().toISOString().slice(0, 10);

  async function fetchApproved() {
    setLoading(true);

    const q = query(
      collection(db, "orders"),
      where("status", "==", "approved"),
      where("session_id", "==", session),
      orderBy("token", "asc") // Sort by token
    );

    const snap = await getDocs(q);
    setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));

    setLoading(false);
  }

  useEffect(() => {
    fetchApproved();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Approved Orders (To Prepare)</h1>

      {loading && <div>Loading...</div>}

      {!loading && orders.length === 0 && (
        <div>No approved orders yet.</div>
      )}

      {!loading && orders.map(order => (
        <div key={order.id} style={{
          border: "1px solid #ccc",
          padding: 10,
          marginBottom: 10,
          borderRadius: 6
        }}>
          <h3>Token #{order.token}</h3>

          <div><b>Name:</b> {order.customerName}</div>
          <div><b>Phone:</b> {order.phone}</div>

          <div style={{ marginTop: 6 }}>
            <b>Items:</b>
            <ul>
              {(order.items || []).map((i, idx) => (
                <li key={idx}>{i.quantity}× {i.name}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
