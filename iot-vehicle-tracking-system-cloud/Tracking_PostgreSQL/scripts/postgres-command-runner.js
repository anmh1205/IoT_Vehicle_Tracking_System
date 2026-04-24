#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

function runProcess(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error(stderr || stdout || `${command} exited with code ${result.status}`);
  }

  return (result.stdout || '').trim();
}

function hasRunningDockerContainer(containerName) {
  try {
    const output = runProcess('docker', [
      'ps',
      '--filter',
      `name=^/${containerName}$`,
      '--format',
      '{{.Names}}',
    ]);
    return output.split(/\r?\n/).includes(containerName);
  } catch {
    return false;
  }
}

function hasBinary(binary) {
  try {
    runProcess(binary, ['--version']);
    return true;
  } catch {
    return false;
  }
}

function createPostgresCommandRunner(config, requestedMode) {
  const mode =
    requestedMode ||
    (hasRunningDockerContainer(config.PG_CONTAINER_NAME)
      ? 'docker'
      : hasBinary('psql')
        ? 'direct'
        : null);

  if (!mode) {
    throw new Error(
      'No PostgreSQL runner available. Start the Docker container or install the psql client.',
    );
  }

  const run = (psqlArgs, input) => {
    if (mode === 'docker') {
      return runProcess(
        'docker',
        [
          'exec',
          '-i',
          config.PG_CONTAINER_NAME,
          'psql',
          '-v',
          'ON_ERROR_STOP=1',
          '-U',
          config.POSTGRES_USER,
          '-d',
          config.POSTGRES_DB,
          ...psqlArgs,
        ],
        { input },
      );
    }

    return runProcess(
      'psql',
      [
        '-v',
        'ON_ERROR_STOP=1',
        '-h',
        config.POSTGRES_HOST,
        '-p',
        config.POSTGRES_PORT,
        '-U',
        config.POSTGRES_USER,
        '-d',
        config.POSTGRES_DB,
        ...psqlArgs,
      ],
      {
        input,
        env: {
          ...process.env,
          PGPASSWORD: config.POSTGRES_PASSWORD,
        },
      },
    );
  };

  return {
    mode,
    execSql(sql) {
      return run(['-f', '-'], sql);
    },
    queryRows(sql) {
      const output = run(['-At', '-F', '\t', '-c', sql]);
      if (!output) {
        return [];
      }
      return output.split(/\r?\n/).map((line) => line.split('\t'));
    },
  };
}

module.exports = {
  createPostgresCommandRunner,
};
