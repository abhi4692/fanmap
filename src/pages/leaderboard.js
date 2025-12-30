import { useEffect, useState } from "react";
import axios from "axios";

export default function Leaderboard() {
  const [list, setList] = useState([]);

  useEffect(()=>{
    axios.get("http://127.0.0.1:5000/leaderboard").then(r=>setList(r.data));
  },[]);

  return (
    <div style={{padding:20}}>
      <h2>Top Organizers</h2>
      {list.map((u,i)=>
        <div key={u._id}>
          #{i+1} User {u._id?.slice(-4)} — {u.count} meetups
        </div>
      )}
    </div>
  );
}
