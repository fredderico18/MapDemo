// *****************************************************************************
// Leaflet code
// *****************************************************************************

var mymap = L.map('mapid').setView([51.505, -0.09], 13);


L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1
}).addTo(mymap);

function onMapMove(e) {
    // only send if the event came from a mouse
    // (not the network)
    if (e.originalEvent != undefined) {
        if (gt.isConnected()) {
            gt.updateStateUnreliable(mymap.getCenter());
        }
    }
}

mymap.on('move', onMapMove);

function moveMap(lat, lng, id) {
    // only move from others
    if (id != gt.id) {
        mymap.setView([lat, lng], 13);
    }
}

// *****************************************************************************
// Window events
// *****************************************************************************

window.onload = handleOnLoad;

// *****************************************************************************
// Page components 
// *****************************************************************************

const btn = document.getElementById('btn');
const participantTable = document.getElementById('participantTable');
const nameField = document.getElementById('name');
const roomField = document.getElementById('room');
//const pageBody = document.getElementById('pageBody');

// *****************************************************************************
// Global variables
// *****************************************************************************

let userPressedDisconnect = false;
let reconnectInterval;

// *****************************************************************************
// GT user data structures
// *****************************************************************************

let userNameMap = new Map();
let userIDMap = new Map();
let userNameRowMap = new Map();
let userNameTeleMap = new Map();
var myUserRecord = undefined;

// *****************************************************************************
// UI event handlers
// *****************************************************************************

function handleOnLoad() {
    console.log("Page loaded");
}

btn.addEventListener('click', e => {
    if (gt.isConnected()) {
        userPressedDisconnect = true;
        gt.disconnect();
        btn.innerHTML = "Connect";
    } else {
        btn.innerHTML = "Disconnect";
        userPressedDisconnect = false;
        console.log('We are trying to connect.');

        if (myUserRecord != undefined) {
            // reconnect with my existing user info
            gt.connect(roomField.value, myUserRecord);
        } else {
            // connect with default user info
            gt.connect(roomField.value, {
                x: 0,
                y: 0,
                name: nameField.value,
                color: '#eeeeee',
                latency: "?"
            });
        }
    }
});

function changeUserColor(e) {
    //var user = userIDMap.get(gt.id);
    //console.log("Updating user color");
    gt.updateUserReliable({
        color: e.target.value
    });
}

// *****************************************************************************
// Functions for user records
// *****************************************************************************

function createUser(user, id) {
    // check whether user exists (i.e., a reconnect)
    if (userNameMap.has(user.name)) {
        // remap new id to user
        userIDMap.set(id, user);
        connectInParticipantList(id);
        // TODO: remove old id (look through users by name)
        // update user info in case anything's changed
        updateUser(user, id);
    } else {
        // create new user object
        userNameMap.set(user.name, user);
        userIDMap.set(id, user);
        createUserRepresentation(user, id);
    }
    // store my record for later reconnections
    if (id == gt.id) {
        myUserRecord = userIDMap.get(id);
    }
}

function updateUser(delta, id) {
    const user = userIDMap.get(id);
    // update the map first
    for (let key in delta) {
        user[key] = delta[key];
    }
    // update the visual representations
    updateUserRepresentation(user, delta, id);
}

// *****************************************************************************
// User representation (participant list and telepointer)
// *****************************************************************************

function createUserRepresentation(user, id) {
    // participant list
    createInParticipantList(user, id);
    // telepointer (for others)
    if (id != gt.id) {
        addTelepointer(user, id);
    }
}

function updateUserRepresentation(user, delta, id) {
    // get user's row in participant list
    const row = userNameRowMap.get(user.name);
    for (let key in delta) {
        //console.log(key, user[key], delta[key]);
        if (key == "color") {
            // split based on whether it's us or not
            if (id == gt.id) {
                row.cells[1].children[0].value = delta.color;
            } else {
                row.cells[1].children[0].style.backgroundColor = delta.color;
                // update telepointer for others
                let tele = userNameTeleMap.get(user.name);
                tele.children[0].setAttribute("fill", delta.color);
            }
        }
        if (key == "latency") {
            row.cells[2].innerHTML = delta.latency + "ms";
        }
    }
}


// *****************************************************************************
// Participant list 
// *****************************************************************************

function createInParticipantList(user, id) {
    var row;
    var colorWidget;
    var connectedIcon;

    console.log("starting adding to participant list", user, id);
    // if user is already in the participant list, update rather than create
    if (userNameRowMap.has(user.name)) {
        updateUserRepresentation(user, id);
        // update connected status (not part of user record)
        row = userNameRowMap.get(user.name);
        row.cells[3].children[0].setAttribute("src", "icons/connected3.png");
        row.cells[3].children[0].setAttribute("title", "Connected");
    } else {
        // create a new row for the user
        row = participantTable.insertRow(-1);
        // add to map
        userNameRowMap.set(user.name, row);
        // set up attributes
        //row.setAttribute("id", "user-" + id);
        const nameCell = row.insertCell(0);
        const colorCell = row.insertCell(1);
        // if this is us, make the colour selectable
        if (id == gt.id) {
            colorWidget = document.createElement('input');
            colorWidget.setAttribute("type", "color");
            colorWidget.setAttribute("value", user.color);
            colorWidget.setAttribute("class", "colorPicker");
            colorWidget.addEventListener('input', changeUserColor);
        } else {
            colorWidget = document.createElement('div');
            colorWidget.setAttribute("class", "colorBox");
            colorWidget.style.backgroundColor = user.color;
        }
        colorCell.appendChild(colorWidget);
        const latencyCell = row.insertCell(2);
        const connectedCell = row.insertCell(3);
        connectedIcon = document.createElement('img');
        connectedCell.appendChild(connectedIcon);
        // add content based on user information
        nameCell.innerHTML = user.name;
        latencyCell.innerHTML = user.latency;
        connectedIcon.setAttribute("src", "icons/connected3.png");
        connectedIcon.setAttribute("title", "Connected");
    }

    console.log("finished adding to participant list", user, id, row);
}

function disconnectInParticipantList(id) {
    const user = userIDMap.get(id);
    const row = userNameRowMap.get(user.name);
    if (row != undefined) {
        row.cells[3].children[0].setAttribute("src", "icons/disconnected3.png");
        row.cells[3].children[0].setAttribute("title", "Disconnected");
    }
    // If it's us, change "Connect" button title 
    if (id == gt.id) {
        btn.innerHTML = "Connect";
    }
}

function connectInParticipantList(id) {
    const user = userIDMap.get(id);
    const row = userNameRowMap.get(user.name);
    if (row != undefined) {
        row.cells[3].children[0].setAttribute("src", "icons/connected3.png");
        row.cells[3].children[0].setAttribute("title", "Connected");
    }
    // If it's us, change "Connect" button title 
    if (id == gt.id) {
        btn.innerHTML = "Disconnect";
    }
}

// TODO: decide when to remove a user from the participant list

// *****************************************************************************
// Telepointer
// *****************************************************************************

function addTelepointer(user, id) {
    console.log("adding telepointer", user, user.name);
    var tele = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tele.setAttribute("height", "28px");
    tele.setAttribute("width", "21px");
    tele.style.position = "absolute";
    tele.style.zIndex = 1000;

    var pointer = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    pointer.setAttribute("fill", user.color);
    pointer.setAttribute("stroke", "#000000");
    pointer.setAttribute("stroke-width", "1");
    pointer.setAttribute("points", "0,0 0,25 8,20 13,28 16,27 11,19 21,19 0,0");
    tele.appendChild(pointer);
    document.body.appendChild(tele);
    userNameTeleMap.set(user.name, tele);
    console.log("Done adding telepointer", user, user.name);
}

function updateTelepointer(teleX, teleY, id) {
    var user = userIDMap.get(id);
    var tele = userNameTeleMap.get(user.name);
    //tele.style.transform = "translate(" + teleX + "px," + teleY + "px)";
    tele.style.top = teleY + "px";
    tele.style.left = teleX + "px";
}

function startSendingTelepointer() {
    window.addEventListener('mousemove', e => {
        // FIX LATER: handle scrolling pages
        //let offX = document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft;
        //let offY = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop;
        gt.updateUserUnreliable({
            x: e.clientX,
            y: e.clientY
        });
    });
}


// *****************************************************************************
// GT setup and handlers
// *****************************************************************************

const gt = new GT();

gt.on('init_state', (state, users) => {
    console.log('Got whole new state:', state, users)

    // this could be us reconnecting, so check whether we 
    // know about other users before creating them
    for (const id in users) {
        if (userNameMap.has(users[id].name)) {
            // update instead of creating
            updateUser(users[id], id);
        } else {
            createUser(users[id], id);
        }
    }
});

gt.on('connect', id => {
    console.log(`We have connected, (${id}).`);
    // cancel any reconnect interval
    clearInterval(reconnectInterval);
});

gt.on('connect_error', error => {
    console.log('Connection error: ' + error.toString());
})

gt.on('disconnect', reason => {
    console.log(`We have disconnected (${reason}).`);
    disconnectInParticipantList(gt.id);

    // TODO: Socket.io reconnection
    // or set up our own reconnect loop
    if (!userPressedDisconnect) {
        reconnectInterval = setInterval(function () {
            console.log("Attempting reconnect...");
            if (myUserRecord != undefined) {
                // reconnect with my existing user info
                gt.connect(roomField.value, myUserRecord);
            } else {
                // connect with default user info
                gt.connect(roomField.value, {
                    x: 0,
                    y: 0,
                    name: nameField.value,
                    color: '#eeeeee',
                    latency: "?"
                });
            }
        }, 5000);
    }
});

gt.on('connected', (id, user_payload) => {
    console.log(`${id} has connected.`);
    createUser(user_payload, id);
    startSendingTelepointer();
});

gt.on('disconnected', (id, reason) => {
    console.log(`${id} has disconnected (${reason}).`)
    disconnectInParticipantList(id);
});

gt.on('user_updated_unreliable', (id, payload_delta) => {
    //console.log('Got a userupdateunreliable:', id, payload_delta);
    // special case for telepointers
    if (payload_delta.x && payload_delta.y) {
        if (id != gt.id) {
            updateTelepointer(payload_delta.x, payload_delta.y, id);
        }
    } else {
        // update anything else that may have been sent
        updateUser(payload_delta, id);
    }
});

gt.on('user_updated_reliable', (id, payload_delta) => {
    console.log('Got a userupdatereliable:', id, payload_delta);
    updateUser(payload_delta, id);
});

gt.on('state_updated_reliable', (id, payload_delta) => {
    console.log('Got a stateupdatereliable:', id, payload_delta)
});

gt.on('state_updated_unreliable', (id, payload_delta) => {
    console.log('Got a stateupdateunreliable:', id, payload_delta)
    if (payload_delta.lat && payload_delta.lng) {
        moveMap(payload_delta.lat, payload_delta.lng, id);
    }
});

gt.on('pingpong', (latencyValue) => {
    //console.log('Got a pong:', latencyValue);
    gt.updateUserReliable({
        latency: latencyValue
    });
});
