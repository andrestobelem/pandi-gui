---
status: accepted
---

# Usar Electron y su runtime Node para la aplicación de escritorio

Construiremos la primera versión como una aplicación de escritorio con Electron, TypeScript, React, Vite y Electron Forge. Node y npm serán el runtime y el toolchain: el proceso main y un `utilityProcess` separado para el agent/extension host correrán sobre el Node embebido de Electron. El host accederá a Pi mediante un adaptador propio para que la GUI y las extensiones no dependan de sus tipos internos.

## Alternativas consideradas

- **Electrobun:** ya ofrece un main process en Bun, RPC tipado, actualizaciones y soporte oficial para macOS, Windows y Ubuntu. Se descarta para el núcleo inicial porque es mucho más joven, su mantenimiento está muy concentrado en una persona y su ecosistema de APIs nativas, tooling, testing y extensiones todavía no tiene la madurez de Electron.
- **Tauri:** reduce el tamaño del bundle, pero añade Rust y seguiría necesitando un host JavaScript para Pi y las extensiones TypeScript.
- **Aplicación web local:** simplifica la distribución durante desarrollo, pero dificulta terminales, filesystem, procesos, ventanas y extensiones locales, que son capacidades centrales del producto.

## Consecuencias

- No habrá un sidecar Bun ni otro runtime JavaScript en producción; usamos el entorno oficialmente soportado por Pi y el mismo ecosistema en desarrollo y CI.
- El toolchain queda fijado inicialmente en Node 22.23.1 y npm 12.0.1: satisface el mínimo de Pi y evita una terminación prematura observada al empaquetar con Forge 7 bajo Node 24. El runtime productivo sigue siendo el Node embebido por Electron.
- El renderer permanecerá aislado con `nodeIntegration: false`, `contextIsolation: true` y una API preload mínima y validada.
- El main process solo administrará ventanas, lifecycle e IPC. El agent/extension host vivirá en `utilityProcess` para poder reiniciarse y fallar sin bloquear la GUI.
- Los paquetes de dominio y protocolo no dependerán de Electron para conservar la opción de otros clientes en el futuro.
- Se aceptan el mayor tamaño y consumo de Electron a cambio de madurez, compatibilidad y un ecosistema adecuado para un harness extensible.
