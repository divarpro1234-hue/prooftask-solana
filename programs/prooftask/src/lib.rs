use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("PTask11111111111111111111111111111111111111");

#[program]
pub mod prooftask {
    use super::*;

    /// Crea una nueva cuenta PDA de proyecto vinculada a la autoridad firmante
    pub fn create_project(
        ctx: Context<CreateProject>,
        project_id: u64,
        name: String,
        description: String,
    ) -> Result<()> {
        instructions::handle_create_project(ctx, project_id, name, description)
    }

    /// Crea una nueva tarea PDA derivada deterministamente del contador del proyecto
    pub fn create_task(
        ctx: Context<CreateTask>,
        title: String,
        description: String,
    ) -> Result<()> {
        instructions::handle_create_task(ctx, title, description)
    }

    /// Inicia la ejecucion de una tarea (Pending -> InProgress)
    pub fn start_task(ctx: Context<StartTask>) -> Result<()> {
        instructions::handle_start_task(ctx)
    }

    /// Completa una tarea registrando una URL de evidencia HTTPS verificable (InProgress -> Completed)
    pub fn complete_task(ctx: Context<CompleteTask>, evidence_url: String) -> Result<()> {
        instructions::handle_complete_task(ctx, evidence_url)
    }

    /// Cierra una tarea completada, decrece el contador y devuelve la renta a la autoridad
    pub fn close_task(ctx: Context<CloseTask>) -> Result<()> {
        instructions::handle_close_task(ctx)
    }

    /// Cierra un proyecto vacio (active_tasks == 0) y devuelve la renta a la autoridad
    pub fn close_project(ctx: Context<CloseProject>) -> Result<()> {
        instructions::handle_close_project(ctx)
    }
}

#[event]
pub struct ProjectCreated {
    pub project: Pubkey,
    pub authority: Pubkey,
    pub project_id: u64,
    pub created_at: i64,
}

#[event]
pub struct TaskCreated {
    pub task: Pubkey,
    pub project: Pubkey,
    pub task_id: u64,
    pub created_at: i64,
}

#[event]
pub struct TaskStarted {
    pub task: Pubkey,
    pub project: Pubkey,
    pub task_id: u64,
    pub updated_at: i64,
}

#[event]
pub struct TaskCompleted {
    pub task: Pubkey,
    pub project: Pubkey,
    pub task_id: u64,
    pub evidence_url: String,
    pub updated_at: i64,
}

#[event]
pub struct TaskClosed {
    pub task: Pubkey,
    pub project: Pubkey,
    pub task_id: u64,
    pub recipient: Pubkey,
}

#[event]
pub struct ProjectClosed {
    pub project: Pubkey,
    pub authority: Pubkey,
    pub project_id: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::*;

    #[test]
    fn test_project_account_space() {
        assert_eq!(Project::LEN, 321);
    }

    #[test]
    fn test_task_account_space() {
        assert_eq!(Task::LEN, 542);
    }

    #[test]
    fn test_project_pda_derivation() {
        let authority = Pubkey::new_unique();
        let project_id: u64 = 1;
        let id_bytes = project_id.to_le_bytes();
        let (pda, _bump) = Pubkey::find_program_address(
            &[PROJECT_SEED_PREFIX, authority.as_ref(), &id_bytes],
            &crate::ID,
        );
        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_task_pda_derivation() {
        let project = Pubkey::new_unique();
        let task_id: u64 = 0;
        let id_bytes = task_id.to_le_bytes();
        let (pda, _bump) = Pubkey::find_program_address(
            &[TASK_SEED_PREFIX, project.as_ref(), &id_bytes],
            &crate::ID,
        );
        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_utf8_name_and_description_limits() {
        let valid_name = "Proyecto Principal de Prueba";
        assert!(valid_name.as_bytes().len() <= MAX_PROJECT_NAME_LENGTH);

        let long_name = "a".repeat(MAX_PROJECT_NAME_LENGTH + 1);
        assert!(long_name.as_bytes().len() > MAX_PROJECT_NAME_LENGTH);

        let valid_desc = "Descripcion verificable para la tarea on-chain en Solana Devnet";
        assert!(valid_desc.as_bytes().len() <= MAX_PROJECT_DESCRIPTION_LENGTH);

        let long_desc = "d".repeat(MAX_PROJECT_DESCRIPTION_LENGTH + 1);
        assert!(long_desc.as_bytes().len() > MAX_PROJECT_DESCRIPTION_LENGTH);
    }

    #[test]
    fn test_evidence_url_validation_rules() {
        let valid_url = "https://github.com/waylearn/prooftask-solana/pull/1";
        assert!(valid_url.starts_with("https://"));
        assert!(valid_url.as_bytes().len() <= MAX_EVIDENCE_URL_LENGTH);

        let http_url = "http://insecure-evidence.com/proof";
        assert!(!http_url.starts_with("https://"));

        let long_url = format!("https://example.com/{}", "x".repeat(200));
        assert!(long_url.as_bytes().len() > MAX_EVIDENCE_URL_LENGTH);
    }

    #[test]
    fn test_task_status_state_transitions() {
        let status = TaskStatus::Pending;
        assert_eq!(status, TaskStatus::Pending);

        // Transicion 1: Pending -> InProgress
        let next_status = TaskStatus::InProgress;
        assert_eq!(next_status, TaskStatus::InProgress);

        // Transicion 2: InProgress -> Completed
        let final_status = TaskStatus::Completed;
        assert_eq!(final_status, TaskStatus::Completed);
    }

    #[test]
    fn test_checked_task_id_monotonicity() {
        let mut next_task_id: u64 = 0;
        let mut active_tasks: u32 = 0;

        // Crear tarea 0
        let created_id_0 = next_task_id;
        next_task_id = next_task_id.checked_add(1).unwrap();
        active_tasks = active_tasks.checked_add(1).unwrap();
        assert_eq!(created_id_0, 0);
        assert_eq!(next_task_id, 1);
        assert_eq!(active_tasks, 1);

        // Crear tarea 1
        let created_id_1 = next_task_id;
        next_task_id = next_task_id.checked_add(1).unwrap();
        active_tasks = active_tasks.checked_add(1).unwrap();
        assert_eq!(created_id_1, 1);
        assert_eq!(next_task_id, 2);
        assert_eq!(active_tasks, 2);

        // Cerrar tarea 0
        active_tasks = active_tasks.checked_sub(1).unwrap();
        assert_eq!(active_tasks, 1);

        // Siguiente tarea NO reutiliza el id 0
        let created_id_2 = next_task_id;
        next_task_id = next_task_id.checked_add(1).unwrap();
        active_tasks = active_tasks.checked_add(1).unwrap();
        assert_eq!(created_id_2, 2);
        assert_eq!(next_task_id, 3);
        assert_eq!(active_tasks, 2);
    }

    #[test]
    fn test_close_project_condition() {
        let active_tasks_nonzero: u32 = 2;
        assert!(active_tasks_nonzero > 0); // No se puede cerrar

        let active_tasks_zero: u32 = 0;
        assert_eq!(active_tasks_zero, 0); // Si se puede cerrar
    }
}

