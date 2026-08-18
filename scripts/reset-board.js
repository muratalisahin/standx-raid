import { resetScores } from "../server/accounts.js";

const wipeUsers = process.argv.includes("--users");
const out = await resetScores({ wipeUsers });
console.log(
  wipeUsers
    ? "Board reset from zero: names and scores cleared."
    : `Leaderboard cleared: ${out.cleared} runs removed, ${out.users} users kept.`
);
