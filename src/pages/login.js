import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState(1);
  const router = useRouter();

  const sendOtp = async () => {
    await axios.post("https://fanmap-production.up.railway.app/auth/start", { phone });
    setStage(2);
    alert("OTP sent (check backend console for now)");
  };

  const verifyOtp = async () => {
    const res = await axios.post("https://fanmap-production.up.railway.app/auth/verify", { phone, otp });
    localStorage.setItem("userId", res.data.userId);
    router.push("/");
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Login</h2>

      {stage === 1 && (
        <>
          <input placeholder="Phone number" value={phone}
            onChange={e => setPhone(e.target.value)} />
          <button onClick={sendOtp}>Send OTP</button>
        </>
      )}

      {stage === 2 && (
        <>
          <input placeholder="OTP" value={otp}
            onChange={e => setOtp(e.target.value)} />
          <button onClick={verifyOtp}>Verify OTP</button>
        </>
      )}
    </div>
  );
}
