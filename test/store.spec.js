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

test('set subAll set del', function(t) {
  let store = Store.build()
    , id = Store.newId()
    , src = 'test'
    , i = 0

  store.set(id, 42)

  store.subAll(src, function(id, value, type) {
    switch (i) {
    case 0:
      t.deepEqual(value, 'plop')
      t.deepEqual(type, 'update')
      break
    case 1:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'update')
      break
    case 2:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'delete')
      break
    default:
      t.fail('too much call')
      break
    }
    i += 1
  })

  store.set(id, 'plop')

  store.set(id, {foo: 'bar'})

  store.del(id)

  t.deepEqual(i, 3)

  t.plan(7)
  t.end()
})

test('set sub set del', function(t) {
  let store = Store.build()
    , id = Store.newId()
    , src = 'test'
    , i = 0

  store.set(id, 42)

  store.sub(id, src, function(id, value, type) {
    switch (i) {
    case 0:
      t.deepEqual(value, 'plop')
      t.deepEqual(type, 'update')
      break
    case 1:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'update')
      break
    case 2:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'delete')
      break
    default:
      t.fail('too much call')
      break
    }
    i += 1
  })

  store.set(id, 'plop')

  store.set(id, {foo: 'bar'})

  store.del(id)

  t.deepEqual(i, 3)

  t.plan(7)
  t.end()
})

test('set subAll+cb set set unsubAll set del', function(t) {
  let store = Store.build()
    , id = Store.newId()
    , src = 'test'
    , i = 0

  store.set(id, 42)

  store.subAll(src, function(id, value, type) {
    switch (i) {
    case 0:
      t.deepEqual(value, 'plop')
      t.deepEqual(type, 'update')
      break
    case 1:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'update')
      break
    default:
      t.fail('too much call')
      break
    }
    i += 1
  })

  store.set(id, 'plop')

  store.set(id, {foo: 'bar'})

  store.unsubAll(src)

  store.set(id, 'boom')

  store.del(id)

  t.deepEqual(i, 2)

  t.plan(5)
  t.end()
})

test('set sub+cb set set unsub set del', function(t) {
  let store = Store.build()
    , id = Store.newId()
    , src = 'test'
    , i = 0

  store.set(id, 42)

  store.sub(id, src, function(id, value, type) {
    switch (i) {
    case 0:
      t.deepEqual(value, 42)
      t.deepEqual(type, 'sub')
      break
    case 1:
      t.deepEqual(value, 'plop')
      t.deepEqual(type, 'update')
      break
    case 2:
      t.deepEqual(value, {foo: 'bar'})
      t.deepEqual(type, 'update')
      break
    default:
      t.fail('too much call')
      break
    }
    i += 1
  }, true)

  store.set(id, 'plop')

  store.set(id, {foo: 'bar'})

  store.unsub(id, src)

  store.set(id, 'boom')

  store.del(id)

  t.deepEqual(i, 3)

  t.plan(7)
  t.end()
})

test('set find', function(t) {
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

  data.forEach(([k,v])=>store.set(k,v))

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
