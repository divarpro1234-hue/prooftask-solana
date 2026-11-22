import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { assert, expect } from 'chai';

describe('ProofTask Test Suite (PT-01 a PT-12)', () => {
  // Configurar provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Cargar programa (IDL autogenerado o inyectado)
  const program = anchor.workspace.Prooftask as Program<any>;
  const authority = provider.wallet;
  const unauthorizedUser = Keypair.generate();

  const PROJECT_SEED = Buffer.from('project');
  const TASK_SEED = Buffer.from('task');

  // Helper para derivar PDA de proyecto
  const findProjectPda = (owner: PublicKey, projectId: anchor.BN) => {
    return PublicKey.findProgramAddressSync(
      [PROJECT_SEED, owner.toBuffer(), projectId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
  };

  // Helper para derivar PDA de tarea
  const findTaskPda = (projectKey: PublicKey, taskId: anchor.BN) => {
    return PublicKey.findProgramAddressSync(
      [TASK_SEED, projectKey.toBuffer(), taskId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
  };

  const projectId = new anchor.BN(1);
  const [projectPda] = findProjectPda(authority.publicKey, projectId);

  it('PT-01: Crear proyecto', async () => {
    const name = 'Protocolo ProofTask';
    const description = 'Gestor descentralizado de proyectos tecnicos con verificacion HTTPS';

    await program.methods
      .createProject(projectId, name, description)
      .accounts({
        authority: authority.publicKey,
        project: projectPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.project.fetch(projectPda);
    expect(account.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(account.projectId.toNumber()).to.equal(projectId.toNumber());
    expect(account.name).to.equal(name);
    expect(account.description).to.equal(description);
    expect(account.nextTaskId.toNumber()).to.equal(0);
    expect(account.activeTasks).to.equal(0);
  });

  it('PT-02: Crear tarea y aumentar contador', async () => {
    const taskId = new anchor.BN(0);
    const [taskPda] = findTaskPda(projectPda, taskId);

    const title = 'Definir cuentas PDA';
    const description = 'Especificar semillas deterministas y restricciones de autoridad en lib.rs';

    await program.methods
      .createTask(title, description)
      .accounts({
        authority: authority.publicKey,
        project: projectPda,
        task: taskPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const taskAccount = await program.account.task.fetch(taskPda);
    expect(taskAccount.project.toBase58()).to.equal(projectPda.toBase58());
    expect(taskAccount.taskId.toNumber()).to.equal(0);
    expect(taskAccount.title).to.equal(title);
    expect(taskAccount.description).to.equal(description);
    expect(taskAccount.status).to.deep.equal({ pending: {} });
    expect(taskAccount.evidenceUrl).to.equal('');

    const projectAccount = await program.account.project.fetch(projectPda);
    expect(projectAccount.nextTaskId.toNumber()).to.equal(1);
    expect(projectAccount.activeTasks).to.equal(1);
  });

  it('PT-03: Iniciar tarea', async () => {
    const taskId = new anchor.BN(0);
    const [taskPda] = findTaskPda(projectPda, taskId);

    await program.methods
      .startTask()
      .accounts({
        authority: authority.publicKey,
        project: projectPda,
        task: taskPda,
      })
      .rpc();

    const taskAccount = await program.account.task.fetch(taskPda);
    expect(taskAccount.status).to.deep.equal({ inProgress: {} });
    expect(taskAccount.updatedAt.toNumber()).to.be.greaterThan(0);
  });

  it('PT-04: Completar tarea con evidencia valida', async () => {
    const taskId = new anchor.BN(0);
    const [taskPda] = findTaskPda(projectPda, taskId);
    const evidenceUrl = 'https://github.com/waylearn/prooftask-anchor/pull/1';

    await program.methods
      .completeTask(evidenceUrl)
      .accounts({
        authority: authority.publicKey,
        project: projectPda,
        task: taskPda,
      })
      .rpc();

    const taskAccount = await program.account.task.fetch(taskPda);
    expect(taskAccount.status).to.deep.equal({ completed: {} });
    expect(taskAccount.evidenceUrl).to.equal(evidenceUrl);
  });

  it('PT-05: Cerrar tarea completada', async () => {
    const taskId = new anchor.BN(0);
    const [taskPda] = findTaskPda(projectPda, taskId);

    await program.methods
      .closeTask()
      .accounts({
        authority: authority.publicKey,
        project: projectPda,
        task: taskPda,
      })
      .rpc();

    // La cuenta de tarea fue cerrada
    const closedAccount = await program.account.task.fetchNullable(taskPda);
    expect(closedAccount).to.be.null;

    const projectAccount = await program.account.project.fetch(projectPda);
    expect(projectAccount.activeTasks).to.equal(0);
    // next_task_id se mantiene en 1 (no se reutiliza)
    expect(projectAccount.nextTaskId.toNumber()).to.equal(1);
  });

  it('PT-06: Cerrar proyecto vacio', async () => {
    const emptyProjectId = new anchor.BN(99);
    const [emptyProjectPda] = findProjectPda(authority.publicKey, emptyProjectId);

    await program.methods
      .createProject(emptyProjectId, 'Proyecto Temporal', 'Proyecto creado para prueba de cierre inmediato')
      .accounts({
        authority: authority.publicKey,
        project: emptyProjectPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .closeProject()
      .accounts({
        authority: authority.publicKey,
        project: emptyProjectPda,
      })
      .rpc();

    const closed = await program.account.project.fetchNullable(emptyProjectPda);
    expect(closed).to.be.null;
  });

  it('PT-07: Rechazar modificacion por wallet no autorizada', async () => {
    const taskId = new anchor.BN(1);
    const [taskPda] = findTaskPda(projectPda, taskId);

    // Crear tarea primero con autoridad valida
    await program.methods
      .createTask('Tarea Segura', 'Verificar que otra wallet no pueda iniciarla')
      .accounts({
        authority: authority.publicKey,
        project: projectPda,
        task: taskPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Intentar iniciarla con una wallet ajena sin permisos
    try {
      await program.methods
        .startTask()
        .accounts({
          authority: unauthorizedUser.publicKey,
          project: projectPda,
          task: taskPda,
        })
        .signers([unauthorizedUser])
        .rpc();
      assert.fail('Debio fallar por wallet no autorizada');
    } catch (err: any) {
      expect(err.toString()).to.include('UnauthorizedAuthority');
    }
  });

  it('PT-08: Rechazar una tarea relacionada con otro proyecto', async () => {
    const anotherProjectId = new anchor.BN(2);
    const [anotherProjectPda] = findProjectPda(authority.publicKey, anotherProjectId);

    await program.methods
      .createProject(anotherProjectId, 'Segundo Proyecto', 'Proyecto para probar proteccion contra sustitucion')
      .accounts({
        authority: authority.publicKey,
        project: anotherProjectPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const taskId = new anchor.BN(1);
    const [taskPdaProject1] = findTaskPda(projectPda, taskId);

    // Intentar invocar start_task pasando task de Project 1 con Project 2 en accounts
    try {
      await program.methods
        .startTask()
        .accounts({
          authority: authority.publicKey,
          project: anotherProjectPda,
          task: taskPdaProject1,
        })
        .rpc();
      assert.fail('Debio rechazar disparidad entre proyecto y tarea');
    } catch (err: any) {
      expect(err.toString()).to.include('ProjectMismatch');
    }
  });

  it('PT-09: Rechazar cierre de proyecto con tareas activas', async () => {
    // projectPda tiene 1 tarea activa (task_id 1 creada en PT-07)
    try {
      await program.methods
        .closeProject()
        .accounts({
          authority: authority.publicKey,
          project: projectPda,
        })
        .rpc();
      assert.fail('Debio fallar al cerrar proyecto con tareas activas');
    } catch (err: any) {
      expect(err.toString()).to.include('ProjectHasActiveTasks');
    }
  });

  it('PT-10: Rechazar cumplimiento sin evidencia o protocolo invalido', async () => {
    const taskId = new anchor.BN(1);
    const [taskPda] = findTaskPda(projectPda, taskId);

    // Iniciar tarea
    await program.methods
      .startTask()
      .accounts({
        authority: authority.publicKey,
        project: projectPda,
        task: taskPda,
      })
      .rpc();

    // 10a: Evidencia vacia
    try {
      await program.methods
        .completeTask('   ')
        .accounts({
          authority: authority.publicKey,
          project: projectPda,
          task: taskPda,
        })
        .rpc();
      assert.fail('Debio fallar por evidencia vacia');
    } catch (err: any) {
      expect(err.toString()).to.include('EvidenceUrlEmpty');
    }

    // 10b: Protocolo no HTTPS
    try {
      await program.methods
        .completeTask('http://insecure-link.com/proof')
        .accounts({
          authority: authority.publicKey,
          project: projectPda,
          task: taskPda,
        })
        .rpc();
      assert.fail('Debio fallar por no usar protocolo https://');
    } catch (err: any) {
      expect(err.toString()).to.include('InvalidEvidenceProtocol');
    }
  });

  it('PT-11: Rechazar cierre de tarea pendiente o en progreso', async () => {
    // La tarea 1 esta en progreso, no completada
    const taskId = new anchor.BN(1);
    const [taskPda] = findTaskPda(projectPda, taskId);

    try {
      await program.methods
        .closeTask()
        .accounts({
          authority: authority.publicKey,
          project: projectPda,
          task: taskPda,
        })
        .rpc();
      assert.fail('Debio fallar al cerrar tarea no completada');
    } catch (err: any) {
      expect(err.toString()).to.include('TaskNotCompleted');
    }
  });

  it('PT-12: Verificar que los identificadores no se reutilicen al cerrar tareas', async () => {
    // Completar la tarea 1
    const taskId1 = new anchor.BN(1);
    const [taskPda1] = findTaskPda(projectPda, taskId1);

    await program.methods
      .completeTask('https://github.com/waylearn/prooftask-anchor/commit/abc1234')
      .accounts({
        authority: authority.publicKey,
        project: projectPda,
        task: taskPda1,
      })
      .rpc();

    // Cerrar la tarea 1
    await program.methods
      .closeTask()
      .accounts({
        authority: authority.publicKey,
        project: projectPda,
        task: taskPda1,
      })
      .rpc();

    // Crear una nueva tarea; debe recibir taskId = 2, NO 0 ni 1
    const expectedTaskId = new anchor.BN(2);
    const [taskPda2] = findTaskPda(projectPda, expectedTaskId);

    await program.methods
      .createTask('Tercera tarea secuencial', 'Comprobar que el identificador avanzo a 2')
      .accounts({
        authority: authority.publicKey,
        project: projectPda,
        task: taskPda2,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const task2Account = await program.account.task.fetch(taskPda2);
    expect(task2Account.taskId.toNumber()).to.equal(2);

    const projectAccount = await program.account.project.fetch(projectPda);
    expect(projectAccount.nextTaskId.toNumber()).to.equal(3);
    expect(projectAccount.activeTasks).to.equal(1);
  });
});

