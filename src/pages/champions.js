import { useEffect, useState } from "react";
import axios from "axios";

export default function Champions() {
  const [list, setList] = useState([]);

  useEffect(()=>{
    axios.get("https://fanmap-production.up.railway.app/champions").then(r=>setList(r.data));
  },[]);

  return (
    <div style={{padding:20}}>
      <h2>Community Champions</h2>
      {list.map(u=>
        <div key={u._id}>
          User {u._id.slice(-4)} ✔ — Trust {u.trustScore.toFixed(1)}
        </div>
      )}
    </div>
  );
}
