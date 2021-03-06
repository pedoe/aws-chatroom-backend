$(document).ready(() => {
    if ($('.chat.page')) {
        let FADE_TIME = 150 //ms
        let TYPING_TIMER_LENGTH = 400 //ms
        let COLORS = [
            '#e21400', '#91580f', '#f8a700', '#f78b00',
            '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
            '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
        ]
        let $messages = $('.messages')
        let $usernameInput = $('.usernameInput')
        let $inputMessage = $('.inputMessage')
            // Initialize variables
        let $window = $(window)
        let username = null
        let roomname = null
        let connected = true
        let typing = false
        let lastTypingTime
        let $currentInput = $usernameInput.focus()
        let $chatPage = $('.chat.page')
        let socket = io()
        $('.chat.page').show()

        function addParticipantsMessage(data) {
            let message = ''
            console.log(data)
            if (data.numUsers === 1) {
                message += "there's 1 participant"
            } else {
                message += "there are " + data.numUsers + " participants"
            }
            log(message)
        }
        // Sets the client's username
        function setUsername() {

            username = $('.username').text();
            roomname = $('.roomname').text();
            console.log('username: ', username)
                // If the username is valid
            if (username) {
                $chatPage.show()
                $currentInput = $inputMessage.focus()

                // Tell the server your username
                socket.emit('add user', username, roomname)
                socket.emit('join room', username, roomname)
            }

        }
        setUsername()

        // Sends a chat message in room
        function sendMessageRoom() {
            let message = $inputMessage.val()
                // Prevent markup from being injected into the message
            message = cleanInput(message)
            console.log('func send room: ', username)
                // if there is a non-empty message and a socket connection
            if (message && connected) {
                $inputMessage.val('')
                addChatMessage({
                        username: username,
                        message: message
                    })
                    // tell server to execute 'new message' and send along one parameter
                socket.emit('room chat', message)
            }
        }

        // Log a message
        function log(message, options) {
            let $el = $('<li>').addClass('log').text(message)
            addMessageElement($el, options)
        }

        // Adds the visual chat message to the message list
        function addChatMessage(data, options) {
            // Don't fade the message in if there is an 'X was typing'
            let $typingMessages = getTypingMessages(data)
            options = options || {}
            if ($typingMessages.length !== 0) {
                options.fade = false
                $typeMessages.remove()
            }

            let $usernameDiv = $('<span class="username"/>')
                .text(data.username)
                .css('color', getUsernameColor(data.username))
            let $messageBodyDiv = $('<span class="messageBody">')
                .text(data.message)

            let typingClass = data.typing ? 'typing' : ''
            let $messageDiv = $('<li class="message"/>')
                .data('username', data.username)
                .addClass(typingClass)
                .append($usernameDiv, $messageBodyDiv)

            addMessageElement($messageDiv, options)
        }

        // Adds the visual chat typing message
        function addChatTyping(data) {
            data.typing = true
            data.message = 'is typing'
            addChatMessage(data)
        }

        // Removes the visual chat typing message
        function removeChatTyping(data) {
            getTypingMessages(data).fadeOut(() => {
                $(this).remove()
            })
        }

        // Adds a message element to the messages and scrolls to the bottom
        // el - The element to add as a message
        // options.fade - If the element should fade-in (default = true)
        // options.prepend - If the element should prepend
        // all other messages (default = false)
        function addMessageElement(el, options) {
            let $el = $(el)

            // Setup default options
            if (!options) {
                options = {}
            }

            if (typeof options.fade === 'undefined') {
                options.fade = true
            }

            if (typeof options.prepend === 'undefined') {
                options.prepend = false
            }
            // Apply options
            if (options.fade) {
                $el.hide().fadeIn(FADE_TIME)
            }

            if (options.prepend) {
                $messages.prepend($el)
            } else {
                $messages.append($el)
            }
            $messages[0].scrollTop = $messages[0].scrollHeight
        }

        // Prevent input from having injected markup
        function cleanInput(input) {
            return $('<div/>').text(input).html()
        }

        // Updates the typing event
        function updateTyping() {
            if (connected) {
                if (!typing) {
                    typing = true
                    socket.emit('typing')
                }
                lastTypingTime = (new Date()).getTime()

                setTimeout(() => {
                    let typingTimer = (new Date()).getTime()
                    let timeDiff = typingTimer - lastTypingTime
                    if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                        socket.emit('stop typing')
                        typing = false
                    }
                }, TYPING_TIMER_LENGTH)
            }
        }

        // Gets the 'X is typing' messages of a user
        function getTypingMessages(data) {
            return $('.typing.message').filter((i) => {
                return $(this).data('username') === data.username
            })
        }

        // Gets the color of a username through our hash function
        function getUsernameColor(username) {
            // Compute hash function
            let hash = 7
            for (let i = 0; i < username.length; i++) {
                hash = username.charCodeAt(i) + (hash << 5) - hash
            }
            // Calculate color
            let index = Math.abs(hash % COLORS.length)
            return COLORS[index]
        }

        // Keyboard events

        $window.keydown(function(event) {
            // Auto-focus the current input when a key is typed
            if (!(event.ctrlKey || event.metaKey || event.altKey)) {
                $currentInput.focus();
            }
            // When the client hits ENTER on their keyboard
            if (event.which === 13) {
                console.log('enter')
                sendMessageRoom();
                socket.emit('stop typing');
                typing = false;
            }
        });

        $inputMessage.on('input', () => {
            updateTyping()
        })

        // Focus input when clicking on the message input's border
        $inputMessage.click(() => {
                $inputMessage.focus()
            })
            // Socket events

        // Whenever the server emit's 'login', log the login message
        socket.on('login', (data) => {
            connected = true
                // Display the welcome message
            let message = "Welcome to Socket.IO Chat"
            log(message, {
                prepend: true
            })
            addParticipantsMessage(data)
        })

        // Whenever the server emit's 'new message', update the chat body
        socket.on('new message', (data) => {
            console.log('new msg')
            addChatMessage(data)
        })

        socket.on('new room chat', (data) => {
            console.log('room chat')
            addChatMessage(data)
        })

        socket.on('user joined', (data) => {
            log(data.username + ' joined')
            addParticipantsMessage(data)
        })

        socket.on('user left', (data) => {
            log(data.username + ' left')
            addParticipantsMessage(data)
            removeChatTyping(data)
        })

        socket.on('typing', (data) => {
            addChatTyping(data)
        })

        socket.on('stop typing', (data) => {
            removeChatTyping(data)
        })

        socket.on('disconnect', () => {
            log('You have been disconnected')
        })

        socket.on('reconnect', () => {
            log('You have been reconnected')
            if (username) {
                socket.emit('add user', username, room)
            }
        })

        socket.on('reconnect_error', () => {
            log('attempt to reconnect has failed')
        })
    }
})