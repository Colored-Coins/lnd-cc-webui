import path from 'path'
import fs from 'fs'
import { Tail } from 'tail'

const { LND_PATH } = process.env

module.exports = (req, res, next) => {
  const wid = req.params.wid
      , logpath = path.join(LND_PATH, wid, 'proc.log')

  req.socket.setKeepAlive(true);
  req.socket.setTimeout(0);

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.status(200);
  res.flushHeaders()

  const rs = fs.createReadStream(logpath)
  rs.on('data', d => res.write(d))
  rs.on('end', _ => {
    const tail = new Tail(logpath)
    tail.on('line', d => res.write(d+'\n'))
    tail.on('error', err => console.error(err.stack || err))

    res.on('close', _ => tail.unwatch())
  })

}
