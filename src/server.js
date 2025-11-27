require("dotenv").config();
const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/user");
const contestRoutes = require("./routes/contest");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", userRoutes);
app.use("/contests", contestRoutes);

app.get("/", (req, res) => {
    res.json({ message: "Contest System Running 🚀" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on port " + port));
