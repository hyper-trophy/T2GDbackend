const translate = require('@vitalets/google-translate-api');
const {_2stepLogin} = require('../../utils')

const googleSignIn = async (page, client, creds) => {
    await page.setDefaultNavigationTimeout(0);
    const navigationPromise = page.waitForNavigation()

    await page.goto('https://accounts.google.com/')

    await navigationPromise

    await page.waitForSelector('input[type="email"]')
    await page.click('input[type="email"]')

    await navigationPromise

    await page.type('input[type="email"]', creds?.gmail)

    await page.waitForSelector('#identifierNext')
    await page.click('#identifierNext')
    await page.waitForTimeout(7000)
    try {
        await page.waitForSelector('#identifierNext', { timeout: 1000 })
        console.log('invalid email provided')
        return false;
    } catch (err) {
        console.log('valid email')
        client.emit('message', 'Email verified, Verifying Password...')
    }

    await page.waitForSelector('input[type="password"]', { visible: true })
    await page.click('input[type="password"]')
    await page.waitForTimeout(500);

    await page.type('input[type="password"]', creds?.pass)

    await page.waitForSelector('#passwordNext')
    await page.click('#passwordNext')
    await page.waitForTimeout(7000)
    try {
        await page.waitForSelector('#passwordNext', { timeout: 1000 })
        console.log('invalid Password provided')
        return false;
    } catch (err) {
        console.log('valid password')
        client.emit('message', 'Password verified, Checking fo 2 step Auth...')
    }

    await _2stepLogin(page, client)
    return true;
}

module.exports = { googleSignIn }