import express from 'express'
import socketio from 'socket.io'
import http from 'http'
import browserify from 'browserify-middleware'
import Rx, { Observable as O } from 'rx'
import RxNode from 'rx-node'
import { throwerr, printerr } from 'iferr'
import grpc from 'grpc'
import lnrpc from 'lnrpc'
import logstream from 'lnd-logstream'
import { dbg } from './util'

require('longjohn')

const debug = require('debug')('LnCC')
    , { Lightning, SendRequest, CloseChannelRequest, ChannelPoint, GetInfoRequest } = lnrpc
    , toChannelPoint = ({ txid, index }) => new ChannelPoint(new Buffer(txid, 'hex'), +index)
    , merge = (...xs) => Object.assign({}, ...xs)

// Setup LN RPC clients
const lnClients = {
  bob:   new Lightning(process.env.BOB_LNRPC, grpc.credentials.createInsecure())
, alice: new Lightning(process.env.ALICE_LNRPC, grpc.credentials.createInsecure())
}, nodeIds = {}, otherMap = { bob: 'alice', alice: 'bob' }, sendCalls={}

// Load lightning_id for all clients
Object.keys(lnClients).forEach(
    k => lnClients[k].getInfo(new GetInfoRequest, throwerr(
        info => nodeIds[k] = new Buffer(info.lightning_id, 'hex'))))

// Setup log streams
const lnStreams = {
  bob:   logstream(process.env.BOB_LOG)
, alice: logstream(process.env.ALICE_LOG)
}

const log$ = O.merge(...Object.keys(lnStreams).map(client => lnStreams[client].map(x => merge(x, { client }))))
dbg('log$', log$)

// Express
const app = express()

app.set('port', process.env.PORT || 9000)
app.set('view engine', 'jade')

app.use(require('morgan')('dev'))

app.get('/', (req, res) => res.render(__dirname + '/views/index'))
app.get('/_.js', browserify(__dirname + '/client.js'))
app.use('/_', express.static(__dirname + '/static'))

const server = http.Server(app)

// RPC action handlers
const rpcActions = {
  pay: (client, req) => {
    let isNew = false, call = sendCalls[req.client] || (isNew = true, sendCalls[req.client] = client.sendPayment())
    call.write(new SendRequest(nodeIds[otherMap[req.client]], +req.amount))
    return isNew ? RxNode.fromStream(call) : O.empty()
  }
, settle: (client, req) => {
    const request = new CloseChannelRequest(toChannelPoint(req.channelPoint))
    return RxNode.fromStream(client.closeChannel(request))
  }
}

// Socket.io
const io = socketio(server)
io.set('transports', ['websocket'])
io.addEventListener = io.on // hack for RxJS compatibility

const rpcRequest$ = O.fromEvent(io, 'connection').flatMap(socket => O.fromEvent(socket, 'rpc'))
const rpcReply$ = rpcRequest$.flatMap(req => rpcActions[req.action](lnClients[req.client], req))

dbg('rpcRequest$', rpcRequest$)
dbg('rpcReply$', rpcReply$)

log$.subscribe(x => io.emit('log', x))

// Go
server.listen(app.get('port'), _ => console.log(`Listening on ${app.get('port')}`))
