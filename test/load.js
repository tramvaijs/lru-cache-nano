const t = require('tap')
const LRU = require('../')

const c = new LRU({ max: 5 })

for (let i = 0; i < 9; i++) {
  c.set(i, i)
}

const d = new LRU(c)
const dump = c.dump()

d.load(dump)

t.strictSame(d.dump(), dump)
