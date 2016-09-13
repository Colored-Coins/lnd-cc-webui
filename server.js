import express from 'express'
import socketio from 'socket.io'
import http from 'http'
import browserify from 'browserify-middleware'
import Rx, { Observable as O } from 'rx'
import RxNode, { fromStream } from 'rx-node'
import { throwerr, printerr } from 'iferr'
import grpc from 'grpc'
import lnrpc from 'lnrpc'
import logstream from 'lnd-logstream'
import dbg from './dbg-stream'

const toChannelPoint = ({ txid, index }) => new ChannelPoint(new Buffer(txid, 'hex'), +index)
    , { Lightning, SendRequest, CloseChannelRequest, ChannelPoint, GetInfoRequest } = lnrpc

// Setup LN RPC clients
const lnClients = {
  bob:   new Lightning(process.env.BOB_LNRPC, grpc.credentials.createInsecure())
, alice: new Lightning(process.env.ALICE_LNRPC, grpc.credentials.createInsecure()) }
;((a, b) => (a._other=b, b._other=a))(lnClients.bob, lnClients.alice)

// Load lightning_id for all clients
Object.keys(lnClients).forEach(
    k => lnClients[k].getInfo(new GetInfoRequest, throwerr(
        info => lnClients[k]._lightning_id = new Buffer(info.lightning_id, 'hex'))))

// Setup a merged log stream for all clients, prepending the source client to the event tuple
const log$ = O.merge(
  logstream(process.env.BOB_LOG).map(ev => [ 'bob', ...ev ])
, logstream(process.env.ALICE_LOG).map(ev => [ 'alice', ...ev ]))

// Express-based HTTP interface
const app = express()
    , server = http.Server(app)

app.set('port', process.env.PORT || 9000)
app.set('view engine', 'jade')
app.set('views', __dirname + '/views')

app.use(require('morgan')('dev'))

app.get('/', (req, res) => res.render('index'))
app.get('/_.js', browserify(__dirname + '/client.js'))
app.use('/_', express.static(__dirname + '/static'))

// Socket.io-based WebSocket interface
const io = socketio(server)
io.set('transports', ['websocket'])
io.addEventListener = io.on // hack for RxJS compatibility

// RPC actions
const rpcActions = {
  pay: (c, amount) => {
    let isNew = false, stream = c._sendStream || (isNew = true, c._sendStream = c.sendPayment())
    stream.write(new SendRequest(c._other._lightning_id, +amount))
    return isNew ? fromStream(stream) : O.empty()
  }
, settle: (client, point) => fromStream(client.closeChannel(new CloseChannelRequest(toChannelPoint(point))))
}

// make a stream of incoming RPC requests, execute them and transform to a stream of RPC responses
const rpcRequest$ = O.fromEvent(io, 'connection').flatMap(socket => O.fromEvent(socket, 'rpc', (...a) => a)).share()
    , rpcReply$   = rpcRequest$.flatMap(([ client, action, ...a ]) => rpcActions[action](lnClients[client], ...a)).share()

// Announce ln log events & RPC replies to all clients (they're responsible for filtering the ones they care about)
log$.subscribe(ev => io.emit('log', ev))
rpcReply$.subscribe(r => io.emit('rpcReply', r))

// Launch
server.listen(app.get('port'), _ => console.log(`Listening on ${app.get('port')}`))
dbg({ /*log$,*/ rpcRequest$, rpcReply$ })
