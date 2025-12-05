import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // ✅ Env variable se lo
  headers: {
    "Content-Type": "application/json",
  },
});
