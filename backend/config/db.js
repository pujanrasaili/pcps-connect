const mongoose = require("mongoose");
const dns = require("dns");

// Some networks (certain routers, ISPs, campus wifi, VPNs, some antivirus
// software) block or mishandle the DNS "SRV" record lookup that
// "mongodb+srv://" connection strings rely on -- this shows up as
// "querySrv ECONNREFUSED ..." even when the connection string itself is
// correct. Pointing Node's own DNS resolver at Google's public DNS (used
// only for this process, not a system-wide change) sidesteps that
// completely, without needing to touch Windows network settings.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected:", mongoose.connection.host);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
