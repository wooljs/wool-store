/*
 * Copyright 2017 Nicolas Lochet Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is
 * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

'use strict'

let test = require('tape')
  , Store = require(__dirname + '/../index.js').Store
  , newId = () => (Date.now().toString(16))

test('set subGlobal set del', async function(t) {
  let store = Store.build()
    , id = newId()
    , src = 'test'
    , i = 0

  await store.set(id, 42)

  await store.subGlobal(src, function(id, value, type) {
    switch (i) {
    case 0:
      t.deepEqual(value, 'plop')
      t.deepEqual(type, 'set')
      break
    case 1:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'set')
      break
    case 2:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'del')
      break
    default:
      t.fail('too much call')
      break
    }
    i += 1
  })

  await store.set(id, 'plop')

  await store.set(id, {foo: 'bar'})

  await store.del(id)

  t.deepEqual(i, 3)

  t.plan(7)
  t.end()
})

test('set sub set del', async function(t) {
  let store = Store.build()
    , id = newId()
    , src = 'test'
    , i = 0

  await store.set(id, 42)

  await store.sub(src, id, function(id, value, type) {
    switch (i) {
    case 0:
      t.deepEqual(value, 'plop')
      t.deepEqual(type, 'set')
      break
    case 1:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'set')
      break
    case 2:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'del')
      break
    default:
      t.fail('too much call')
      break
    }
    i += 1
  })

  await store.set(id, 'plop')

  await store.set(id, {foo: 'bar'})

  await store.del(id)

  t.deepEqual(i, 3)

  t.plan(7)
  t.end()
})

test('set subGlobal+cb set set unsubGlobal set del', async function(t) {
  let store = Store.build()
    , id = newId()
    , src = 'test'
    , i = 0

  await store.set(id, 42)

  await store.subGlobal(src, function(id, value, type) {
    switch (i) {
    case 0:
      t.deepEqual(value, 'plop')
      t.deepEqual(type, 'set')
      break
    case 1:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'set')
      break
    default:
      t.fail('too much call')
      break
    }
    i += 1
  })

  await store.set(id, 'plop')

  await store.set(id, {foo: 'bar'})

  await store.unsubGlobal(src)

  await store.set(id, 'boom')

  await store.del(id)

  t.deepEqual(i, 2)

  t.plan(5)
  t.end()
})

test('set sub+cb set set unsub set del', async function(t) {
  let store = Store.build()
    , id = newId()
    , src = 'test'
    , i = 0

  await store.set(id, 42)

  await store.sub(src, id, function(id, value, type) {
    switch (i) {
    case 0:
      t.deepEqual(value, 42)
      t.deepEqual(type, 'sub')
      break
    case 1:
      t.deepEqual(value, 'plop')
      t.deepEqual(type, 'set')
      break
    case 2:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'set')
      break
    default:
      t.fail('too much call')
      break
    }
    i += 1
  }, true)

  await store.set(id, 'plop')

  await store.set(id, {foo: 'bar'})

  await store.unsub(src, id)

  await store.set(id, 'boom')

  await store.del(id)

  t.deepEqual(i, 3)

  t.plan(7)
  t.end()
})

test('set sub+cb set subGlobal set set unsubEveryWhere set del', async function(t) {
  let store = Store.build()
    , id = newId()
    , src = 'test'
    , i = 0

  await store.set(id, 42)

  await store.sub(src, id, function(id, value, type) {
    switch (i) {
    case 0:
      t.deepEqual(value, 42)
      t.deepEqual(type, 'sub')
      break
    case 1:
      t.deepEqual(value, 'plop')
      t.deepEqual(type, 'set')
      break
    case 2:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'set')
      break
    default:
      t.fail('too much call')
      break
    }
    i += 1
  }, true)

  await store.set(id, 'plop')

  await store.subGlobal(src, function(id, value, type) {
    switch (i) {
    case 1:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'set')
      break
    case 2:
      t.deepEqual(value, 'boom')
      t.deepEqual(type, 'set')
      break
    default:
      t.fail('too much call')
      break
    }
  })
  await store.set(id, {foo: 'bar'})

  await store.set(id, 'boom')

  await store.unsubEveryWhere(src)

  await store.set(id, 'boom')

  await store.del(id)

  t.deepEqual(i, 5)

  t.plan(9)
  t.end()
})

test('set find', async function(t) {
  let store = Store.build()
    , data = [
      ['Prefix: 42', 42],
      ['Prefix: 142', 'this is a string'],
      ['Prefix: 513', [1, 2, 3, 4]],
      ['Prefix: foo', {foo: 'bar'}],
      ['Prefix: BaR6', {bar: 'bar'}],
      ['Other: 42', 42],
      ['Other: foo', {foo: 'bar'}],
      ['Other: BaR6', {bar: 'bar'}]
    ]
    , found

  await Promise.all(data.map(async([k,v])=>store.set(k,v)))

  found = []
  for (let e of store.find()) {
    found.push(e)
  }

  t.deepEqual(found.length, 8)
  t.deepEqual(found, data)

  found = []
  for (let e of store.find(/^Prefix: /)) {
    found.push(e)
  }

  t.deepEqual(found.length, 5)
  t.deepEqual(found, [
    ['Prefix: 42', 42],
    ['Prefix: 142', 'this is a string'],
    ['Prefix: 513', [1, 2, 3, 4]],
    ['Prefix: foo', {foo: 'bar'}],
    ['Prefix: BaR6', {bar: 'bar'}]
  ])

  found = []
  for (let e of store.find(([,v]) => typeof v === 'object')) {
    found.push(e)
  }

  t.deepEqual(found.length, 5)
  t.deepEqual(found, [
    ['Prefix: 513', [1, 2, 3, 4]],
    ['Prefix: foo', {foo: 'bar'}],
    ['Prefix: BaR6', {bar: 'bar'}],
    ['Other: foo', {foo: 'bar'}],
    ['Other: BaR6', {bar: 'bar'}]
  ])

  t.plan(6)
  t.end()
})
