import { useEffect, useState } from "react";
import axios from "axios";
import MapView from "../components/MapView";
import { useRouter } from "next/router";

export default function Home() {
  const [pins, setPins] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("userId");
    if (!user) {
      router.push("/login");
      return;
    }

    axios.get("https://fanmap-production.up.railway.app/pins")
      .then(res => setPins(res.data));
  }, []);

  return <MapView pins={pins} />;
}
