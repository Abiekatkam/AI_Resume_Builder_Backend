import dotenv from "dotenv";
import app from "./app.js";

dotenv.config({ path: "./.env" });

const startServer = async () => {
  try {
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log(`App is listening on port: ${port}`);
    });

    app.on("error", (error) => {
      console.error("Error:", error);
      throw error;
    });
  } catch (error) {
    console.error("MongoDB connection failed", error);
  }
};

startServer();
