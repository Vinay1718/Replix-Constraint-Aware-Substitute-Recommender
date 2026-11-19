import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));
  mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    autoIndex: !env.isProduction,
  });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
};
export const disconnectDB = () => mongoose.disconnect();
export const isDBConnected = () => mongoose.connection.readyState === 1;
