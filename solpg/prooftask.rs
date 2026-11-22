use anchor_lang::prelude::*;

declare_id!("PTask11111111111111111111111111111111111111");

pub const MAX_PROJECT_NAME_LENGTH: usize = 64;
pub const MAX_PROJECT_DESCRIPTION_LENGTH: usize = 180;
pub const MAX_TASK_TITLE_LENGTH: usize = 64;
pub const MAX_TASK_DESCRIPTION_LENGTH: usize = 240;
pub const MAX_EVIDENCE_URL_LENGTH: usize = 160;

pub const PROJECT_SEED_PREFIX: &[u8] = b"project";
pub const TASK_SEED_PREFIX: &[u8] = b"task";

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
        require!(!name.trim().is_empty(), ProofTaskError::NameEmpty);
        require!(
            name.as_bytes().len() <= MAX_PROJECT_NAME_LENGTH,
            ProofTaskError::NameTooLong
        );
        require!(
            !description.trim().is_empty(),
            ProofTaskError::DescriptionEmpty
        );
        require!(
            description.as_bytes().len() <= MAX_PROJECT_DESCRIPTION_LENGTH,
            ProofTaskError::DescriptionTooLong
        );

        let project = &mut ctx.accounts.project;
        project.authority = ctx.accounts.authority.key();
        project.project_id = project_id;
        project.name = name;
        project.description = description;
        project.next_task_id = 0;
        project.active_tasks = 0;
        project.created_at = Clock::get()?.unix_timestamp;
        project.bump = ctx.bumps.project;

        emit!(ProjectCreated {
            project: project.key(),
            authority: project.authority,
            project_id,
            created_at: project.created_at,
        });

        Ok(())
    }

    /// Crea una nueva tarea PDA derivada deterministamente del contador del proyecto
    pub fn create_task(
        ctx: Context<CreateTask>,
        title: String,
        description: String,
    ) -> Result<()> {
        require!(!title.trim().is_empty(), ProofTaskError::TitleEmpty);
        require!(
            title.as_bytes().len() <= MAX_TASK_TITLE_LENGTH,
            ProofTaskError::TitleTooLong
        );
        require!(
            !description.trim().is_empty(),
            ProofTaskError::DescriptionEmpty
        );
        require!(
            description.as_bytes().len() <= MAX_TASK_DESCRIPTION_LENGTH,
            ProofTaskError::DescriptionTooLong
        );

        let clock = Clock::get()?;
        let now = clock.unix_timestamp;
        let project = &mut ctx.accounts.project;
        let current_task_id = project.next_task_id;

        let task = &mut ctx.accounts.task;
        task.project = project.key();
        task.task_id = current_task_id;
        task.title = title;
        task.description = description;
        task.status = TaskStatus::Pending;
        task.evidence_url = String::new();
        task.created_at = now;
        task.updated_at = now;
        task.bump = ctx.bumps.task;

        project.next_task_id = project
            .next_task_id
            .checked_add(1)
            .ok_or(ProofTaskError::ArithmeticOverflow)?;
        project.active_tasks = project
            .active_tasks
            .checked_add(1)
            .ok_or(ProofTaskError::ArithmeticOverflow)?;

        emit!(TaskCreated {
            task: task.key(),
            project: project.key(),
            task_id: current_task_id,
            created_at: now,
        });

        Ok(())
    }

    /// Inicia la ejecucion de una tarea (Pending -> InProgress)
    pub fn start_task(ctx: Context<StartTask>) -> Result<()> {
        let task = &mut ctx.accounts.task;
        require!(
            task.status == TaskStatus::Pending,
            ProofTaskError::InvalidTaskStatusTransition
        );

        task.status = TaskStatus::InProgress;
        task.updated_at = Clock::get()?.unix_timestamp;

        emit!(TaskStarted {
            task: task.key(),
            project: ctx.accounts.project.key(),
            task_id: task.task_id,
            updated_at: task.updated_at,
        });

        Ok(())
    }

    /// Completa una tarea registrando una URL de evidencia HTTPS verificable (InProgress -> Completed)
    pub fn complete_task(ctx: Context<CompleteTask>, evidence_url: String) -> Result<()> {
        let task = &mut ctx.accounts.task;
        require!(
            task.status == TaskStatus::InProgress,
            ProofTaskError::InvalidTaskStatusTransition
        );

        let trimmed = evidence_url.trim();
        require!(!trimmed.is_empty(), ProofTaskError::EvidenceUrlEmpty);
        require!(
            trimmed.as_bytes().len() <= MAX_EVIDENCE_URL_LENGTH,
            ProofTaskError::EvidenceUrlTooLong
        );
        require!(
            trimmed.starts_with("https://"),
            ProofTaskError::InvalidEvidenceProtocol
        );

        task.status = TaskStatus::Completed;
        task.evidence_url = trimmed.to_string();
        task.updated_at = Clock::get()?.unix_timestamp;

        emit!(TaskCompleted {
            task: task.key(),
            project: ctx.accounts.project.key(),
            task_id: task.task_id,
            evidence_url: task.evidence_url.clone(),
            updated_at: task.updated_at,
        });

        Ok(())
    }

    /// Cierra una tarea completada, decrece el contador y devuelve la renta a la autoridad
    pub fn close_task(ctx: Context<CloseTask>) -> Result<()> {
        let task = &ctx.accounts.task;
        require!(
            task.status == TaskStatus::Completed,
            ProofTaskError::TaskNotCompleted
        );

        let project = &mut ctx.accounts.project;
        project.active_tasks = project
            .active_tasks
            .checked_sub(1)
            .ok_or(ProofTaskError::ArithmeticUnderflow)?;

        emit!(TaskClosed {
            task: task.key(),
            project: project.key(),
            task_id: task.task_id,
            recipient: ctx.accounts.authority.key(),
        });

        Ok(())
    }

    /// Cierra un proyecto vacio (active_tasks == 0) y devuelve la renta a la autoridad
    pub fn close_project(ctx: Context<CloseProject>) -> Result<()> {
        let project = &ctx.accounts.project;
        require!(
            project.active_tasks == 0,
            ProofTaskError::ProjectHasActiveTasks
        );

        emit!(ProjectClosed {
            project: project.key(),
            authority: ctx.accounts.authority.key(),
            project_id: project.project_id,
        });

        Ok(())
    }
}

// ================= ACCOUNTS =================

#[account]
#[derive(Debug)]
pub struct Project {
    pub authority: Pubkey,
    pub project_id: u64,
    pub name: String,
    pub description: String,
    pub next_task_id: u64,
    pub active_tasks: u32,
    pub created_at: i64,
    pub bump: u8,
}

impl Project {
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
    pub project: Pubkey,
    pub task_id: u64,
    pub title: String,
    pub description: String,
    pub status: TaskStatus,
    pub evidence_url: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl Task {
    pub const LEN: usize = 8 + 32 + 8 + (4 + MAX_TASK_TITLE_LENGTH) + (4 + MAX_TASK_DESCRIPTION_LENGTH) + 1 + (4 + MAX_EVIDENCE_URL_LENGTH) + 8 + 8 + 1;
}

// ================= INSTRUCTION CONTEXTS =================

#[derive(Accounts)]
#[instruction(project_id: u64, name: String, description: String)]
pub struct CreateProject<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Project::LEN,
        seeds = [PROJECT_SEED_PREFIX, authority.key().as_ref(), &project_id.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct CreateTask<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority @ ProofTaskError::UnauthorizedAuthority,
    )]
    pub project: Account<'info, Project>,

    #[account(
        init,
        payer = authority,
        space = Task::LEN,
        seeds = [TASK_SEED_PREFIX, project.key().as_ref(), &project.next_task_id.to_le_bytes()],
        bump
    )]
    pub task: Account<'info, Task>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartTask<'info> {
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ ProofTaskError::UnauthorizedAuthority,
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [TASK_SEED_PREFIX, project.key().as_ref(), &task.task_id.to_le_bytes()],
        bump = task.bump,
        has_one = project @ ProofTaskError::ProjectMismatch,
    )]
    pub task: Account<'info, Task>,
}

#[derive(Accounts)]
#[instruction(evidence_url: String)]
pub struct CompleteTask<'info> {
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ ProofTaskError::UnauthorizedAuthority,
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [TASK_SEED_PREFIX, project.key().as_ref(), &task.task_id.to_le_bytes()],
        bump = task.bump,
        has_one = project @ ProofTaskError::ProjectMismatch,
    )]
    pub task: Account<'info, Task>,
}

#[derive(Accounts)]
pub struct CloseTask<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority @ ProofTaskError::UnauthorizedAuthority,
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [TASK_SEED_PREFIX, project.key().as_ref(), &task.task_id.to_le_bytes()],
        bump = task.bump,
        has_one = project @ ProofTaskError::ProjectMismatch,
        close = authority
    )]
    pub task: Account<'info, Task>,
}

#[derive(Accounts)]
pub struct CloseProject<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority @ ProofTaskError::UnauthorizedAuthority,
        seeds = [PROJECT_SEED_PREFIX, authority.key().as_ref(), &project.project_id.to_le_bytes()],
        bump = project.bump,
        close = authority
    )]
    pub project: Account<'info, Project>,
}

// ================= EVENTS =================

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

// ================= ERRORS =================

#[error_code]
pub enum ProofTaskError {
    #[msg("No autorizado para realizar esta operacion.")]
    UnauthorizedAuthority,

    #[msg("La tarea no pertenece al proyecto especificado.")]
    ProjectMismatch,

    #[msg("El nombre del proyecto no puede estar vacio.")]
    NameEmpty,

    #[msg("El nombre supera el limite maximo de 64 bytes UTF-8.")]
    NameTooLong,

    #[msg("La descripcion del proyecto no puede estar vacia.")]
    DescriptionEmpty,

    #[msg("La descripcion supera el limite maximo en bytes UTF-8.")]
    DescriptionTooLong,

    #[msg("El titulo de la tarea no puede estar vacio.")]
    TitleEmpty,

    #[msg("El titulo supera el limite maximo de 64 bytes UTF-8.")]
    TitleTooLong,

    #[msg("Transicion de estado invalida para la tarea.")]
    InvalidTaskStatusTransition,

    #[msg("La URL de evidencia HTTPS no puede estar vacia.")]
    EvidenceUrlEmpty,

    #[msg("La URL de evidencia supera el limite maximo de 160 bytes UTF-8.")]
    EvidenceUrlTooLong,

    #[msg("La URL de evidencia debe comenzar obligatoriamente con https://")]
    InvalidEvidenceProtocol,

    #[msg("Solo se pueden cerrar tareas que esten en estado Completed.")]
    TaskNotCompleted,

    #[msg("No se puede cerrar un proyecto que aun contenga tareas activas.")]
    ProjectHasActiveTasks,

    #[msg("Desbordamiento aritmetico en la operacion.")]
    ArithmeticOverflow,

    #[msg("Subdesbordamiento aritmetico en la operacion.")]
    ArithmeticUnderflow,
}

