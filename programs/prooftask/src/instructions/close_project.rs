use anchor_lang::prelude::*;
use crate::errors::ProofTaskError;
use crate::state::{Project, PROJECT_SEED_PREFIX};
use crate::ProjectClosed;

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

pub fn handle_close_project(ctx: Context<CloseProject>) -> Result<()> {
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

