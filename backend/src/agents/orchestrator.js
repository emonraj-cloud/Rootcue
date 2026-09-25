import { runTroubleshootingAgent } from './troubleshootingAgent.js'
import { runDatabaseAgent } from './databaseAgent.js'
import { runCodeAgent } from './codeAgent.js'
import { runDevopsAgent } from './devopsAgent.js'

const DATABASE_KEYWORDS = ['sql', 'database', 'postgres', 'postgresql', 'mysql', 'query', 'table', 'schema', 'migration']
const CODE_KEYWORDS = ['error', 'exception', 'code', 'bug', 'syntax', 'stack trace', 'undefined', 'null pointer', 'compile']
const DEVOPS_KEYWORDS = ['docker', 'container', 'network', 'port', 'dns', 'ip address', 'subnet', 'firewall', 'service', 'deployment']

function classifyProblem(problem) {
  const text = problem.toLowerCase()

  if (DATABASE_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'database'
  }
  if (DEVOPS_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'devops'
  }
  if (CODE_KEYWORDS.some((keyword) => text.includes(keyword))) {
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
