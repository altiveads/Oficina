// ═══════════════════════════════════════════════════════
// PartyKit Server — Oficina Virtual con Persistencia
// ═══════════════════════════════════════════════════════

export default {

  async onMessage(message, ws, room) {
    let data;
    try { data = JSON.parse(message); } catch { return; }

    switch (data.type) {

      // ── Registro / Login ──────────────────────────────
      case "auth": {
        const profiles = await room.storage.get("profiles") || {};
        const username = data.username.toLowerCase().trim();

        if (profiles[username]) {
          // Usuario existente — verifica PIN
          // Probe especial para saber si el usuario existe
          if (data.pin === "CHECK_ONLY_DO_NOT_AUTH") {
            ws.send(JSON.stringify({ type: "auth_error", message: "PIN incorrecto" }));
            return;
          }
          if (profiles[username].pin !== data.pin) {
            ws.send(JSON.stringify({ type: "auth_error", message: "PIN incorrecto" }));
            return;
          }
          // PIN correcto — devuelve perfil guardado
          ws.send(JSON.stringify({
            type: "auth_ok",
            profile: profiles[username],
            isNew: false
          }));
        } else {
          // Usuario nuevo
          if (data.pin === "CHECK_ONLY_DO_NOT_AUTH") {
            ws.send(JSON.stringify({ type: "user_not_found" }));
            return;
          }
          // Crea perfil
          const newProfile = {
            username,
            pin: data.pin,
            name: data.name || username,
            avatarIdx: data.avatarIdx || 0,
            color: data.color || "#41e096",
            status: "available",
            activity: "",
            createdAt: Date.now()
          };
          profiles[username] = newProfile;
          await room.storage.put("profiles", profiles);
          ws.send(JSON.stringify({
            type: "auth_ok",
            profile: newProfile,
            isNew: true
          }));
        }
        break;
      }

      // ── Actualizar perfil (avatar, color, activity, status) ──
      case "update_profile": {
        const profiles = await room.storage.get("profiles") || {};
        const username = ws.state?.username;
        if (!username || !profiles[username]) return;

        const allowed = ["name","avatarIdx","color","status","activity"];
        allowed.forEach(k => {
          if (data[k] !== undefined) profiles[username][k] = data[k];
        });
        await room.storage.put("profiles", profiles);

        // Actualiza estado en conexión activa
        ws.setState({ ...ws.state, ...data });
        break;
      }

      // ── Join al mundo (después de auth) ──────────────
      case "join": {
        const player = { ...data.player, id: ws.id };
        ws.setState(player);

        // Envía estado completo al nuevo jugador
        const players = {};
        for (const conn of room.getConnections()) {
          if (conn.id !== ws.id && conn.state?.username) {
            players[conn.id] = conn.state;
          }
        }
        const tasks   = await room.storage.get("tasks") || [];
        const chatLog = await room.storage.get("chat")  || [];

        ws.send(JSON.stringify({
          type: "init",
          players,
          tasks,
          chat: chatLog.slice(-60),
        }));

        // Anuncia llegada
        room.broadcast(
          JSON.stringify({ type: "player_join", player }),
          [ws.id]
        );
        break;
      }

      // ── Movimiento ────────────────────────────────────
      case "move": {
        const updated = {
          ...ws.state,
          x: data.x, y: data.y,
          zone: data.zone,
          activity: data.activity,
          status: data.status,
        };
        ws.setState(updated);

        // Persiste activity y status en el perfil
        if (ws.state?.username) {
          const profiles = await room.storage.get("profiles") || {};
          if (profiles[ws.state.username]) {
            profiles[ws.state.username].activity = data.activity;
            profiles[ws.state.username].status   = data.status;
            await room.storage.put("profiles", profiles);
          }
        }

        room.broadcast(
          JSON.stringify({ type: "player_move", id: ws.id, ...data }),
          [ws.id]
        );
        break;
      }

      // ── Tareas ────────────────────────────────────────
      case "task_add": {
        const tasks = await room.storage.get("tasks") || [];
        tasks.push(data.task);
        await room.storage.put("tasks", tasks);
        room.broadcast(JSON.stringify({ type: "task_add", task: data.task }), [ws.id]);
        break;
      }

      case "task_toggle": {
        const tasks = await room.storage.get("tasks") || [];
        const t = tasks.find(x => x.id === data.taskId);
        if (t) { t.done = data.done; t.doneBy = data.doneBy; t.doneAt = data.done ? Date.now() : null; }
        await room.storage.put("tasks", tasks);
        room.broadcast(
          JSON.stringify({ type: "task_toggle", taskId: data.taskId, done: data.done, doneBy: data.doneBy }),
          [ws.id]
        );
        break;
      }

      case "task_delete": {
        let tasks = await room.storage.get("tasks") || [];
        tasks = tasks.filter(x => x.id !== data.taskId);
        await room.storage.put("tasks", tasks);
        room.broadcast(JSON.stringify({ type: "task_delete", taskId: data.taskId }), [ws.id]);
        break;
      }

      // ── Chat ──────────────────────────────────────────
      case "chat": {
        const log = await room.storage.get("chat") || [];
        log.push(data.msg);
        if (log.length > 200) log.splice(0, log.length - 200);
        await room.storage.put("chat", log);
        room.broadcast(JSON.stringify({ type: "chat", msg: data.msg }), [ws.id]);
        break;
      }
    }
  },

  onClose(ws, room) {
    room.broadcast(JSON.stringify({ type: "player_leave", id: ws.id }));
  },

  onError(ws, error) {
    console.error("WS error:", error);
  },
};
