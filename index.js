#!/usr/bin/env node
'use strict'

const Promise = require('bluebird')
const typeforce = require('typeforce')
const express = require('express')
const superagent = require('superagent')
const request = require('superagent-promise')(superagent, Promise)
const bodyParser = require('body-parser')
// default limit is 100kb, which is not enough for receiving photos
// 50mb is a bit ridiculous, but ok for testing
const jsonParser = bodyParser.json({ limit: '50mb' })
const constants = require('@tradle/constants')
const CUR_HASH = constants.CUR_HASH
const TYPE = constants.TYPE
const app = express()
const port = Number(process.argv[2]) || 3000
const server = app.listen(port)
const providerPaths = ['cookie']
const TRADLE_SERVER_URL = 'http://127.0.0.1:44444'

providerPaths.forEach(providerPath => {
  // my webhook for Cookie bank was set to http://127.0.0.1/cookie
  app.post(`/${providerPath}`, jsonParser, function (req, res, next) {
    const event = req.body.event
    const data = req.body.data
    log(`received event: ${event}`)

    switch (event) {
      case 'chained':
        log(`wrote blockchain seal for ${data[TYPE]}: ${data[CUR_HASH]}`)
        // nothing here for now
        break
      case 'unchained':
        log(`detected blockchain seal for ${data[TYPE]}: ${data[CUR_HASH]}`)
        // nothing here for now
        break
      case 'message':
        log(`received "${data[TYPE] || 'untyped message'}"`)
        // nothing here for now
        break
      case 'application':
        // `data.forms` contains form objects

        // approve the product. This will create verifications
        // for all unverified forms in data.forms, and a product confirmation
        //
        // or you can create verifications yourself with sendVerification, and run approveProduct afterwards
        log(`approving product ${data.productType} for customer ${data.customer}`)
        return res.json({
          approve: true
        })

        // return approveProduct(providerPath, {
        //   customer: data.customer,
        //   productType: data.productType
        // })
        // .then(() => sendOK(res), next)
      default:
        log(`unknown event: ${event}`)
        break
    }

    // if we haven't handled it yet
    sendOK(res)
  })
})

app.use(defaultErrHandler)

log(`running on port ${port}`)

function sendOK (res) {
  res.status(200).end()
}

function approveProduct (provider, opts) {
  typeforce('String', provider)
  typeforce({
    customer: 'String',
    productType: 'String'
  }, opts, true)

  return post(opts, `${provider}/confirmation`)
}

function sendVerification (provider, opts) {
  typeforce('String', provider)
  typeforce({
    verifiedItem: 'String'
  }, opts, true)

  return post(opts, `${provider}/verification`)
}

function post (body, path) {
  return request
    .post(`${TRADLE_SERVER_URL}/${path}`)
    .send(body)
    .set('Accept', 'application/json')
    .end()
}

function log () {
  return console.log.apply(console, arguments)
}

function defaultErrHandler (err, req, res, next) {
  log(err)

  // webhooks don't handle responses (yet?)
  // so might as well give it a nice 200
  sendOK(res)
}
