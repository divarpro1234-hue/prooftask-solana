use anchor_lang::prelude::*;
use crate::errors::ProofTaskError;
use crate::state::{Project, Task, TaskStatus, MAX_EVIDENCE_URL_LENGTH, TASK_SEED_PREFIX};
use crate::TaskCompleted;

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

pub fn handle_complete_task(ctx: Context<CompleteTask>, evidence_url: String) -> Result<()> {
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

