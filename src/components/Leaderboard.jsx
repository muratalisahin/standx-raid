import React, { useEffect, useMemo, useState } from "react";
import Stander from "./Stander.jsx";
import { fetchBoard } from "../lib/session.js";
import { useLang } from "../lib/Lang.jsx";

export default function Leaderboard({ user, gameScore = 0, playing = false }) {
  const { t } = useLang();
  const [board, setBoard] = useState({ top: [], users: 0 });
  const [fail, setFail] = useState("");

  const players = useMemo(() => {
    const top = [...(board.top || [])];
    if (user?.name && !top.some((r) => r.name.toLowerCase() === user.name.toLowerCase())) {
      top.push({ name: user.name, score: Number(gameScore) || 0, at: Date.now() });
    }
    top.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.at || 0) - (a.at || 0));
    return top.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [board.top, user?.name, gameScore]);

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      try {
        const j = await fetchBoard();
        if (!stop && j?.board) {
          setBoard(j.board);
          setFail("");
        }
      } catch {
        if (!stop) setFail("fail");
      }
    };
    pull();
    const id = setInterval(pull, 4000);
    window.addEventListener("standx-board", pull);
    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener("standx-board", pull);
    };
  }, []);

  return (
    <section className="board">
      <div className="boardHead">
        <strong>{t.board}</strong>
        <span>
          @{user?.name || "—"}
          {playing ? ` · ${gameScore} ${t.pts}` : ""}
          {" · "}
          {Math.max(board.users, players.length)} {t.players}
        </span>
      </div>
      {fail && <p className="boardYou authErr">{t.boardFail}</p>}
      <div className="boardBody">
      <ol className="boardList">
        {players.length === 0 && <li className="empty">{t.emptyBoard}</li>}
        {players.map((r) => (
          <li key={`${r.rank}-${r.name}`}>
            <div className={`run ${r.name === user?.name ? "on" : ""}`}>
              <em>{r.rank}</em>
              <b>@{r.name}</b>
              <strong>{r.score} {t.pts}</strong>
            </div>
          </li>
        ))}
      </ol>
      <Stander cycle className="boardMascot" alt="Stander" />
      </div>
    </section>
  );
}
