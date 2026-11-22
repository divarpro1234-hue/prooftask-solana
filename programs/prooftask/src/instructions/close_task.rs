use anchor_lang::prelude::*;
use crate::errors::ProofTaskError;
use crate::state::{Project, Task, TaskStatus, TASK_SEED_PREFIX};
use crate::TaskClosed;

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

pub fn handle_close_task(ctx: Context<CloseTask>) -> Result<()> {
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

