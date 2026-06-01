const app = require("../api/src/app");

const connectDB = require("../api/src/config/db");

connectDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});