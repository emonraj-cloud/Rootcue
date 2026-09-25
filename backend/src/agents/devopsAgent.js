import { runJsonDiagnosisAgent } from './baseJsonAgent.js'

export async function runDevopsAgent(problem, userId = null) {
  return runJsonDiagnosisAgent(
    problem,
    'an expert DevOps and networking engineer specializing in Docker, Windows/Linux services, ports, DNS, and IP/subnet issues',
    userId
  )
}
