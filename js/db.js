const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/taskInsight";

  try {
    await mongoose.connect(uri);
    console.log(`MongoDB conectado: ${mongoose.connection.host}`);
  } catch (err) {
    console.error("Falha ao conectar ao MongoDB:", err.message);
    process.exit(1);
  }

  // Eventos de conexão
  mongoose.connection.on("disconnected", () =>
    console.warn("MongoDB desconectado. Tentando reconectar...")
  );
  mongoose.connection.on("reconnected", () =>
    console.log("MongoDB reconectado.")
  );
}

module.exports = connectDB;