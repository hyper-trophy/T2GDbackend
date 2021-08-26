
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const { googleSignIn, collabController } = require('./services')
puppeteer.use(StealthPlugin())
const http = require('http').createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('This is none of your Business!');
  res.end();
});
const io = require('socket.io')(http, {
  cors: { origin: '*' }
});



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
    const creds = await waitTillStart(client)
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
    if (!loggedIn) throw new Error('Please check your credentials')
    const collabPage = await browser.newPage()
    await signInPage.close()
    await collabController(collabPage, browser, client)
    await browser.close()
  } catch (e) {
    console.log(e)
    client.emit('err', e.message + '\n Refresh the tab and try again')
    browser && await browser.close().catch(err => console.log(err))
  }
});

http.listen(process.env.PORT || 8080, () => {
  console.log(`listening on ${process.env.PORT}`);
});


