const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET","POST"],
  credentials: true
}));

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const PinSchema = new mongoose.Schema({
  title: String,
  lat: Number,
  lng: Number,
  community: String,

  day: String,
  startTime: String,
  endTime: String,
  displayTime: String,

  link: String,
  linkTitle: String,
  reason: String,
  anonymous: Boolean,

  recurring: Boolean,
  hostUser: String,

  recurringDay: String
});
const Pin = mongoose.model("Pin", PinSchema);

const UserSchema = new mongoose.Schema({
  phone: String,
  otp: String,
  name: String,
  trustScore: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  shadowBanned: { type:Boolean, default:false },
  badges: [String],


  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);

const JoinSchema = new mongoose.Schema({
  pinId: String,
  user: String,
  anonymous: Boolean
});
const Join = mongoose.model("Join", JoinSchema);

const ChatSchema = new mongoose.Schema({
  pinId: String,
  user: String,
  message: String,
  anonymous: Boolean,
  time: { type: Date, default: Date.now }
});
const Chat = mongoose.model("Chat", ChatSchema);

const ReportSchema = new mongoose.Schema({
  targetUser: String,
  reporter: String,
  reason: String,
  time: { type: Date, default: Date.now }
});
const Report = mongoose.model("Report", ReportSchema);

const FollowSchema = new mongoose.Schema({
  follower: String,
  following: String
});
const Follow = mongoose.model("Follow", FollowSchema);

const leoProfanity = require("leo-profanity");


app.post("/follow", async (req,res)=>{
  await Follow.create(req.body);
  res.json({success:true});
});

app.get("/follow/:id", async (req,res)=>{
  const count = await Follow.countDocuments({following:req.params.id});
  res.json({count});
});


app.get("/pins", async (req, res) => res.json(await Pin.find()));
app.post("/pins", async (req, res) => { await new Pin(req.body).save(); res.json({success:true}); });

app.post("/join", async (req, res) => { await Join.create(req.body); res.json({success:true}); });
app.get("/join/:pinId", async (req, res) => res.json({count: await Join.countDocuments({pinId:req.params.pinId})}));


app.get("/chat/:pinId", async (req,res)=>{
  const banned = await User.find({shadowBanned:true}).select("_id");
  const bannedIds = banned.map(x=>x._id.toString());
  const chats = await Chat.find({
    pinId:req.params.pinId,
    user: {$nin:bannedIds}
  }).sort({time:1});
  res.json(chats);
});

app.post("/chat", async (req, res) => {
  if(leoProfanity.check(req.body.message)){
    await Report.create({
      targetUser: req.body.user,
      reporter: "AI",
      reason: "Profanity / Toxicity"
    });
  }
  await new Chat(req.body).save();
  res.json({success:true});
});

app.get("/heat", async (req, res) => {
  const pins = await Pin.find();
  const joins = await Join.find();
  res.json(pins.map(p => ({
    lat: p.lat,
    lng: p.lng,
    weight: joins.filter(j => j.pinId === p._id.toString()).length + 1
  })));
});

app.post("/auth/start", async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(100000 + Math.random()*900000).toString();
  await User.updateOne({ phone }, { phone, otp }, { upsert: true });
  console.log("OTP:", otp); // (Later we connect SMS)
  res.json({ success: true });
});

app.post("/auth/verify", async (req, res) => {
  const { phone, otp } = req.body;
  const user = await User.findOne({ phone, otp });
  if (!user) return res.status(401).json({ error: "Invalid OTP" });
  res.json({ userId: user._id });
});


app.post("/admin/verify/:userId", async (req,res) => {
  await User.findByIdAndUpdate(req.params.userId, { verified:true });
  res.json({ success:true });
});

app.get("/user/:id", async (req,res)=>{
  const u = await User.findById(req.params.id);
  res.json(u);
});

app.get("/user/:id/history", async (req,res)=>{
  const hosted = await Pin.find({ user:req.params.id });
  const joined = await Join.find({ user:req.params.id });
  res.json({ hosted, joined });
});

app.get("/leaderboard", async (req,res)=>{
  const hosts = await Pin.aggregate([
    { $group: { _id: "$hostUser", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  res.json(hosts);
});

app.get("/champions", async (req,res)=>{
  const champs = await User.find().sort({trustScore:-1}).limit(10);
  res.json(champs);
});


const FeedbackSchema = new mongoose.Schema({
  pinId: String,
  userId: String,
  rating: Number, // 1–5
  comment: String
});
const Feedback = mongoose.model("Feedback", FeedbackSchema);

app.post("/feedback", async (req, res) => {
  await Feedback.create(req.body);
  res.json({ success: true });
});

app.post("/trust/recalc/:userId", async (req, res) => {
  const fbs = await Feedback.find({ userId: req.params.userId });
  const avg = fbs.reduce((s,f)=>s+f.rating,0) / (fbs.length||1);
  await User.findByIdAndUpdate(req.params.userId, { trustScore: avg });
  res.json({ trustScore: avg });
});

app.post("/report", async (req,res)=>{
  await Report.create(req.body);
  res.json({success:true});
});

/* 🔔 REMINDER ENGINE */
cron.schedule("*/30 * * * *", async () => {
  const now = new Date();
  const pins = await Pin.find();

  pins.forEach(p => {
    if (p.displayTime && p.displayTime.toLowerCase().includes("today")) {
      console.log("🔔 Reminder:", p.title);
    }
  });
});

/*Code for Autoban*/
cron.schedule("*/10 * * * *", async ()=>{
  const users = await User.find();
  for(const u of users){
    const count = await Report.countDocuments({targetUser:u._id.toString()});
    if(count >= 5){
      await User.findByIdAndUpdate(u._id, {shadowBanned:true});
    }
  }
});

/*Autodecay*/
cron.schedule("0 0 * * *", async ()=>{
  const users = await User.find();
  for(const u of users){
    let newScore = u.trustScore - 0.1;
    if(newScore < 0) newScore = 0;
    await User.findByIdAndUpdate(u._id, {trustScore:newScore});
  }
});

/***Reward Logic******/
cron.schedule("0 */6 * * *", async ()=>{
  const users = await User.find();
  for(const u of users){
    const hosted = await Pin.countDocuments({hostUser:u._id.toString()});
    if(hosted >= 5 && !u.badges.includes("Organizer")) {
      await User.findByIdAndUpdate(u._id, {$push:{badges:"Organizer"}});
    }
  }
});

app.listen(5000, "0.0.0.0", () => console.log("Backend running on port 5000"));
