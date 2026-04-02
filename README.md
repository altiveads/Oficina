# 🏢 Oficina Virtual — Guía de Despliegue

## Stack
- **Frontend**: HTML5 Canvas + JS vanilla (sin dependencias)
- **Realtime**: PartyKit (WebSockets serverless, gratis)
- **Deploy**: Vercel / Netlify / GitHub Pages

---

## 🚀 Paso a paso

### 1. Cuenta PartyKit (gratis)
```bash
npx partykit login
# Usa GitHub para autenticarte
```

### 2. Despliega el servidor WebSocket
```bash
npx partykit deploy
# → Output: https://virtual-office.TU-USUARIO.partykit.dev
```

### 3. Actualiza la URL en index.html
```js
// Línea ~30 de index.html:
const WS_URL = "wss://virtual-office.TU-USUARIO.partykit.dev/party/main";
```

### 4. Despliega el frontend
**Vercel** (recomendado):
```bash
npx vercel --prod
```

**Netlify** — arrastra la carpeta a netlify.com/drop

**GitHub Pages** — sube y activa Pages en Settings

---

## 🎮 Controles
| Tecla | Acción |
|-------|--------|
| WASD / ↑↓←→ | Mover avatar |
| Enter (campo actividad) | Guardar "qué estoy haciendo" |
| Enter (chat) | Enviar mensaje |
| Click en avatar | Menú de acciones |

---

## ✨ Funcionalidades completas

### Mapa
- Pixel art 960×768 con tiles 32×32
- 4 zonas decoradas: Escritorio (monitores, sillas), Creativo (pizarras, tablets), Llamadas (mesa redonda), Descanso (sofá, TV, snacks)
- Detección automática de zona → estado del avatar
- Cámara suave que sigue al avatar
- Mini-mapa con todos los jugadores y viewport

### Avatares
- 10 estilos de personaje dibujados en canvas (pixel art)
- 8 colores de jugador
- Nombre + estado de zona + actividad visible
- Badge de tareas pendientes sobre el avatar
- Burbuja de chat que aparece al enviar mensajes
- Indicador de estado (disponible/ocupado/break/no molestar)

### Sistema de estados
- 🟢 Disponible
- 🎧 Ocupado
- 🥗 En break
- ⛔ No molestar
- Estado de zona (automático al entrar en área)

### "Qué estoy haciendo"
- Campo en topbar, se actualiza con Enter
- Visible sobre el avatar en tiempo real para todos

### Tareas
- Checklist público y compartido
- Asignar tareas a cualquier miembro del equipo
- Tabs: Todas / Mías / Pendientes / Listas ✓
- Badge de tareas pendientes sobre cada avatar
- Quién creó y quién completó cada tarea
- Persisten entre sesiones (PartyKit Storage)

### Chat
- Mensajes a Todos o Cercanos (proximity chat)
- Burbuja sobre el avatar al enviar
- Historial persistente (últimos 200 mensajes)
- Notificación cuando llegan mensajes sin el panel abierto

### Social
- Menú contextual al clickear un avatar
  - Enviar mensaje directo
  - Asignar tarea
  - Localizar en mapa (línea punteada)
- Búsqueda de personas en sidebar
- Toast de entrada/salida de compañeros

---

## 📁 Estructura
```
virtual-office/
├── index.html       ← Todo el frontend
├── party/
│   └── server.js    ← Servidor PartyKit (WebSocket + Storage)
├── partykit.json    ← Config PartyKit
└── README.md
```
