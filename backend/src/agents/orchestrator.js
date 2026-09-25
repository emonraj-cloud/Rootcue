import { runTroubleshootingAgent } from './troubleshootingAgent.js'
import { runDatabaseAgent } from './databaseAgent.js'
import { runCodeAgent } from './codeAgent.js'
import { runDevopsAgent } from './devopsAgent.js'

// ------------------------------------------------------------
// Problem routing.
//
// Keywords are matched on word boundaries, not raw substrings.
// Substring matching produced obvious false positives: "support",
// "important" and "transport" all contain "port" and were being
// routed to the DevOps agent.
//
// The lists are also wide enough to cover the words people actually
// use. Before this, almost every real problem fell through to the
// general agent because terms like "kubernetes", "nginx" or "deploy"
// were missing, which meant the specialised agents were almost never
// used.
// ------------------------------------------------------------
const DATABASE_KEYWORDS = [
  'sql', 'database', 'postgres', 'postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'oracle',
  'query', 'queries', 'table', 'schema', 'migration', 'index', 'indexing', 'deadlock',
  'connection pool', 'foreign key', 'primary key', 'join', 'vacuum', 'replica lag',
  'transaction', 'cursor', 'stored procedure', 'trigger', 'view', 'nosql',
  'redis', 'mongodb', 'cassandra', 'elasticsearch', 'supabase', 'prisma', 'sequelize', 'knex',
  'duplicate key', 'relation does not exist', 'syntax error at or near', 'too many connections'
].filter(Boolean)

const DEVOPS_KEYWORDS = [
  'docker', 'dockerfile', 'container', 'compose', 'kubernetes', 'k8s', 'kubectl', 'pod', 'pods',
  'namespace', 'deployment', 'deploy', 'rollout', 'ingress', 'service', 'statefulset', 'helm',
  'nginx', 'apache', 'caddy', 'traefik', 'gateway', 'load balancer', 'proxy', 'reverse proxy',
  'dns', 'firewall', 'subnet', 'cidr', 'ip address', 'port', 'ssl', 'tls', 'certificate',
  'server', 'servers', 'linux', 'ubuntu', 'debian', 'centos', 'rhel', 'systemd', 'ssh',
  'disk', 'memory', 'cpu', 'oom', 'oomkilled', 'out of memory', 'crash loop', 'restarting',
  'scaling', 'autoscaling', 'replica', 'cluster', 'node not ready', 'load', 'uptime',
  'terraform', 'ansible', 'jenkins', 'github actions', 'gitlab ci', 'ci/cd', 'pipeline',
  'build fails', 'environment variable', 'env var', 'vpc', 'ec2', 's3 bucket', 'lambda',
  'serverless', 'faas'
]

const CODE_KEYWORDS = [
  'error', 'errors', 'exception', 'traceback', 'bug', 'syntax', 'stack trace', 'undefined',
  'not a function', 'null pointer', 'cannot read', 'compile', 'compilation', 'build error',
  'typeerror', 'referenceerror', 'syntaxerror', 'segfault', 'panic', 'nil pointer',
  'function', 'class', 'method', 'module', 'package', 'dependency',
  'javascript', 'typescript', 'python', 'java', 'golang', 'rust', 'php', 'ruby', 'c#',
  'react', 'vue', 'angular', 'node.js', 'nodejs', 'npm', 'yarn', 'webpack', 'vite',
  'blank page', 'white screen', 'render', 'component', 'state', 'hook', 'refactor',
  'runtime', 'test failing', 'test failed', 'assertion', 'debug'
]

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Word-boundary match so "port" does not match inside "support".
function buildMatcher(keywords) {
  const pattern = keywords.map(escapeRegExp).join('|')
  return new RegExp(`(?:^|[^a-z0-9+#])(${pattern})(?![a-z0-9])`, 'i')
}

const DATABASE_PATTERN = buildMatcher(DATABASE_KEYWORDS)
const DEVOPS_PATTERN = buildMatcher(DEVOPS_KEYWORDS)
const CODE_PATTERN = buildMatcher(CODE_KEYWORDS)

// Exported so it can be unit tested without invoking a real model.
export function classifyProblem(problem) {
  const text = String(problem || '').toLowerCase()

  if (DATABASE_PATTERN.test(text)) {
    return 'database'
  }
  if (DEVOPS_PATTERN.test(text)) {
    return 'devops'
  }
  if (CODE_PATTERN.test(text)) {
    return 'code'
  }
  return 'general'
}

export async function runOrchestrator(problem, userId = null) {
  const category = classifyProblem(problem)

  let diagnosis
  switch (category) {
    case 'database':
      diagnosis = await runDatabaseAgent(problem, userId)
      break
    case 'code':
      diagnosis = await runCodeAgent(problem, userId)
      break
    case 'devops':
      diagnosis = await runDevopsAgent(problem, userId)
      break
    default:
      diagnosis = await runTroubleshootingAgent(problem, userId)
  }

  return { agentUsed: category, ...diagnosis }
}
