import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

export default function Profile() {
  const { id } = useRouter().query;
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState(null);
  const [followers, setFollowers] = useState(0);

  useEffect(()=>{
    if(!id) return;
    axios.get(`https://fanmap-production.up.railway.app/user/${id}`).then(r=>setUser(r.data));
    axios.get(`https://fanmap-production.up.railway.app/user/${id}/history`).then(r=>setHistory(r.data));
    axios.get(`https://fanmap-production.up.railway.app/follow/${id}`).then(r=>setFollowers(r.data.count));
  },[id]);

  const follow = async () => {
    await axios.post("https://fanmap-production.up.railway.app/follow", {
      follower: localStorage.getItem("userId"),
      following: id
    });
    const r = await axios.get(`https://fanmap-production.up.railway.app/follow/${id}`);
    setFollowers(r.data.count);
  };

  if(!user || !history) return <p>Loading...</p>;

  return (
    <div style={{padding:20}}>
      <h2>User {id.slice(-4)} {user.verified && "✔"}</h2>
      <p>Trust Score: {user.trustScore.toFixed(1)}</p>

      {user.badges?.length > 0 && (
        <p>Badges: {user.badges.join(" • ")}</p>
      )}

      <button onClick={follow}>Follow</button>
      <p>{followers} followers</p>

      <h3>Hosted Meetups</h3>
      {history.hosted.map(p=> <div key={p._id}>{p.title}</div>)}

      <h3>Joined Meetups</h3>
      {history.joined.map(j=> <div key={j._id}>{j.pinId}</div>)}
    </div>
  );
}
