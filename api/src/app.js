require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "API funcionando"
  });
});


// Middleware 404 

module.exports = app;

const errorMiddleware = require("./middlewares/errorMiddleware");

app.use(errorMiddleware);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Rota não encontrada"
  });
});