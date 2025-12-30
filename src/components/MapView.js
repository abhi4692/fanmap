import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapView({ pins }) {
  const mapContainer = useRef(null);

  useEffect(() => {

    
    window.joinPin = async function(pinId) {
      const anon = confirm("Join anonymously?");
      const userId = localStorage.getItem("userId");

      await axios.post("http://127.0.0.1:5000/join", {
        pinId,
        user: anon ? "Anonymous" : userId,
        anonymous: anon
      });

      const res = await axios.get(`http://127.0.0.1:5000/join/${pinId}`);
      const el = document.getElementById(`count-${pinId}`);
      if (el) el.innerText = res.data.count + " going";
    };


    window.sendMsg = async function(pinId) {
      const input = document.getElementById(`msg-${pinId}`);
      if (!input.value) return;

      const anon = confirm("Send anonymously?");
      const userId = localStorage.getItem("userId");

      await axios.post("http://127.0.0.1:5000/chat", {
        pinId,
        user: anon ? "Anonymous" : userId,
        message: input.value,
        anonymous: anon
      });

      input.value = "";
      loadChat(pinId);
    };

    window.reportUser = async function(targetUser, reason){
      const reporter = localStorage.getItem("userId");
      if(!targetUser || !reason) return;

      await axios.post("http://127.0.0.1:5000/report", {
        targetUser,
        reporter,
        reason
      });
      alert("Reported.");
    };


    window.loadChat = async function(pinId) {
      const res = await axios.get(`http://127.0.0.1:5000/chat/${pinId}`);
      const box = document.getElementById(`chat-${pinId}`);
      if (!box) return;

      box.innerHTML = res.data.map(c => {
        if (c.anonymous) return `<div><b>Anonymous:</b> ${c.message}</div>`;
        return `<div><b><a href="/user/${c.user}" target="_blank">User ${c.user.slice(-4)}</a></b>: ${c.message}</div>`;
      }).join("");

      // 🔐 Fetch verified badge
      res.data.forEach(c => {
        if (!c.anonymous) {
          axios.get(`http://127.0.0.1:5000/user/${c.user}`).then(r => {
            if (r.data.verified) {
              const el = document.getElementById(`user-${c.user}`);
              if (el) el.innerText += " ✔";
            }
          });
        }
      });
    };

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [77.5946, 12.9716],
      zoom: 12,
    });

    map.on("load", () => {
      axios.get("http://127.0.0.1:5000/heat").then(res => {
        map.addSource("heat", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: res.data.map(p => ({
              type: "Feature",
              properties: { weight: p.weight },
              geometry: {
                type: "Point",
                coordinates: [p.lng, p.lat]
              }
            }))
          }
        });

        map.addLayer({
          id: "heatmap",
          type: "heatmap",
          source: "heat",
          paint: {
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": 1,
            "heatmap-radius": 40,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,255,0)",
              0.2, "blue",
              0.5, "orange",
              0.8, "red"
            ]
          }
        });
      });
    });

    pins.forEach((pin) => {
      new mapboxgl.Marker()
        .setLngLat([pin.lng, pin.lat])
        .setPopup(
          new mapboxgl.Popup()
            .setHTML(`
              <h4>${pin.title}</h4>
              <p>${pin.displayTime}</p>
              ${pin.link ? `<a href="${pin.link}" target="_blank">${pin.linkTitle || "Open Link"}</a>` : ""}
              ${pin.reason ? `<p><i>${pin.reason}</i></p>` : ""}
              <button onclick="joinPin('${pin._id}')">Join</button>
              <div id="count-${pin._id}">Tap Join</div>
              <div id="chat-${pin._id}" style="max-height:150px;overflow:auto;border:1px solid #ccc;margin:5px"></div>
              <input id="msg-${pin._id}" placeholder="Type message..." />
              <button onclick="sendMsg('${pin._id}')">Send</button>
              <button onclick="reportUser(prompt('User ID to report'), prompt('Reason?'))">Report User</button>
              <a href="/meet/${pin._id}" target="_blank">Share Meetup</a>
            `)
            .on("open", () => loadChat(pin._id))
        )
        .addTo(map);
    });

    // DOUBLE CLICK TO CREATE MEETUP
    map.on("dblclick", async (e) => {
      const anon = confirm("Post anonymously?");
      const title = prompt("Meetup title?");
      if (!title) return;

      const day = prompt("Which day? (Ex: Sunday)");
      if (!day) return;

      const startTime = prompt("Start time (24h format, Ex: 18:00)");
      if (!startTime) return;

      const endTime = prompt("End time (24h format, Ex: 20:00)");
      if (!endTime) return;

      const start = new Date(`2024-01-01T${startTime}`);
      const end = new Date(`2024-01-01T${endTime}`);
      const diff = (end - start) / 3600000;
      const duration = diff > 0 ? `${diff}h` : "";

      const displayTime = `${day} ${startTime} – ${endTime} (${duration})`;

      const recurring = confirm("Repeat weekly?");
      let recurringDay = "";
      if (recurring) recurringDay = day;

      const link = prompt("Paste related link (optional)");
      let linkTitle = "";
      if (link) linkTitle = prompt("What should this link be called?");
      const reason = prompt("Why should people meet? (optional)");

      await axios.post("http://127.0.0.1:5000/pins", {
        title,
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
        community: "indianAnimeFans",

        day,
        startTime,
        endTime,
        displayTime,

        recurring,
        recurringDay,

        link,
        linkTitle,
        reason,
        anonymous: anon,

        hostUser: localStorage.getItem("userId")   // 👈 THIS LINE
      });


      window.location.reload();
    });

    return () => map.remove();
  }, [pins]);

  return <div ref={mapContainer} style={{ height: "100vh" }} />;
}
