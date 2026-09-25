import { runJsonDiagnosisAgent } from './baseJsonAgent.js'

export async function runTroubleshootingAgent(problem, userId = null) {
  return runJsonDiagnosisAgent(problem, 'an expert general IT troubleshooting assistant', userId)
}
