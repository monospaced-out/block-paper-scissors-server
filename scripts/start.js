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
    let myName = introData.name

    clients.push({ address: introData.address, name: myName, socket })
    io.sockets.emit('addresses', clients.map(client => { return { address: client.address, name: client.name } }))

    socket.on('disconnect', function () {
      clients = clients.filter(c => c.address !== myAddress)
      io.sockets.emit('addresses', clients.map(client => client.address))
    })

    socket.on('sendMessage', function ({ recipient, message, meta }) {
      let matches = clients.filter(c => c.address === recipient)
      let target = matches.length ? matches[0] : null
      let tempAddress = target ? target.address : null
      if (target) {
        target.socket.emit('receiveMessage', { sender: { name: myName, address: myAddress }, message, meta })
      }
    })
  })
})

server.listen(DEFAULT_PORT, function listening() {
  console.log('Listening on %d', server.address().port);
})
