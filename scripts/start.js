require('dotenv').config();

const express = require('express')
const http = require('http')
const app = express()
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient

const server = http.createServer(app)
const io = require('socket.io')(server, {
  pingTimeout: 2000,
  pingInterval: 900
})

const dbName = process.env.DB_NAME
const dbUrl = process.env.DB_URL

const DEFAULT_PORT = process.env.PORT || 8080

let clients = []

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

MongoClient.connect(dbUrl, (err, dbClient) => {
  if (err) return console.log(err)
  let db = dbClient.db(dbName)

  app.use(bodyParser.json())

  // CORS; https://enable-cors.org/server_expressjs.html
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
  })

  app.post('/save-result', (req, res) => {
    let key = String(req.body.key)
    let gameId = req.body.gameId
    let player = req.body.player
    let opponent = req.body.opponent
    let name = req.body.name
    db.collection('results').insertOne({ key, gameId, player, opponent, name }, (resultSaveErr) => {
      if (!resultSaveErr) {
        res.sendStatus(201)
      } else {
        console.log('error saving result', resultSaveErr)
        res.sendStatus(500)
      }
    })
  })

  app.get('/results', (req, res) => {
    db.collection('results').find().toArray((resultFetchErr, results) => {
      if (!resultFetchErr) {
        res.send(results)
      } else {
        console.log('error saving result', resultFetchErr)
        res.sendStatus(500)
      }
    })
  })

  server.listen(DEFAULT_PORT, function listening() {
    console.log('Listening on %d', server.address().port);
  })
})
