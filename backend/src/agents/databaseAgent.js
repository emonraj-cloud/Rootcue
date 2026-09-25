import { runJsonDiagnosisAgent } from './baseJsonAgent.js'

export async function runDatabaseAgent(problem, userId = null) {
  return runJsonDiagnosisAgent(
    problem,
    'an expert database engineer specializing in PostgreSQL, SQL, connection issues, schema design, and migrations',
    userId
  )
}
