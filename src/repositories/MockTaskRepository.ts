import type {
  CompleteTaskInput,
  CreateProjectInput,
  CreateTaskInput,
  Project,
  RepositoryOperationResult,
  SolanaAddress,
  Task,
  VerificationCheckResult,
} from '@/src/types/prooftask';
import {
  isValidBase58PubkeyFormat,
  isValidBase58SignatureFormat,
  validateEvidenceUrl,
  validateProjectDescription,
  validateProjectName,
  validateTaskDescription,
  validateTaskTitle,
} from '@/src/utils/bytes';
import type { StageChangeCallback, TaskRepository } from './TaskRepository';

const PROJECTS_STORAGE_KEY = 'prooftask_demo_projects_v1';
const TASKS_STORAGE_KEY = 'prooftask_demo_tasks_v1';

const DEMO_OWNER_DEFAULT = 'DemoWallet7kQ9xLm3nP8rT2vW5yZ1aB4cD6eF9jK2';

function createInitialSeedData(): { projects: Project[]; tasks: Task[] } {
  const now = Date.now();
  const day = 86_400_000;

  const project1Key = 'demo_project_1';
  const project2Key = 'demo_project_2';
  const project3Key = 'demo_project_3';

  const tasks: Task[] = [
    {
      publicKey: 'demo_task_1_1',
      projectPublicKey: project1Key,
      taskId: 1,
      title: 'Definir cuentas PDA de Proyecto y Tarea en Anchor',
      description:
        'Especificar semillas deterministas, tamaño máximo en bytes UTF-8 y restricciones de autoridad en lib.rs.',
      status: 'Completed',
      evidenceUrl: 'https://github.com/prooftask-demo/anchor-specs/pull/14',
      createdAt: now - 9 * day,
      updatedAt: now - 6 * day,
      isSimulated: true,
      pdaAddress: null,
    },
    {
      publicKey: 'demo_task_1_2',
      projectPublicKey: project1Key,
      taskId: 2,
      title: 'Implementar transición segura Pendiente a En progreso',
      description:
        'Validar en la instrucción start_task que solo el propietario del proyecto pueda iniciar la tarea.',
      status: 'InProgress',
      evidenceUrl: null,
      createdAt: now - 6 * day,
      updatedAt: now - 2 * day,
      isSimulated: true,
      pdaAddress: null,
    },
    {
      publicKey: 'demo_task_1_3',
      projectPublicKey: project1Key,
      taskId: 3,
      title: 'Registrar URL de evidencia HTTPS en complete_task',
      description:
        'Comprobar longitud máxima de 160 bytes y prefijo https:// antes de marcar el estado como Completada.',
      status: 'Pending',
      evidenceUrl: null,
      createdAt: now - 3 * day,
      updatedAt: now - 3 * day,
      isSimulated: true,
      pdaAddress: null,
    },
    {
      publicKey: 'demo_task_1_4',
      projectPublicKey: project1Key,
      taskId: 4,
      title: 'Pruebas de cierre y recuperación de renta SOL',
      description:
        'Verificar que close_task y close_project solo procedan cuando las precondiciones de estado se cumplan.',
      status: 'Pending',
      evidenceUrl: null,
      createdAt: now - 2 * day,
      updatedAt: now - 2 * day,
      isSimulated: true,
      pdaAddress: null,
    },
    {
      publicKey: 'demo_task_2_1',
      projectPublicKey: project2Key,
      taskId: 1,
      title: 'Auditar permisos de firma en panel de tesorería',
      description:
        'Revisar flujos de aprobación multifirma para entregas de hitos técnicos en Devnet.',
      status: 'Completed',
      evidenceUrl: 'https://docs.prooftask.example/audits/treasury-v1',
      createdAt: now - 12 * day,
      updatedAt: now - 8 * day,
      isSimulated: true,
      pdaAddress: null,
    },
    {
      publicKey: 'demo_task_2_2',
      projectPublicKey: project2Key,
      taskId: 2,
      title: 'Documentar esquema de eventos Anchor para indexación',
      description:
        'Emitir eventos TaskStarted y TaskCompleted con marca temporal para trazabilidad histórica.',
      status: 'InProgress',
      evidenceUrl: null,
      createdAt: now - 5 * day,
      updatedAt: now - 1 * day,
      isSimulated: true,
      pdaAddress: null,
    },
    {
      publicKey: 'demo_task_3_1',
      projectPublicKey: project3Key,
      taskId: 1,
      title: 'Integrar adaptador RPC de Solana Devnet',
      description:
        'Conectar SolanaTaskRepository con el IDL generado tras el despliegue inicial del programa.',
      status: 'Pending',
      evidenceUrl: null,
      createdAt: now - 4 * day,
      updatedAt: now - 4 * day,
      isSimulated: true,
      pdaAddress: null,
    },
  ];

  const projects: Project[] = [
    {
      publicKey: project1Key,
      authority: DEMO_OWNER_DEFAULT,
      projectId: 1,
      name: 'Protocolo ProofTask Core (Demo)',
      description:
        'Diseño de instrucciones Anchor y validación de estados verificables para tareas en Solana Devnet.',
      nextTaskId: 5,
      activeTasks: tasks.filter((t) => t.projectPublicKey === project1Key).length,
      createdAt: now - 10 * day,
      isSimulated: true,
      pdaAddress: null,
    },
    {
      publicKey: project2Key,
      authority: DEMO_OWNER_DEFAULT,
      projectId: 2,
      name: 'Auditoría de Hitos DAO (Demo)',
      description:
        'Seguimiento de entregables técnicos con pruebas HTTPS inmutables para equipos distribuidos.',
      nextTaskId: 3,
      activeTasks: tasks.filter((t) => t.projectPublicKey === project2Key).length,
      createdAt: now - 14 * day,
      isSimulated: true,
      pdaAddress: null,
    },
    {
      publicKey: project3Key,
      authority: DEMO_OWNER_DEFAULT,
      projectId: 3,
      name: 'Portal de Verificación Devnet (Demo)',
      description:
        'Preparación del adaptador cliente y flujo de consulta de firmas en Solana Explorer.',
      nextTaskId: 2,
      activeTasks: tasks.filter((t) => t.projectPublicKey === project3Key).length,
      createdAt: now - 5 * day,
      isSimulated: true,
      pdaAddress: null,
    },
  ];

  return { projects, tasks };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockTaskRepository implements TaskRepository {
  readonly modeLabel = 'Modo demostración (datos locales simulados)';
  readonly isDemo = true;
  readonly network = 'devnet' as const;
  readonly programId = null;

  private ensureSeeded(): { projects: Project[]; tasks: Task[] } {
    try {
      const rawProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      const rawTasks = localStorage.getItem(TASKS_STORAGE_KEY);

      if (rawProjects && rawTasks) {
        const projects: Project[] = JSON.parse(rawProjects);
        const tasks: Task[] = JSON.parse(rawTasks);
        return this.reconcileProjectCounts(projects, tasks);
      }
    } catch {
      // Fallback to fresh seed if localStorage is corrupted
    }

    const seed = createInitialSeedData();
    this.saveAll(seed.projects, seed.tasks);
    return seed;
  }

  private reconcileProjectCounts(
    projects: Project[],
    tasks: Task[]
  ): { projects: Project[]; tasks: Task[] } {
    const updatedProjects = projects.map((project) => ({
      ...project,
      activeTasks: tasks.filter((t) => t.projectPublicKey === project.publicKey).length,
    }));
    return { projects: updatedProjects, tasks };
  }

  private saveAll(projects: Project[], tasks: Task[]): void {
    const reconciled = this.reconcileProjectCounts(projects, tasks);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(reconciled.projects));
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(reconciled.tasks));
  }

  private async runSimulatedStages(onStageChange?: StageChangeCallback): Promise<void> {
    onStageChange?.('preparing');
    await delay(220);
    onStageChange?.('awaiting_signature');
    await delay(320);
    onStageChange?.('submitting');
    await delay(260);
    onStageChange?.('confirming');
    await delay(280);
    onStageChange?.('success');
  }

  async getProjects(): Promise<Project[]> {
    await delay(140);
    const { projects } = this.ensureSeeded();
    return [...projects].sort((a, b) => b.createdAt - a.createdAt);
  }

  async getProjectById(projectPublicKey: SolanaAddress): Promise<Project | null> {
    await delay(100);
    const { projects } = this.ensureSeeded();
    return projects.find((p) => p.publicKey === projectPublicKey) ?? null;
  }

  async getTasks(projectPublicKey?: SolanaAddress): Promise<Task[]> {
    await delay(120);
    const { tasks } = this.ensureSeeded();
    const filtered = projectPublicKey
      ? tasks.filter((t) => t.projectPublicKey === projectPublicKey)
      : tasks;
    return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
  }

  async createProject(
    input: CreateProjectInput,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Project>> {
    const nameError = validateProjectName(input.name);
    if (nameError) {
      onStageChange?.('error');
      throw new Error(nameError);
    }
    const descError = validateProjectDescription(input.description);
    if (descError) {
      onStageChange?.('error');
      throw new Error(descError);
    }

    await this.runSimulatedStages(onStageChange);

    const { projects, tasks } = this.ensureSeeded();
    const maxId = projects.reduce((max, p) => Math.max(max, p.projectId), 0);
    const nextProjectId = maxId + 1;
    const now = Date.now();

    const newProject: Project = {
      publicKey: `demo_project_${nextProjectId}_${now.toString(36)}`,
      authority: authority || DEMO_OWNER_DEFAULT,
      projectId: nextProjectId,
      name: input.name.trim(),
      description: input.description.trim(),
      nextTaskId: 1,
      activeTasks: 0,
      createdAt: now,
      isSimulated: true,
      pdaAddress: null,
    };

    const nextProjects = [newProject, ...projects];
    this.saveAll(nextProjects, tasks);

    return {
      data: newProject,
      isSimulated: true,
      note: 'Proyecto creado en almacenamiento local de demostración.',
      signature: null,
    };
  }

  async closeProject(
    projectPublicKey: SolanaAddress,
    _authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<void>> {
    const { projects, tasks } = this.ensureSeeded();
    const target = projects.find((p) => p.publicKey === projectPublicKey);
    if (!target) {
      onStageChange?.('error');
      throw new Error('El proyecto seleccionado no existe.');
    }

    const projectTasks = tasks.filter((t) => t.projectPublicKey === projectPublicKey);
    if (projectTasks.length > 0) {
      onStageChange?.('error');
      throw new Error(
        'No se puede cerrar un proyecto que aún tiene tareas activas. Cierra todas las tareas completadas primero.'
      );
    }

    await this.runSimulatedStages(onStageChange);

    const nextProjects = projects.filter((p) => p.publicKey !== projectPublicKey);
    this.saveAll(nextProjects, tasks);

    return {
      data: undefined,
      isSimulated: true,
      note: 'Cuenta de proyecto cerrada en modo demostración.',
      signature: null,
    };
  }

  async createTask(
    input: CreateTaskInput,
    _authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Task>> {
    const titleError = validateTaskTitle(input.title);
    if (titleError) {
      onStageChange?.('error');
      throw new Error(titleError);
    }
    const descError = validateTaskDescription(input.description);
    if (descError) {
      onStageChange?.('error');
      throw new Error(descError);
    }

    const { projects, tasks } = this.ensureSeeded();
    const projectIndex = projects.findIndex((p) => p.publicKey === input.projectPublicKey);
    if (projectIndex === -1) {
      onStageChange?.('error');
      throw new Error('No se encontró el proyecto destino para crear la tarea.');
    }

    await this.runSimulatedStages(onStageChange);

    const project = projects[projectIndex];
    const taskId = project.nextTaskId;
    const now = Date.now();

    const newTask: Task = {
      publicKey: `demo_task_${project.projectId}_${taskId}_${now.toString(36)}`,
      projectPublicKey: project.publicKey,
      taskId,
      title: input.title.trim(),
      description: input.description.trim(),
      status: 'Pending',
      evidenceUrl: null,
      createdAt: now,
      updatedAt: now,
      isSimulated: true,
      pdaAddress: null,
    };

    const updatedProject: Project = {
      ...project,
      nextTaskId: project.nextTaskId + 1,
      activeTasks: project.activeTasks + 1,
    };

    const nextProjects = [...projects];
    nextProjects[projectIndex] = updatedProject;
    const nextTasks = [newTask, ...tasks];

    this.saveAll(nextProjects, nextTasks);

    return {
      data: newTask,
      isSimulated: true,
      note: 'Tarea creada en modo demostración.',
      signature: null,
    };
  }

  async startTask(
    taskPublicKey: SolanaAddress,
    _authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Task>> {
    const { projects, tasks } = this.ensureSeeded();
    const taskIndex = tasks.findIndex((t) => t.publicKey === taskPublicKey);
    if (taskIndex === -1) {
      onStageChange?.('error');
      throw new Error('No se encontró la tarea solicitada.');
    }

    const currentTask = tasks[taskIndex];
    if (currentTask.status !== 'Pending') {
      onStageChange?.('error');
      throw new Error(
        'Transición inválida: solo las tareas en estado Pendiente pueden pasar a En progreso.'
      );
    }

    await this.runSimulatedStages(onStageChange);

    const updatedTask: Task = {
      ...currentTask,
      status: 'InProgress',
      updatedAt: Date.now(),
    };

    const nextTasks = [...tasks];
    nextTasks[taskIndex] = updatedTask;
    this.saveAll(projects, nextTasks);

    return {
      data: updatedTask,
      isSimulated: true,
      note: 'Tarea iniciada en modo demostración.',
      signature: null,
    };
  }

  async completeTask(
    input: CompleteTaskInput,
    _authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Task>> {
    const urlError = validateEvidenceUrl(input.evidenceUrl);
    if (urlError) {
      onStageChange?.('error');
      throw new Error(urlError);
    }

    const { projects, tasks } = this.ensureSeeded();
    const taskIndex = tasks.findIndex((t) => t.publicKey === input.taskPublicKey);
    if (taskIndex === -1) {
      onStageChange?.('error');
      throw new Error('No se encontró la tarea solicitada.');
    }

    const currentTask = tasks[taskIndex];
    if (currentTask.status !== 'InProgress') {
      onStageChange?.('error');
      throw new Error(
        'Transición inválida: solo las tareas en estado En progreso pueden completarse.'
      );
    }

    await this.runSimulatedStages(onStageChange);

    const updatedTask: Task = {
      ...currentTask,
      status: 'Completed',
      evidenceUrl: input.evidenceUrl.trim(),
      updatedAt: Date.now(),
    };

    const nextTasks = [...tasks];
    nextTasks[taskIndex] = updatedTask;
    this.saveAll(projects, nextTasks);

    return {
      data: updatedTask,
      isSimulated: true,
      note: 'Tarea completada con evidencia HTTPS en modo demostración.',
      signature: null,
    };
  }

  async closeTask(
    taskPublicKey: SolanaAddress,
    _authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<void>> {
    const { projects, tasks } = this.ensureSeeded();
    const task = tasks.find((t) => t.publicKey === taskPublicKey);
    if (!task) {
      onStageChange?.('error');
      throw new Error('No se encontró la tarea a cerrar.');
    }

    if (task.status !== 'Completed') {
      onStageChange?.('error');
      throw new Error(
        'Transición inválida: solo se pueden cerrar tareas que ya estén en estado Completada.'
      );
    }

    await this.runSimulatedStages(onStageChange);

    const nextTasks = tasks.filter((t) => t.publicKey !== taskPublicKey);
    this.saveAll(projects, nextTasks);

    return {
      data: undefined,
      isSimulated: true,
      note: 'Cuenta de tarea cerrada en modo demostración.',
      signature: null,
    };
  }

  async verifyTransaction(
    programId: string,
    signature: string
  ): Promise<VerificationCheckResult> {
    await delay(420);

    const trimmedSig = signature.trim();
    const trimmedProgram = programId.trim();
    const now = Date.now();

    if (!trimmedSig) {
      return {
        status: 'invalid_input',
        programId: trimmedProgram || null,
        signature: '',
        isValidSignatureFormat: false,
        isSimulated: true,
        summary: 'Introduce una firma de transacción de Solana Devnet para verificar.',
        details: [
          'La firma de transacción no puede estar vacía.',
          'Cuando el programa esté desplegado, cada instrucción devolverá una firma Base58 verificable.',
        ],
        explorerUrl: null,
        checkedAt: now,
      };
    }

    const validSigFormat = isValidBase58SignatureFormat(trimmedSig);
    const hasCustomProgramId =
      trimmedProgram.length > 0 && trimmedProgram !== 'Pendiente de despliegue';
    const validProgramFormat = !hasCustomProgramId || isValidBase58PubkeyFormat(trimmedProgram);

    if (!validProgramFormat) {
      return {
        status: 'invalid_input',
        programId: trimmedProgram,
        signature: trimmedSig,
        isValidSignatureFormat: validSigFormat,
        isSimulated: true,
        summary: 'El formato del Program ID introducido no es una clave pública Base58 válida.',
        details: [
          'Un Program ID de Solana debe tener entre 32 y 44 caracteres Base58.',
          'Actualmente el programa oficial de ProofTask figura como "Pendiente de despliegue".',
        ],
        explorerUrl: validSigFormat
          ? `https://explorer.solana.com/tx/${encodeURIComponent(trimmedSig)}?cluster=devnet`
          : null,
        checkedAt: now,
      };
    }

    if (!validSigFormat) {
      return {
        status: 'invalid_input',
        programId: hasCustomProgramId ? trimmedProgram : null,
        signature: trimmedSig,
        isValidSignatureFormat: false,
        isSimulated: true,
        summary: 'Formato de firma inválido para Solana Devnet.',
        details: [
          'Las firmas de transacción en Solana tienen entre 86 y 88 caracteres en codificación Base58 (sin 0, O, I ni l).',
          'No se ha generado enlace a Solana Explorer porque la firma no tiene formato real.',
        ],
        explorerUrl: null,
        checkedAt: now,
      };
    }

    return {
      status: 'pending_deployment',
      programId: hasCustomProgramId ? trimmedProgram : null,
      signature: trimmedSig,
      isValidSignatureFormat: true,
      isSimulated: true,
      summary: 'Programa pendiente de despliegue en Solana Devnet (Modo demostración).',
      details: [
        'La firma ingresada cumple con el formato Base58 de una transacción Solana.',
        'La validación de instrucciones y cuentas PDA contra el programa Anchor aún no está activa en esta fase de frontend.',
        'Puedes consultar manualmente esta firma en Solana Explorer (Devnet) si corresponde a una transacción real externa.',
      ],
      explorerUrl: `https://explorer.solana.com/tx/${encodeURIComponent(trimmedSig)}?cluster=devnet`,
      checkedAt: now,
    };
  }
}
