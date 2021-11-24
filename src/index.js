const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { fullMessage, locationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const port = process.env.PORT || 3000

const viewsPath = path.join(__dirname, '../templates/views')
const rootDir = path.join(__dirname, '../public')

const app = express()
server = http.createServer(app)
const io = socketio(server)

app.use(express.static(rootDir))

// let count = 0

// server (emit) -> client (receive) - countUpdated
// client (emit) -> server (receive) - increment

io.on('connection', (socket) => {
    console.log('New web socket connection')

    socket.on('join', ({ username, room }, callback) => {
        const {error, user} = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', fullMessage(user.username, 'Welcome! '))
        io.to(user.room).emit('message', fullMessage(user.username, ` has joined`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

        // io.to.emit, socket.broadcast.to.emit
    })

    socket.on('sendMessage', (text, callback) => {
        const user = getUser(socket.id)
        console.log(user)

        const filter = new Filter()

        if (filter.isProfane(text)) {
            return callback('Profanity found')
        }

        socket.broadcast.to(user.room).emit('message', fullMessage(user.username, text))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', fullMessage(user.username, `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

        
    })

    socket.on('send-location', (location, callback) => {
        const user = getUser(socket.id)
        socket.to(user.room).emit('locMessage', locationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })
})

server.listen(port, () => {
    console.log('Server is on port ' + port)
})