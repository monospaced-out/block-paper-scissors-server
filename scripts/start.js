const express = require('express')
const http = require('http')

const app = express()

const server = http.createServer(app)
const io = require('socket.io')(server, {
  pingTimeout: 2000,
  pingInterval: 900
})

const DEFAULT_PORT = process.env.PORT || 8080;

let clients = [];

io.on('connection', function (socket) {
  socket.on('introduction', function (introData) {
    let myAddress = introData.address

    clients.push({address: introData.address, socket: socket})
    io.sockets.emit('addresses', clients.map(client => client.address))

    socket.on('disconnect', function () {
      clients = clients.filter(c => c.address !== myAddress)
      io.sockets.emit('addresses', clients.map(client => client.address))
    })

    socket.on('sendMessage', function ({ recipient, message, meta }) {
      let matches = clients.filter(c => c.address === recipient)
      let target = matches.length ? matches[0] : null
      if (target) {
        target.socket.emit('receiveMessage', { sender: myAddress, message, meta })
      }
    })
  })
})

server.listen(DEFAULT_PORT, function listening() {
  console.log('Listening on %d', server.address().port);
})
