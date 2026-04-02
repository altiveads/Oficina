// ═══════════════════════════════════════════════════════
// PartyKit Server — Oficina Virtual
// Deploy: npx partykit deploy
// Docs:   https://docs.partykit.io
// ═══════════════════════════════════════════════════════

export default {
  // Called when a new client connects
  onConnect(ws, room) {
    ws.setState({ connected: true });
  },

  // Called when a message arrives from a client
  async onMessage(message, ws, room) {
    let data;
    try { data = JSON.parse(message); } catch { return; }

    switch (data.type) {

      // ── Player joins ──────────────────────────────────
      case "join": {
        const player = { ...data.player, id: ws.id };
        ws.setState(player);

        // Send existing world state to the new player
        const players = {};
        for (const conn of room.getConnections()) {
          if (conn.id !== ws.id && conn.state?.name) {
            players[conn.id] = conn.state;
          }
        }
        const tasks    = await room.storage.get("tasks")    || [];
        const chatLog  = await room.storage.get("chat")     || [];

        ws.send(JSON.stringify({
          type: "init",
          players,
          tasks,
          chat: chatLog.slice(-60),
        }));

        // Announce arrival to everyone else
        room.broadcast(
          JSON.stringify({ type: "player_join", player }),
          [ws.id]
        );
        break;
      }

      // ── Player moves / updates state ──────────────────
      case "move": {
        const updated = {
          ...ws.state,
          x: data.x,
          y: data.y,
          zone: data.zone,
          activity: data.activity,
          status: data.status,
        };
        ws.setState(updated);
        room.broadcast(
          JSON.stringify({ type: "player_move", id: ws.id, ...data }),
          [ws.id]
        );
        break;
      }

      // ── Task: add ─────────────────────────────────────
      case "task_add": {
        const tasks = await room.storage.get("tasks") || [];
        tasks.push(data.task);
        await room.storage.put("tasks", tasks);
        room.broadcast(
          JSON.stringify({ type: "task_add", task: data.task }),
          [ws.id]
        );
        break;
      }

      // ── Task: toggle done ─────────────────────────────
      case "task_toggle": {
        const tasks = await room.storage.get("tasks") || [];
        const t = tasks.find(x => x.id === data.taskId);
        if (t) { t.done = data.done; t.doneBy = data.doneBy; }
        await room.storage.put("tasks", tasks);
        room.broadcast(
          JSON.stringify({ type: "task_toggle", taskId: data.taskId, done: data.done, doneBy: data.doneBy }),
          [ws.id]
        );
        break;
      }

      // ── Task: delete ──────────────────────────────────
      case "task_delete": {
        let tasks = await room.storage.get("tasks") || [];
        tasks = tasks.filter(x => x.id !== data.taskId);
        await room.storage.put("tasks", tasks);
        room.broadcast(
          JSON.stringify({ type: "task_delete", taskId: data.taskId }),
          [ws.id]
        );
        break;
      }

      // ── Chat message ──────────────────────────────────
      case "chat": {
        const log = await room.storage.get("chat") || [];
        log.push(data.msg);
        // Keep last 200 messages
        if (log.length > 200) log.splice(0, log.length - 200);
        await room.storage.put("chat", log);

        // For "nearby" messages, broadcast to everyone and let the client filter
        room.broadcast(
          JSON.stringify({ type: "chat", msg: data.msg }),
          [ws.id]
        );
        break;
      }
    }
  },

  // Called when a client disconnects
  onClose(ws, room) {
    room.broadcast(
      JSON.stringify({ type: "player_leave", id: ws.id })
    );
  },

  onError(ws, error) {
    console.error("WS error:", error);
  },
};
