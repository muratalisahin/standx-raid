import { handleBoard } from "../server/http.js";

export default async function handler(req, res) {
  await handleBoard(req, res);
}
