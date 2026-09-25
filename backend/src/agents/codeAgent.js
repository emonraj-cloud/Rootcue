import { runJsonDiagnosisAgent } from './baseJsonAgent.js'

export async function runCodeAgent(problem, userId = null) {
  return runJsonDiagnosisAgent(
    problem,
    'an expert software engineer specializing in debugging code errors, exceptions, and syntax problems across common languages and frameworks',
    userId
  )
}
