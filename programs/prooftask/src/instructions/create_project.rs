use anchor_lang::prelude::*;
use crate::errors::ProofTaskError;
use crate::state::{Project, MAX_PROJECT_DESCRIPTION_LENGTH, MAX_PROJECT_NAME_LENGTH, PROJECT_SEED_PREFIX};
use crate::ProjectCreated;

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

pub fn handle_create_project(
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

