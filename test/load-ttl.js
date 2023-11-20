const t = require('tap')
const LRU = require('../')

const c = new LRU({ max: 5, ttl: 1000 })

for (let i = 0; i < 9; i++) {
  c.set(i, i)
}

const d = new LRU(c)
const dump = c.dump()

d.load(dump)

// start will be different, it is expected
t.strictSame(
  d.dump().map((e) => ([e[0],{ ...e[1], start: 0 }])),
  dump.map((e) => ([e[0],{ ...e[1], start: 0 }]))
)
