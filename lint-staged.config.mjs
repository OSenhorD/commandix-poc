import path from 'node:path';

const COMPOSE =
  'docker compose -f docker/development/docker-compose.yml --project-directory .';

function quote(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function relatedCommand(service, packageDir, stagedFiles, extraArgs = []) {
  const files = stagedFiles
    .filter((file) => !file.includes('.e2e-spec.'))
    .map((file) => path.relative(packageDir, file))
    .filter((file) => file.length > 0 && !file.startsWith('..'));

  if (files.length === 0) {
    return [];
  }

  const args = [...extraArgs, ...files.map(quote)].join(' ');
  return `${COMPOSE} exec -T ${service} npx vitest related --run --passWithNoTests ${args}`;
}

export default {
  'nexus-backend/**/*.ts': (files) =>
    relatedCommand('api', 'nexus-backend', files, ['--exclude', "'**/*.e2e-spec.ts'"]),
  'nexus-frontend/**/*.{ts,tsx}': (files) => relatedCommand('frontend', 'nexus-frontend', files),
};
