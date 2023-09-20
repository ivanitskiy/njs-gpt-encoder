// This file includes code which was modified from https://github.com/openai/gpt-2
// import { encoder } from './encoderall'

// The encoder content would be replaced at build time
const __encoder__ = ''
const encoder = JSON.parse(__encoder__)

// the BPE content will be replaced at build time
const __bpe_content__ = ''
const bpe_file = __bpe_content__

const range = (x, y) => {
  const res = Array.from(Array(y).keys()).slice(x)
  return res
}

const ord = (x) => {
  return x.charCodeAt(0)
}

const chr = (x) => {
  return String.fromCharCode(x)
}

const textEncoder = new TextEncoder('utf-8')
const encodeStr = (str) => {
  return Array.from(textEncoder.encode(str)).map((x) => x.toString())
}

const textDecoder = new TextDecoder('utf-8')
const decodeStr = (arr) => {
  return textDecoder.decode(new Uint8Array(arr))
}

const dictZip = (x, y) => {
  const result = {}
  x.map((_, i) => {
    result[x[i]] = y[i]
  })
  return result
}

function bytes_to_unicode() {
  const bs = range(ord('!'), ord('~') + 1).concat(
    range(ord('¡'), ord('¬') + 1),
    range(ord('®'), ord('ÿ') + 1)
  )

  let cs = bs.slice()
  let n = 0
  for (let b = 0; b < 2 ** 8; b++) {
    if (!bs.includes(b)) {
      bs.push(b)
      cs.push(2 ** 8 + n)
      n = n + 1
    }
  }

  cs = cs.map((x) => chr(x))

  const result = {}
  bs.map((_, i) => {
    result[bs[i]] = cs[i]
  })
  return result
}

// Polyfill for Set-like behavior using an array
function SetPolyfill() {
  this.data = []
}

SetPolyfill.prototype.add = function (item) {
  if (!this.has(item)) {
    this.data.push(item)
  }
}

SetPolyfill.prototype.has = function (item) {
  return this.data.indexOf(item) !== -1
}

SetPolyfill.prototype.delete = function (item) {
  const index = this.data.indexOf(item)
  if (index !== -1) {
    this.data.splice(index, 1)
    return true
  }
  return false
}

SetPolyfill.prototype.forEach = function (callback) {
  for (let i = 0; i < this.data.length; i++) {
    let item = this.data[i]
    callback(item, item, this)
  }
}

function get_pairs(word) {
  const pairs = new SetPolyfill()
  let prev_char = word[0]
  for (let i = 1; i < word.length; i++) {
    const char = word[i]
    pairs.add([prev_char, char])
    prev_char = char
  }
  return pairs
}

var pat = new RegExp(
  /'s|'t|'re|'ve|'m|'ll|'d|\w+|\d+|[^\s\w\d]+|\s+/.source,
  'gm'
)

const decoder = {}
Object.keys(encoder).map((x) => {
  decoder[encoder[x]] = x
})

const lines = bpe_file.split('\n')

const bpe_merges = lines.slice(1, lines.length - 1).map((x) => {
  return x.split(/(\s+)/).filter(function (e) {
    return e.trim().length > 0
  })
})

const byte_encoder = bytes_to_unicode()
const byte_decoder = {}
Object.keys(byte_encoder).map((x) => {
  byte_decoder[byte_encoder[x]] = x
})

const bpe_ranks = dictZip(bpe_merges, range(0, bpe_merges.length))

function BudgetMap(init) {
  this.clear()
  if (init)
    for (let i = 0; i < init.length; i++) this.set(init[i][0], init[i][1])
}

BudgetMap.prototype.clear = function () {
  this._map = {}
  this._keys = []
  this.size = 0
}

BudgetMap.prototype.get = function (key) {
  return this._map['map_' + key]
}

BudgetMap.prototype.set = function (key, value) {
  this._map['map_' + key] = value
  if (this._keys.indexOf(key) < 0) this._keys.push(key)
  this.size = this._keys.length
  return this
}

BudgetMap.prototype.has = function (key) {
  return this._keys.indexOf(key) >= 0
}

BudgetMap.prototype.delete = function (key) {
  const idx = this._keys.indexOf(key)
  if (idx < 0) return false
  delete this._map['map_' + key]
  this._keys.splice(idx, 1)
  this.size = this._keys.length
  return true
}

BudgetMap.prototype.keys = function () {
  return {
    _keys: this._keys,
    _idx: 0,
    next: function () {
      if (this._idx < this._keys.length)
        return { value: this._keys[this._idx++], done: false }
      return { value: undefined, done: true }
    },
  }
}

BudgetMap.prototype.forEach = function (callback, thisArg) {
  for (let i = 0; i < this._keys.length; i++)
    callback.call(
      thisArg,
      this._map['map_' + this._keys[i]],
      this._keys[i],
      this
    )
}

// const cache = new Map()
const cache = new BudgetMap()

function bpe(token) {
  if (cache.has(token)) {
    return cache.get(token)
  }

  let word = token.split('')

  let pairs = get_pairs(word)

  if (!pairs) {
    return token
  }

  while (true) {
    const minPairs = {}
    Array.from(pairs).map((pair) => {
      const rank = bpe_ranks[pair]
      minPairs[isNaN(rank) ? 10e10 : rank] = pair
    })

    const b = Object.keys(minPairs).map((x) => {
      return parseInt(x)
    })
    const bigram = minPairs[Math.min(b)]

    if (!(bigram in bpe_ranks)) {
      break
    }

    const first = bigram[0]
    const second = bigram[1]
    let new_word = []
    let i = 0

    while (i < word.length) {
      const j = word.indexOf(first, i)
      if (j === -1) {
        new_word = new_word.concat(word.slice(i))
        break
      }
      new_word = new_word.concat(word.slice(i, j))
      i = j

      if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
        new_word.push(first + second)
        i = i + 2
      } else {
        new_word.push(word[i])
        i = i + 1
      }
    }

    word = new_word
    if (word.length === 1) {
      break
    } else {
      pairs = get_pairs(word)
    }
  }

  word = word.join(' ')
  cache.set(token, word)

  return word
}

export function encode(text) {
  ngx.log(ngx.INFO, `encode invoked: ${text}`)
  let bpe_tokens = []
  // const matches = Array.from(text.matchAll(pat)).map((x) => x[0])
  const results = text.match(pat)
  ngx.log(ngx.INFO, `text.match ${JSON.stringify(results)}`)

  const matches = Array.from(results).map((x) => x[0])
  ngx.log(ngx.INFO, `matches: ${matches}`)

  for (let i = 0; i < matches.length; i++) {
    let token = matches[i]
    token = encodeStr(token)
      .map((x) => {
        return byte_encoder[x]
      })
      .join('')
    ngx.log(ngx.INFO, `token: ${token}`)
    const new_tokens = bpe(token)
      .split(' ')
      .map((x) => encoder[x])
    ngx.log(ngx.INFO, `new_tokens: ${new_tokens}`)
    bpe_tokens = bpe_tokens.concat(new_tokens)
  }
  return bpe_tokens
}

export function decode(tokens) {
  let text = tokens.map((x) => decoder[x]).join('')
  text = decodeStr(text.split('').map((x) => byte_decoder[x]))
  return text
}
