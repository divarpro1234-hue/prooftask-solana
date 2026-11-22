# ProofTask — Gestor de Proyectos y Tareas Verificables en Solana

## Proyecto final — Advanced Bootcamp

**Ruta:** Proyecto propio

**Aplicación:** ProofTask

ProofTask permite crear proyectos y gestionar tareas mediante
cuentas PDA en Solana. Las tareas pueden iniciarse, completarse
con una referencia de evidencia HTTPS y cerrarse cuando cumplen
las condiciones del programa.

### Enlaces de la entrega

- Demo: https://darling-tapioca-cbf53e.netlify.app/
- Repositorio: https://github.com/divarpro1234-hue/prooftask-solana
- Red: Solana Devnet
- Program ID: 71xiWbM7kzt7NGdYchhTl7SA8LKVCCnaSZ8Et3avcy9o
- Explorador: https://explorer.solana.com/address/71xiWbM7kzt7NGdYchhTl7SA8LKVCCnaSZ8Et3avcy9o?cluster=devnet

### Aporte propio

Validación de evidencia HTTPS y cierre condicionado de
cuentas, con controles de autoridad y pertenencia en Anchor.

### Evidencias

Agregar aquí las firmas verificadas de las operaciones y
los resultados reales de las pruebas ejecutadas.

ProofTask es una plataforma descentralizada desarrollada para el **Advanced Bootcamp de WayLearn LATAM**, diseñada para la creación, seguimiento y verificación de hitos técnicos con pruebas inmutables HTTPS registradas sobre la blockchain de **Solana (Devnet)** utilizando **Anchor** y **React + TypeScript**.

---

## 📌 Tabla de Contenidos

1. [Arquitectura y Estructura del Proyecto](#-arquitectura-y-estructura-del-proyecto)
2. [Programa Solana (Rust + Anchor)](#-programa-solana-rust--anchor)
   - [Cuentas y Espacio (Space Layout)](#cuentas-y-espacio-space-layout)
   - [Semillas PDA (Program Derived Addresses)](#semillas-pda-program-derived-addresses)
   - [Instrucciones On-Chain](#instrucciones-on-chain)
   - [Seguridad y Restricciones](#seguridad-y-restricciones)
3. [Cliente TypeScript y Adaptador Frontend](#-cliente-typescript-y-adaptador-frontend)
4. [Batería de Pruebas Automatizadas (PT-01 a PT-12)](#-batería-de-pruebas-automatizadas-pt-01-a-pt-12)
5. [Instrucciones de Ejecución y Compilación](#-instrucciones-de-ejecución-y-compilación)
6. [Guía de Despliegue en Solana Devnet](#-guía-de-despliegue-en-solana-devnet)
   - [Alternativa Recomendada: Solana Playground (SolPG)](#alternativa-recomendada-solana-playground-solpg)
   - [Despliegue Local con Anchor CLI](#despliegue-local-con-anchor-cli)
7. [Diagnóstico del Entorno Técnico](#-diagnóstico-del-entorno-técnico)

---

## 📁 Arquitectura y Estructura del Proyecto

```text
prooftask-solana/
├── programs/
│   └── prooftask/
│       ├── Cargo.toml                  # Dependencias Anchor v0.30.1 y solana-program
│       └── src/
│           ├── lib.rs                  # Declaración del programa, macros y suite de pruebas unitarias
│           ├── state.rs                # Cuentas Project, Task, enum TaskStatus y cálculo de bytes
│           ├── errors.rs               # Códigos de error personalizados (ProofTaskError 6000-6015)
│           └── instructions/
│               ├── mod.rs              # Re-exportación modular de instrucciones
│               ├── create_project.rs   # Instrucción create_project
│               ├── create_task.rs      # Instrucción create_task
│               ├── start_task.rs       # Instrucción start_task
│               ├── complete_task.rs    # Instrucción complete_task
│               ├── close_task.rs       # Instrucción close_task
│               └── close_project.rs    # Instrucción close_project
├── solpg/
│   └── prooftask.rs                    # Código fuente unificado listo para copiar y compilar en Solana Playground
├── src/
│   ├── client/
│   │   └── prooftaskClient.ts          # Cliente TypeScript, derivación de PDAs, codificador/decodificador Borsh
│   ├── idl/
│   │   └── prooftask.json              # Interface Definition Language (IDL) oficial generado
│   ├── context/
│   │   ├── RepositoryContext.tsx       # Alternancia dinámica entre Solana Devnet (RPC) y Modo Demo
│   │   └── WalletContext.tsx           # Adaptador de billeteras Solana (Phantom, Solflare, Backpack)
│   ├── repositories/
│   │   ├── TaskRepository.ts           # Interfaz abstracta del repositorio
│   │   ├── MockTaskRepository.ts       # Repositorio simulado local (para pruebas visuales sin saldo)
│   │   └── SolanaTaskRepository.ts     # Repositorio real conectado al RPC de Solana Devnet
│   ├── pages/                          # Vistas: Dashboard, Proyectos, Detalle Kanban y Verificación
│   └── polyfills.ts                    # Polyfill de Buffer para interoperabilidad web3 en Vite
├── tests/
│   └── prooftask.ts                    # Suite completa de pruebas de integración Anchor (PT-01 a PT-12)
├── Anchor.toml                         # Configuración de Anchor para cluster Devnet
├── package.json                        # Scripts y dependencias frontend + web3
├── tsconfig.json                       # Configuración de TypeScript
└── vite.config.ts                      # Configuración del bundler Vite
```

---

## ⚙️ Programa Solana (Rust + Anchor)

### Cuentas y Espacio (Space Layout)

El programa define exactamente dos tipos de cuentas con tamaños fijos y límites estrictos en bytes UTF-8:

#### 1. Cuenta `Project` (321 bytes)
| Campo | Tipo | Tamaño (Bytes) | Descripción |
|---|---|---|---|
| Discriminador Anchor | `[u8; 8]` | 8 | Prefijo determinista de Anchor |
| `authority` | `Pubkey` | 32 | Billetera propietaria con derechos de firma |
| `project_id` | `u64` | 8 | Identificador numérico secuencial |
| `name` | `String` (máx 64 bytes) | 4 + 64 = 68 | Nombre del proyecto |
| `description` | `String` (máx 180 bytes) | 4 + 180 = 184 | Descripción de objetivos |
| `next_task_id` | `u64` | 8 | Contador monotónico para semillas de tareas |
| `active_tasks` | `u32` | 4 | Contador de tareas activas sin cerrar |
| `created_at` | `i64` | 8 | Timestamp Unix de creación |
| `bump` | `u8` | 1 | Bump canónico de la PDA |
| **Total** | | **321 bytes** | `Project::LEN` exacto |

#### 2. Cuenta `Task` (542 bytes)
| Campo | Tipo | Tamaño (Bytes) | Descripción |
|---|---|---|---|
| Discriminador Anchor | `[u8; 8]` | 8 | Prefijo determinista de Anchor |
| `project` | `Pubkey` | 32 | Clave pública del proyecto padre |
| `task_id` | `u64` | 8 | Identificador único de la tarea |
| `title` | `String` (máx 64 bytes) | 4 + 64 = 68 | Título descriptivo |
| `description` | `String` (máx 240 bytes) | 4 + 240 = 244 | Requisitos técnicos |
| `status` | `TaskStatus` (Enum) | 1 | `Pending` (0), `InProgress` (1), `Completed` (2) |
| `evidence_url` | `String` (máx 160 bytes) | 4 + 160 = 164 | URL HTTPS con la prueba verificable |
| `created_at` | `i64` | 8 | Timestamp Unix de creación |
| `updated_at` | `i64` | 8 | Timestamp Unix de última actualización |
| `bump` | `u8` | 1 | Bump canónico de la PDA |
| **Total** | | **542 bytes** | `Task::LEN` exacto |

---

### Semillas PDA (Program Derived Addresses)

- **PDA de Proyecto**:
  ```text
  seeds = [b"project", authority.key().as_ref(), &project_id.to_le_bytes()]
  ```
- **PDA de Tarea**:
  ```text
  seeds = [b"task", project.key().as_ref(), &task_id.to_le_bytes()]
  ```

---

### Instrucciones On-Chain

1. `create_project(project_id, name, description)`:
   - Requiere firma del propietario (`authority`).
   - Inicializa `next_task_id = 0` y `active_tasks = 0`.
   - Valida nombre (1–64 bytes) y descripción (1–180 bytes).
   - Impide duplicados garantizado por la restricción `init` de Anchor sobre la PDA.

2. `create_task(title, description)`:
   - Requiere que `authority` sea la autoridad del proyecto (`has_one = authority`).
   - Deriva la PDA de la tarea usando `project.next_task_id`.
   - Estado inicial: `TaskStatus::Pending`.
   - Incrementa de forma segura mediante aritmética verificada (`checked_add`):
     - `project.next_task_id += 1`
     - `project.active_tasks += 1`

3. `start_task()`:
   - Valida pertenencia de la tarea al proyecto (`has_one = project`).
   - Exige que el estado sea estrictamente `Pending`.
   - Efectúa la transición a `InProgress` y actualiza `updated_at`.

4. `complete_task(evidence_url)`:
   - Exige que el estado actual sea `InProgress`.
   - Valida que `evidence_url` comience obligatoriamente con `https://`, no esté vacía y no supere 160 bytes UTF-8.
   - Pasa el estado a `Completed` y actualiza `updated_at`.

5. `close_task()`:
   - Exige que la tarea esté en estado `Completed`. Tareas pendientes o en progreso no pueden ser cerradas.
   - Decrementa `active_tasks` usando `checked_sub(1)`.
   - Cierra la cuenta de la tarea mediante `close = authority`, devolviendo el 100% de la renta SOL al propietario.
   - Preserva `next_task_id`, garantizando que ningún identificador sea reutilizado.

6. `close_project()`:
   - Exige que `project.active_tasks == 0`.
   - Si existen tareas activas sin cerrar, rechaza la operación con `ProjectHasActiveTasks`.
   - Cierra la cuenta del proyecto mediante `close = authority`, devolviendo la renta SOL.

---

## 🧪 Batería de Pruebas Automatizadas (PT-01 a PT-12)

El programa cuenta con dos niveles de pruebas:

### 1. Pruebas Unitarias en Rust (`npm run test:rust`)
Ejecutadas directamente en el entorno local con Cargo:
- `test_project_account_space`: Verifica espacio exacto de 321 bytes.
- `test_task_account_space`: Verifica espacio exacto de 542 bytes.
- `test_project_pda_derivation`: Validación determinista de semillas de proyecto.
- `test_task_pda_derivation`: Validación determinista de semillas de tarea.
- `test_utf8_name_and_description_limits`: Validación de límites UTF-8.
- `test_evidence_url_validation_rules`: Obligatoriedad de protocolo HTTPS y longitudes máximas.
- `test_task_status_state_transitions`: Flujo de estados unidireccional.
- `test_checked_task_id_monotonicity`: Inmutabilidad y no reutilización de IDs tras cierres.
- `test_close_project_condition`: Condición estricta de `active_tasks == 0`.

**Resultado obtenido:**
```text
running 10 tests
test test_id ... ok
test tests::test_close_project_condition ... ok
test tests::test_project_account_space ... ok
test tests::test_evidence_url_validation_rules ... ok
test tests::test_checked_task_id_monotonicity ... ok
test tests::test_task_account_space ... ok
test tests::test_task_status_state_transitions ... ok
test tests::test_project_pda_derivation ... ok
test tests::test_utf8_name_and_description_limits ... ok
test tests::test_task_pda_derivation ... ok

test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; finished in 0.00s
```

### 2. Pruebas de Integración Anchor (`tests/prooftask.ts`)
Cubren los 12 casos funcionales requeridos:
- **PT-01**: Crear proyecto y verificar cuentas on-chain.
- **PT-02**: Crear tarea y comprobar incremento de `next_task_id` y `active_tasks`.
- **PT-03**: Iniciar tarea (`Pending` → `InProgress`).
- **PT-04**: Completar tarea adjuntando URL HTTPS de evidencia.
- **PT-05**: Cerrar tarea completada y verificar devolución de renta.
- **PT-06**: Cerrar proyecto vacío con saldo devuelto.
- **PT-07**: Rechazar modificación firmada por una wallet no autorizada (`UnauthorizedAuthority`).
- **PT-08**: Rechazar invocación de tarea asociada a un proyecto diferente (`ProjectMismatch`).
- **PT-09**: Rechazar cierre de proyecto que aún contenga tareas activas (`ProjectHasActiveTasks`).
- **PT-10**: Rechazar cumplimiento sin evidencia o con protocolo no HTTPS (`EvidenceUrlEmpty` / `InvalidEvidenceProtocol`).
- **PT-11**: Rechazar cierre de tareas que se encuentren en estado pendiente o en progreso (`TaskNotCompleted`).
- **PT-12**: Verificar que los identificadores de tarea no se reutilicen tras el cierre.

---

## 🚀 Instrucciones de Ejecución y Compilación

### Requisitos Previos
- Node.js >= 18 (Probado en v24.18)
- npm >= 9 (Probado en 11.16)
- Rust y Cargo (Probado en rustc 1.98.1)

### 1. Instalación de Dependencias
```bash
npm install --legacy-peer-deps
```

### 2. Comprobación de Tipos y Compilación Frontend
```bash
# Validación TypeScript
npm run lint

# Compilación de producción con Vite
npm run build
```

### 3. Ejecución de Pruebas Unitarias del Contrato
```bash
npm run test:rust
```

### 4. Ejecución del Frontend en Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

## 🌐 Guía de Despliegue en Solana Devnet

### Alternativa Recomendada: Solana Playground (SolPG)

Debido a que el toolchain de compilación SBF de Solana (`cargo-build-sbf`) está diseñado nativamente para entornos Linux/WSL y requiere toolchains BPF específicos, la forma más rápida, segura y directa de compilar y desplegar en Devnet es **Solana Playground**:

1. Abre [https://beta.solpg.io/](https://beta.solpg.io/) en tu navegador.
2. Crea un nuevo proyecto seleccionando **Anchor (Rust)** con el nombre `prooftask`.
3. Copia el contenido del archivo [`solpg/prooftask.rs`](solpg/prooftask.rs) y pégalo en `src/lib.rs` dentro de Solana Playground.
4. Conecta tu Playground Wallet en la esquina inferior izquierda y asegúrate de seleccionar el cluster **Devnet**.
5. Solicita SOL de prueba si es necesario desde el botón **Airdrop** (o ejecuta en terminal `solana airdrop 2`).
6. Pulsa **Build** (o escribe `build` en la consola de SolPG). El compilador generará el IDL y los binarios optimizados.
7. Pulsa **Deploy** (o escribe `deploy`).
8. Copia el **Program ID** resultante.
9. En la aplicación ProofTask (página **Verificar** o archivo `.env.local`), introduce el Program ID generado para conectar las transacciones directas en Devnet.

### Despliegue Local con Anchor CLI (Linux / WSL2)

Si dispones de `solana-cli` y `anchor-cli` instalados en Linux/WSL:
```bash
# 1. Configurar Solana CLI en Devnet
solana config set --url https://api.devnet.solana.com

# 2. Compilar el programa
anchor build

# 3. Desplegar en Devnet
anchor deploy --provider.cluster devnet

# 4. Ejecutar pruebas de integración
anchor test --provider.cluster devnet
```

---

## 🔍 Diagnóstico del Entorno Técnico

| Herramienta | Estado Local | Diagnóstico |
|---|---|---|
| **Node.js** | ✅ v24.18.0 | Disponible y funcional en Windows |
| **npm** | ✅ 11.16.0 | Disponible y funcional |
| **Rust & Cargo** | ✅ 1.98.1 | Disponible; compila y supera todas las pruebas unitarias |
| **Vite & React** | ✅ v8.3.8 / React 19 | Compilación de producción exitosa (0 errores) |
| **Solana CLI** | ⚠️ No instalado en PATH Windows | Requiere instalación manual en WSL o uso de Solana Playground |
| **Anchor CLI** | ⚠️ No instalado en PATH Windows | Soportado mediante Solana Playground o build en WSL |

La arquitectura desacoplada implementada permite operar con total fluidez tanto en modo demostración local como conectándose a Solana Devnet mediante el adaptador RPC de `SolanaTaskRepository`.
