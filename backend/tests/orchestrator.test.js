import { classifyProblem } from '../src/agents/orchestrator.js'

describe('classifyProblem', () => {
  it('routes database problems', () => {
    const problems = [
      'PostgreSQL connection refused on port 5432',
      'My SQL query is slow, full table scan',
      'relation does not exist when running the migration',
      'too many connections already',
      'redis cache is not reachable'
    ]
    problems.forEach((problem) => {
      expect(classifyProblem(problem)).toBe('database')
    })
  })

  it('routes devops problems', () => {
    const problems = [
      'Docker container will not start',
      'Kubernetes pod keeps restarting with OOMKilled',
      'Nginx returns 502 Bad Gateway intermittently',
      'npm deploy to staging failed',
      'CI/CD pipeline fails on GitHub Actions',
      'Serverless function times out',
      'ssl certificate expired on the load balancer',
      'server is out of memory on ubuntu'
    ]
    problems.forEach((problem) => {
      expect(classifyProblem(problem)).toBe('devops')
    })
  })

  it('routes code problems', () => {
    const problems = [
      'JavaScript TypeError undefined is not a function',
      'React component throws a syntax error',
      'My app shows a blank page after build',
      'segfault in the compiled binary',
      'traceback: most recent call last'
    ]
    problems.forEach((problem) => {
      expect(classifyProblem(problem)).toBe('code')
    })
  })

  it('falls back to general', () => {
    const problems = [
      'laptop fan is making a loud noise',
      'my printer is offline',
      'how do I reset my account'
    ]
    problems.forEach((problem) => {
      expect(classifyProblem(problem)).toBe('general')
    })
  })

  // Keywords are matched on word boundaries. Raw substring matching
  // previously routed these to the devops or code agent because
  // "port" is inside "support" and "export" is a common English word.
  it('does not match keywords inside unrelated words', () => {
    expect(classifyProblem('How do I contact support for my account?')).toBe('general')
    expect(classifyProblem('The important report is missing')).toBe('general')
    expect(classifyProblem('I need transport for the export data')).toBe('general')
  })

  it('handles missing input without throwing', () => {
    expect(classifyProblem('')).toBe('general')
    expect(classifyProblem(undefined)).toBe('general')
  })
})
