use anchor_lang::prelude::*;
use crate::errors::ProofTaskError;
use crate::state::{
    Project, Task, TaskStatus, MAX_TASK_DESCRIPTION_LENGTH, MAX_TASK_TITLE_LENGTH, TASK_SEED_PREFIX,
};
use crate::TaskCreated;

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

pub fn handle_create_task(
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

