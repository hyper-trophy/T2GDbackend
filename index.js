const {searchTorrents, getMagnet} = require('./services')
var cors = require('cors')
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const { googleSignIn, collabController } = require('./services')
puppeteer.use(StealthPlugin())
// const http = require('http').createServer(function (req, res) {
//   res.writeHead(200, { 'Content-Type': 'text/plain' });
//   res.write('This is none of your Business!');
//   res.end();
// });
const express = require('express');
const app = express()
app.use(express.json());
app.use(cors())
const http = require('http').Server(app);

const io = require('socket.io')(http, {
  cors: { origin: '*' }
});

app.get('/', (req, res) => {
  res.send(`this is none of your business`);
})

app.get('/search/:searchQuery', async (req, res) => {
  const { searchQuery } = req.params
  const result = await searchTorrents(searchQuery)
  res.status(200).json(result)
})

app.post('/torrent', async (req, res) => {
    const { torrent } = req.body
    try {
        const magnet = await getMagnet(torrent)
        res.send(magnet)
    } catch (e) {
        console.log(e.message)
        res.status(500)
    }
    return;
})

const waitTillStart = client => new Promise(
  resolve => client.on('start', resolve)
)
io.on("connection", async client => {
  client.on("disconnect", async () => {
    console.log("Client disconnected");
    try {
      browser && await browser.close()
    } catch (e) {
      console.log(e)
    }
  })
  let browser
  console.log("New client connected");
  try {
    client.emit('message', 'You are connected to server')
    // const creds = await waitTillStart(client)
    client.on('start', async creds => {
      try {
        console.log('creds', creds)
        console.log("Starting browser")
        client.emit("message", "Trying to Login");
        browser = await puppeteer.launch({
          'args': [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        })
        const signInPage = await browser.newPage()
        const loggedIn = await googleSignIn(signInPage, client, creds)
        if (!loggedIn) throw new Error('Please check your credentials and try again')
        const collabPage = await browser.newPage()
        await signInPage.close()
        await collabController(collabPage, browser, client)
        await browser.close()
      } catch (e) {
        console.log(e)
        client.emit('err', e.message)
        browser && await browser.close().catch(err => console.log(err))
      }
    })
  } catch (e) {
    console.log(e)
    browser && await browser.close().catch(err => console.log(err))
  }
});

http.listen(process.env.PORT || 8080, () => {
  console.log(`listening on ${process.env.PORT}`);
});


