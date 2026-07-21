# Harness de agentes con GUI, hackeable como Pi

## Resumen

La mejor dirección para este proyecto es **Electron + TypeScript**, con una arquitectura de tres procesos:

1. **Renderer:** GUI web aislada.
2. **Electron main/preload:** ventanas, IPC y capacidades nativas mínimas.
3. **Agent host separado:** `utilityProcess` de Electron que usa el SDK de Pi detrás de una interfaz propia y carga extensiones.

No conviene construir el loop del agente desde cero ni hacer que la GUI dependa directamente de tipos internos de Pi. El producto debe ser un harness propio cuya primera implementación de `AgentEngine` adapte `@earendil-works/pi-coding-agent`.

## ¿Cómo está hecha Codex Desktop?

### Hechos comprobados

La aplicación Codex distribuida por OpenAI el 20 de julio de 2026 es **Electron**:

- Su `package.json` empaquetado se llama `openai-codex-electron`.
- Usa Electron `42.3.0`, Electron Forge `7.11.1`, el plugin Vite de Forge, Vite `8.1.3` y TypeScript `5.9.3`.
- El bundle contiene `Resources/app.asar`, procesos auxiliares `Codex (Renderer)` y `Codex (GPU)`, Chromium 150 y recursos típicos de Electron.
- Incluye un ejecutable separado `Resources/codex`.

La parte pública de Codex está escrita principalmente en Rust. `codex app-server` expone el agente a interfaces gráficas mediante JSON-RPC bidireccional. Su protocolo modela:

- **Thread:** conversación persistente.
- **Turn:** ejecución iniciada por una entrada del usuario.
- **Item:** mensaje, razonamiento, comando, cambio de archivo, llamada a herramienta, etc.

El servidor transmite deltas y eventos de ciclo de vida, y envía requests al cliente para aprobaciones. El cliente gráfico es responsable de presentar comandos/diffs y devolver decisiones. El transporte estable por defecto es JSONL sobre stdio; WebSocket figura como experimental.

### Lo que no es público

El repositorio `openai/codex` publica el app-server, el protocolo, schemas y el CLI, pero no publica el código fuente completo de la GUI Electron. La separación exacta dentro de la interfaz debe inferirse del bundle distribuido. No debemos copiar decisiones internas no documentadas ni depender de su protocolo experimental.

### Lección útil de Codex

La decisión valiosa no es solamente “usar Electron”. Es separar la aplicación gráfica del motor del agente mediante un protocolo explícito:

```text
Electron renderer
       │
  preload IPC
       │
Electron main
       │
 protocolo tipado
       │
agent host / app server
```

Así el motor puede reiniciarse, probarse sin GUI y reutilizarse desde otros clientes.

## ¿Por qué Electron para este proyecto?

### A favor

- Encaja naturalmente con TypeScript, React y extensiones JavaScript/TypeScript.
- El proceso main ofrece filesystem, subprocesses, PTY, ventanas, menús y actualizaciones.
- La GUI puede usar Monaco, terminales, diff viewers y el ecosistema web.
- Permite un extension host parecido al de VS Code sin introducir Rust como lenguaje obligatorio.
- Codex demuestra que el costo de Electron es aceptable para esta categoría de herramienta.

### En contra

- Bundle y memoria mayores por incluir Chromium y Node.
- Superficie de seguridad considerable.
- El runtime de Electron es Node + Chromium; **Bun no reemplaza ese runtime**.
- Requiere mantener Electron actualizado por vulnerabilidades de Chromium y Node.

### Runtime y toolchain

Usaremos Node y npm en desarrollo y CI. Electron integra Chromium/V8 y una versión concreta de Node; tanto el main process como el agent host ejecutarán ese runtime.

El agent host usará el Node embebido de Electron mediante `utilityProcess`. Esto evita distribuir dos runtimes y ejecuta Pi en su entorno oficialmente soportado (`node >=22.19.0`). Aunque el smoke test bajo Bun `1.3.14` fue positivo, adoptar npm elimina esa compatibilidad no garantizada y reduce diferencias entre desarrollo, CI y producción.

## Por qué no Electrobun como primera opción

Electrobun es la alternativa Bun-native más directa. Su main process sí corre sobre Bun y ofrece webviews nativas, RPC tipado, empaquetado y actualizaciones. En julio de 2026 tiene una release estable `1.18.1`, soporte oficial para macOS 14+, Windows 11+ y Ubuntu 22.04+, más de 12 000 estrellas y varias aplicaciones publicadas.

Es viable, pero todavía no tiene una madurez comparable con Electron. El proyecto comenzó en 2024, la gran mayoría de las contribuciones pertenecen a un solo mantenedor y su propio README advierte que no debe esperarse que issues o pull requests sean revisados. Para una aplicación parecida a un IDE, el ecosistema de Electron alrededor de terminales, editores, módulos nativos, debugging, testing y packaging reduce más riesgo que el menor tamaño de Electrobun. Se puede reconsiderar cuando tengamos métricas que demuestren que el peso de Electron es un problema real.

## Por qué no Tauri como primera opción

Tauri ofrece bundles menores, pero el requisito principal no es minimizar megabytes: es ejecutar extensiones TypeScript arbitrarias y hacer que la GUI sea hackeable. Con Tauri igualmente necesitaríamos un host JavaScript para Pi y las extensiones, sumando Rust, permisos de sidecar e IPC adicional. Tauri puede evaluarse más adelante si el tamaño domina, pero no simplifica el riesgo principal.

## Arquitectura propuesta

```text
apps/desktop/
  Electron main + preload
  renderer React

packages/protocol/
  comandos, eventos y schemas versionados

packages/agent-host/
  utilityProcess de Electron / Node
  AgentEngine
  PiEngineAdapter
  session service
  extension host
  permission service

packages/extension-api/
  API pública estable

packages/ui-extension-api/
  contribution points de GUI

extensions/
  extensiones first-party dogfooding
```

### 1. Renderer

El renderer solo recibe datos serializables. No accede directamente a Node, filesystem ni Pi. Responsabilidades:

- lista de workspaces y sesiones;
- transcript y streaming;
- tarjetas de herramientas, terminal y diffs;
- selector de modelo/thinking;
- cola de mensajes, cancelación y approvals;
- vistas aportadas por extensiones.

### 2. Main y preload

- crea y administra ventanas;
- inicia, supervisa y reinicia el agent host;
- expone al renderer una API angosta mediante `contextBridge`;
- valida todos los mensajes IPC;
- no contiene lógica del agente.

Configuración mínima de seguridad: `nodeIntegration: false`, `contextIsolation: true`, sandbox del renderer, CSP estricta y contenido local empaquetado.

### 3. Agent host

Es el núcleo hackeable. Vive fuera del renderer para que una extensión o el agente no bloquee la interfaz.

La interfaz propia evita acoplar todo el producto a Pi:

```ts
interface AgentEngine {
  createSession(input: CreateSessionInput): Promise<SessionHandle>;
  resumeSession(id: string): Promise<SessionHandle>;
  listSessions(workspace: string): Promise<SessionSummary[]>;
  listModels(): Promise<ModelSummary[]>;
}

interface SessionHandle {
  prompt(input: PromptInput): Promise<void>;
  steer(input: PromptInput): Promise<void>;
  followUp(input: PromptInput): Promise<void>;
  abort(): Promise<void>;
  subscribe(listener: (event: AgentEvent) => void): () => void;
  dispose(): Promise<void>;
}
```

`PiEngineAdapter` traduce los eventos de `AgentSession` al protocolo estable de la aplicación. Las extensiones y la GUI nunca importan tipos de Pi.

### 4. Persistencia

Para el MVP se reutiliza `SessionManager` y el JSONL en árbol de Pi. La aplicación mantiene índices/vistas derivadas, no una segunda verdad del transcript. Antes de cambiar el formato, se debe demostrar una necesidad que el árbol append-only de Pi no cubra.

## Hackabilidad: el requisito principal

Pi es hackeable porque su núcleo es pequeño y ofrece herramientas, eventos, recursos y paquetes. La GUI debe llevar ese principio más lejos con contribution points de backend y frontend.

### Manifest

Cada extensión declara recursos sin ejecutarse durante el descubrimiento:

```json
{
  "name": "git-worktrees",
  "version": "1.0.0",
  "engines": { "harness": "^0.1.0" },
  "activationEvents": ["onCommand:worktree.create"],
  "main": "./dist/extension.js",
  "ui": "./dist/ui.js",
  "contributes": {
    "commands": [],
    "tools": [],
    "views": [],
    "menus": [],
    "keybindings": [],
    "toolRenderers": []
  }
}
```

El manifest permite listar, deshabilitar y validar contribuciones antes de ejecutar código. La activación lazy evita cargar todas las extensiones al inicio.

### API del extension host

Contribution points iniciales:

- lifecycle hooks y event bus;
- comandos;
- herramientas para el modelo;
- providers/modelos;
- skills, prompts y archivos de contexto;
- permission policies;
- renderers para llamadas/resultados de herramientas;
- paneles laterales, status items, menús y keybindings;
- storage global, por workspace y por sesión;
- tareas/background services con cleanup explícito.

### Extensiones backend y UI

- `main` corre en el agent host y puede tener acceso completo al sistema, como una extensión de Pi.
- `ui` corre en el renderer y registra componentes en slots definidos; recibe una API, no acceso directo al host.
- Las extensiones son código confiable. Las extensiones de proyecto requieren aprobación del workspace.
- Una futura galería puede añadir firma, provenance y permisos declarativos, pero el MVP no debe fingir un sandbox de seguridad que no existe.

### Compatibilidad con Pi

Compatibilidad directa desde el inicio:

- `AGENTS.md`/`CLAUDE.md`;
- Agent Skills (`SKILL.md`);
- modelos y credenciales mediante el adaptador Pi;
- sesiones Pi mientras se use `SessionManager`;
- prompts y recursos de proyecto.

Las extensiones Pi no serán compatibles automáticamente: varias dependen de componentes TUI y de `ctx.ui.custom()`, que no tienen equivalencia web. Se puede crear después una capa de compatibilidad para herramientas, comandos y eventos no visuales. No debe ser un requisito del MVP.

## Protocolo interno

Usar mensajes discriminados y versionados, validados en ambos extremos. Clases principales de eventos:

- `session.created`, `session.replaced`, `session.closed`;
- `agent.started`, `agent.settled`, `agent.failed`;
- `message.started`, `message.delta`, `message.completed`;
- `tool.started`, `tool.updated`, `tool.completed`;
- `approval.requested`, `approval.resolved`;
- `queue.updated`;
- `models.updated`;
- `extensions.updated`.

El protocolo del renderer no debe exponer el objeto parcial completo en cada token. Debe enviar deltas pequeños y snapshots en límites claros para evitar exceso de IPC y renders.

## Primer tracer bullet

El primer incremento debe demostrar toda la arquitectura, no construir todas las pantallas:

1. Electron abre un workspace.
2. Main inicia el agent host.
3. El host crea una sesión Pi persistente.
4. Renderer envía un prompt.
5. Se muestra texto en streaming.
6. Se muestra una llamada a `read` o `bash` y su resultado.
7. Escape/cancel aborta la ejecución.
8. Al reiniciar la app, la sesión reaparece.
9. Una extensión local registra un comando y una tarjeta de herramienta personalizada.
10. Modificar la extensión y recargarla no requiere recompilar el core.

Ese slice valida Electron, IPC, Pi, persistencia y hackabilidad de extremo a extremo.

## Riesgos que conviene prototipar primero

1. Compatibilidad entre la versión de Node incluida por Electron y el mínimo requerido por Pi.
2. Hot reload y cleanup de extensiones sin filtrar listeners o subprocesses.
3. Rendimiento del transcript con tool outputs grandes.
4. Reinicio del agent host sin perder la sesión ni dejar procesos hijos.
5. Modelo de seguridad para extensiones de proyecto.
6. Distribución y firma de Electron en macOS, Linux y Windows.

## Fuentes primarias

### Pi

- [Pi SDK](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/sdk.md)
- [Pi RPC mode](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/rpc.md)
- [Pi extensions](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)
- [Pi session format](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/session-format.md)
- [Pi packages](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/packages.md)

### Codex

- [Codex app-server](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
- [Codex app-server protocol schemas](https://github.com/openai/codex/tree/main/codex-rs/app-server-protocol)
- [Instalador oficial y URLs del desktop app](https://github.com/openai/codex/blob/main/codex-rs/cli/src/desktop_app/mac.rs)
- [Appcast oficial de Codex Desktop](https://persistent.oaistatic.com/codex-app-prod/appcast.xml)
- [Paquete oficial inspeccionado](https://persistent.oaistatic.com/codex-app-prod/ChatGPT-darwin-arm64-26.715.52143.zip)

### Arquitectura GUI extensible

- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron utility process](https://www.electronjs.org/docs/latest/api/utility-process)
- [Electrobun](https://github.com/blackboardsh/electrobun)
- [VS Code extension host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- [VS Code contribution points](https://code.visualstudio.com/api/references/contribution-points)
- [Eclipse Theia architecture](https://theia-ide.org/docs/architecture/)
- [Eclipse Theia extensions and plugins](https://theia-ide.org/docs/extensions/)
