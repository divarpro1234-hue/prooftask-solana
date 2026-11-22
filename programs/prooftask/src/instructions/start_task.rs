use anchor_lang::prelude::*;
use crate::errors::ProofTaskError;
use crate::state::{Project, Task, TaskStatus, TASK_SEED_PREFIX};
use crate::TaskStarted;

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

pub fn handle_start_task(ctx: Context<StartTask>) -> Result<()> {
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

