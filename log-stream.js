import path from 'path'
import fs from 'fs'
import { Tail } from 'tail'

const { LND_PATH, LND_NETWORK } = process.env

module.exports = (req, res, next) => {
  const wid = req.params.wid
      , logpath = path.join(LND_PATH, wid, 'logs', LND_NETWORK, 'lnd.log')

  req.socket.setKeepAlive(true);
  req.socket.setTimeout(0);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.status(200);
  res.flushHeaders()

  const rs = fs.createReadStream(logpath)
  rs.on('data', d => res.write(d))
  rs.on('error', err => console.error(err.stack || err))
  rs.on('end', _ => {
    const tail = new Tail(logpath)
        , keepAlive = setInterval(_ => res.write('\u200b')/*zero-width space*/, 20000)

    tail.on('line', d => res.write(d+'\n'))
    tail.on('error', err => console.error(err.stack || err))

    res.on('close', _ => (clearInterval(keepAlive), tail.unwatch()))
  })
}
