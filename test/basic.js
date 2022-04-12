if (typeof performance === 'undefined') {
  global.performance = require('perf_hooks').performance
}
process.env.NODE_ENV = 'development'

const t = require('tap')
const LRU = require('../')

t.test('basic operation', t => {
  const c = new LRU({ max: 10 })
  for (let i = 0; i < 5; i++) {
    t.equal(c.set(i, i), c)
  }
  for (let i = 0; i < 5; i++) {
    t.equal(c.get(i), i)
  }
  t.equal(c.size, 5)
  t.equal(c.getRemainingTTL(1), Infinity, 'no ttl, so returns Infinity')
  t.equal(c.getRemainingTTL('not in cache'), 0, 'not in cache, no ttl')

  for (let i = 5; i < 10; i++) {
    c.set(i, i)
  }
  t.equal(c.size, 10)

  for (let i = 0; i < 5; i++) {
    // this doesn't do anything, but shouldn't be a problem.
    c.get(i, { updateAgeOnGet: true })
  }
  t.equal(c.size, 10)

  for (let i = 5; i < 10; i++) {
    c.get(i)
  }
  for (let i = 10; i < 15; i++) {
    c.set(i, i)
  }
  t.equal(c.size, 10)

  for (let i = 15; i < 20; i++) {
    c.set(i, i)
  }
  // got pruned and replaced
  t.equal(c.size, 10)

  for (let i = 0; i < 10; i++) {
    t.equal(c.get(i), undefined)
  }

  for (let i = 0; i < 9; i++) {
    c.set(i, i)
  }
  t.equal(c.size, 10)
  t.equal(c.delete(19), true)
  t.equal(c.delete(19), false)
  t.equal(c.size, 9)
  c.set(10, 10)
  t.equal(c.size, 10)

  c.clear()
  t.equal(c.size, 0)
  for (let i = 0; i < 10; i++) {
    c.set(i, i)
  }
  t.equal(c.size, 10)
  t.equal(c.has(0), true)
  t.equal(c.size, 10)
  c.set(true, 'true')
  t.equal(c.has(true), true)
  t.equal(c.get(true), 'true')
  c.delete(true)
  t.equal(c.has(true), false)

  t.end()
})

t.test('setting ttl with non-integer values', t => {
  t.throws(() => new LRU({ max: 10, ttl: 10.5 }), TypeError)
  t.throws(() => new LRU({ max: 10, ttl: -10 }), TypeError)
  t.throws(() => new LRU({ max: 10, ttl: 'banana' }), TypeError)
  t.throws(() => new LRU({ max: 10, ttl: Infinity }), TypeError)
  t.end()
})

t.test('delete from middle, reuses that index', t => {
  const c = new LRU({ max: 5 })
  for (let i = 0; i < 5; i++) {
    c.set(i, i)
  }
  c.delete(2)
  c.set(5, 5)
  t.strictSame(c.valList, [0, 1, 5, 3, 4])
  t.end()
})

t.test('peek does not disturb order', t => {
  const c = new LRU({ max: 5 })
  for (let i = 0; i < 5; i++) {
    c.set(i, i)
  }
  t.equal(c.peek(2), 2)
  t.end()
})
