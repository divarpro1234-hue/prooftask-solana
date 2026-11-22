use anchor_lang::prelude::*;

pub const MAX_PROJECT_NAME_LENGTH: usize = 64;
pub const MAX_PROJECT_DESCRIPTION_LENGTH: usize = 180;
pub const MAX_TASK_TITLE_LENGTH: usize = 64;
pub const MAX_TASK_DESCRIPTION_LENGTH: usize = 240;
pub const MAX_EVIDENCE_URL_LENGTH: usize = 160;

pub const PROJECT_SEED_PREFIX: &[u8] = b"project";
pub const TASK_SEED_PREFIX: &[u8] = b"task";

#[account]
#[derive(Debug)]
pub struct Project {
    /// Autoridad propietaria del proyecto con derechos de creacion y cierre
    pub authority: Pubkey,
    /// Identificador unico secuencial del proyecto para la autoridad
    pub project_id: u64,
    /// Nombre del proyecto (maximo 64 bytes UTF-8)
    pub name: String,
    /// Descripcion del proyecto (maximo 180 bytes UTF-8)
    pub description: String,
    /// Contador para derivar de forma determinista la siguiente tarea
    pub next_task_id: u64,
    /// Numero de tareas activas actualmente
    pub active_tasks: u32,
    /// Marca de tiempo unix de creacion
    pub created_at: i64,
    /// Bump semilla PDA
    pub bump: u8,
}

impl Project {
    /// 8 discriminador + 32 authority + 8 project_id + (4 + 64) name +
    /// (4 + 180) description + 8 next_task_id + 4 active_tasks + 8 created_at + 1 bump = 321
    pub const LEN: usize = 8 + 32 + 8 + (4 + MAX_PROJECT_NAME_LENGTH) + (4 + MAX_PROJECT_DESCRIPTION_LENGTH) + 8 + 4 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
}

#[account]
#[derive(Debug)]
pub struct Task {
    /// Clave publica de la cuenta de proyecto a la que pertenece esta tarea
    pub project: Pubkey,
    /// Identificador secuencial de la tarea dentro del proyecto
    pub task_id: u64,
    /// Titulo descriptivo de la tarea (maximo 64 bytes UTF-8)
    pub title: String,
    /// Descripcion detallada de los requisitos (maximo 240 bytes UTF-8)
    pub description: String,
    /// Estado verificable de la tarea en el flujo
    pub status: TaskStatus,
    /// URL de evidencia HTTPS registrada al completarse (maximo 160 bytes UTF-8)
    pub evidence_url: String,
    /// Marca de tiempo unix de creacion
    pub created_at: i64,
    /// Marca de tiempo unix de ultima transicion
    pub updated_at: i64,
    /// Bump semilla PDA
    pub bump: u8,
}

impl Task {
    /// 8 discriminador + 32 project + 8 task_id + (4 + 64) title +
    /// (4 + 240) description + 1 status + (4 + 160) evidence_url + 8 created_at + 8 updated_at + 1 bump = 542
    pub const LEN: usize = 8 + 32 + 8 + (4 + MAX_TASK_TITLE_LENGTH) + (4 + MAX_TASK_DESCRIPTION_LENGTH) + 1 + (4 + MAX_EVIDENCE_URL_LENGTH) + 8 + 8 + 1;
}

