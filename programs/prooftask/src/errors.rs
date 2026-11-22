use anchor_lang::prelude::*;

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

