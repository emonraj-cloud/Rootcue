import { parseAiJson } from '../src/utils/parseAiJson.js'

describe('parseAiJson', () => {
  it('parses clean JSON', () => {
    const result = parseAiJson('{"a": 1}')
    expect(result.a).toBe(1)
  })

  it('strips markdown code fences', () => {
    const result = parseAiJson('```json\n{"a": 2}\n```')
    expect(result.a).toBe(2)
  })

  it('extracts JSON even with extra text around it', () => {
    const result = parseAiJson('Here is the answer: {"a": 3} Thanks!')
    expect(result.a).toBe(3)
  })

  it('throws when there is no JSON object', () => {
    expect(() => parseAiJson('no json here')).toThrow()
  })
})
