import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

export default function MeetPage() {
  const router = useRouter();
  const { id } = router.query;
  const [pin, setPin] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!id) return;

    axios.get("https://fanmap-production.up.railway.app/pins").then(res => {
      const p = res.data.find(x => x._id === id);
      setPin(p);
    });

    axios.get(`https://fanmap-production.up.railway.app/join/${id}`)
      .then(res => setCount(res.data.count));
  }, [id]);

  const join = async () => {
    await axios.post("https://fanmap-production.up.railway.app/join", {
      pinId: id,
      user: "guest"
    });
    const res = await axios.get(`https://fanmap-production.up.railway.app/join/${id}`);
    setCount(res.data.count);
  };

  if (!pin) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>{pin.title}</h2>
      <p>{pin.displayTime}</p>

      {pin.link && (
        <a href={pin.link} target="_blank">
          {pin.linkTitle || "Open Link"}
        </a>
      )}

      {pin.reason && <p><i>{pin.reason}</i></p>}

      <br />

      <button onClick={join}>Join</button>
      <p>{count} going</p>

      <br />

      <a
        href={`https://wa.me/?text=${encodeURIComponent(
          `This is happening: ${pin.title}\n${window.location.href}`
        )}`}
        target="_blank"
      >
        Share on WhatsApp
      </a>

      <br />

      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`}
        target="_blank"
      >
        Get Directions
      </a>

      <br /><br />

      <button onClick={() => router.push("/")}>Open Map</button>
    </div>
  );
}
