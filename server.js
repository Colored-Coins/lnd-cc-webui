import express from 'express'
import { Observable as O } from 'rx'
import only from 'only'
import request from 'superagent'
import { throwerr, printerr } from 'iferr'
import grpc from 'grpc'
import { dbgStreams, errorFormatter } from './util'

process.env.NODE_ENV != 'production' && require('longjohn')

const manager_uri = process.env.LND_ORCHESTRATOR_URI

// Initalize Express, Socket.io & Redis
, app   = express()
, http  = require('http').Server(app)
, io    = require('socket.io')(http)
, rread = require('redis').createClient(process.env.REDIS_URI)

// Model
, { walletEvents } = require('./model')(rread)

// Setup Express
app.set('port', process.env.PORT || 9000)
app.set('host', process.env.HOST || '127.0.0.1')
Object.assign(app.locals, { url: process.env.URL, static_url: process.env.STATIC_URL, version: process.env.VER})

app.use(require('morgan')('dev'))

app.get('/log/:wid', require('./log-stream'))

app.get('/', (req, res) => res.render(__dirname+'/index.jade'))
app.get('/-.js', require('browserify-middleware')(__dirname + '/client.js'))
app.get('/-.css', require('stylus').middleware({ src: _ => __dirname+'/style.styl', dest: _ => __dirname+'/static/-.css' }))
app.use('/', express.static(__dirname + '/static'))

// Setup Socket.io
io.set('transports', [ 'websocket' ])
io.addEventListener = io.on // hack for RxJS compatibility @XXX ensure that unsubscribing works too

const

  socketStream = name => conn$.flatMap(s => O.fromEvent(s, name, (...a) => (console.log('socketstream',name,...a),[ s.id, ...a ]))).share()
, formatError = errorFormatter(app)

// Intent
, conn$   = O.fromEvent(io, 'connection').share()
, provis$ = conn$.flatMap(s => O.fromEvent(s, 'provision', _ => [ s.id ])).share()
, assoc$  = conn$.flatMap(s => O.fromEvent(s, 'associate', wid => [ s.id, wid ])).share()
, pay$    = socketStream('pay') // conn$.flatMap(s => O.fromEvent(s, 'pay', (...a) => [ s.id, ...a ])).share()
, settle$ = conn$.flatMap(s => O.fromEvent(s, 'settle', wid => [ s.id, wid ])).share()
, discon$ = conn$.flatMap(s => O.fromEvent(s, 'disconnect', reason => [ s.id, reason ])).share()

// Translate intent to outgoing HTTP requests for lnd-orchestrator
, httpReq$ = O.merge(
    provis$.map(([ sid ])                    => [ sid, 'post', '/provision', null, r => [ 'provisioned', r.text ] ])
  , assoc$.map (([ sid, wid ])               => [ sid, 'get',  `/w/${wid}`,  null, r => [ 'wallet', only(r.body, 'idpub balance') ] ])
  , pay$.map   (([ sid, wid, dest, amount ]) => [ sid, 'post', `/w/${wid}/pay`, { dest, amount } ])
  , settle$.map(([ sid, wid ])               => [ sid, 'post', `/w/${wid}/settle` ])
  )

// Execute requests, transform results
, httpRes$ = httpReq$.flatMap(([ sid, method, path, data, tr ]) =>
    O.fromNodeCallback(request[method])(manager_uri+path, data)
      .flatMap(resp => tr ? O.of([ sid, ...tr(resp) ]) : O.empty())
      .catch(err => O.of([ sid, 'error', formatError(err) ] ))
  ).share()

// Stream of subscription requests ([ sid, wid ]), either from the 'associate' command or automatically following wallet provisioning
, subscribe$ = O.merge(assoc$, httpRes$.filter(x => x[1] == 'provisioned').map(([ sid, _, wid ]) => [ sid, wid ]))

// Transform subscription request stream to a notification stream of [ sid, ev_type, ...data  ]
, notification$ =  subscribe$.flatMap(([ sid, wid ]) => walletEvents(wid).map(e => [ sid, ...e ])) // @XXX leaky!

// Socket.io emit stream, merges HTTP responses and notifications
, emit$ = O.merge(httpRes$, notification$).map(([ sid, ...e ]) => [ sid, 'event', ...e  ])

// Sinks
emit$.subscribe(([ sid, ...e ]) => io.to(sid).emit(...e))

dbgStreams({ /*conn$,*/ provis$, assoc$, pay$, settle$, discon$, httpReq$, httpRes$, subscribe$, notification$, emit$ })

// Launch
http.listen(app.get('port'), app.get('host'), _ => console.log(`Listening on ${app.get('host')}:${app.get('port')}`))
