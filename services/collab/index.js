const { _2stepLogin } = require('../../utils')

const waitForMagnetUri = client => new Promise(
    resolve =>
        client.on('magnet', uri => {
            resolve(uri)
        })
)

const sendDownloadDetails = (client, page) => new Promise(
    async resolve => {
        let job = setInterval(async () => {
            try {
                let downloadDetails = await page.evaluate(() => {
                    const els = document.querySelectorAll('.output')
                    return els[els.length - 1].innerText
                })
                if (downloadDetails.includes('completed. Thanks for using T2GD')) {
                    client.emit('stateChange', 'Download completed')
                    resolve()
                    clearInterval(job)
                    return;
                }
                downloadDetails && client.emit('downloadDetails', downloadDetails)
            } catch (err) {
                console.log("I guess client Disconnected: ", err.message)
                clearInterval(job)
                resolve()
            }
        }, 2000)
    }
)

const collabController = async (page, browser, client) => {
    await page.setDefaultNavigationTimeout(0)
    const navigationPromise = page.waitForNavigation()
    await page.goto('https://colab.research.google.com/drive/1s3IpcUCsvz11yk6cJXW32XkQVkAVZbOR?pli=1', { waitUntil: 'load', timeout: 0 });
    await page.waitForSelector('.cell-execution-container colab-run-button')

    client.emit('message', 'Trying to connect Google Servers...')
    await page.evaluate(() => {
        const runBtns = document.querySelectorAll('.cell-execution-container colab-run-button')
        runBtns[0].click()
    })
    try {
        await page.waitForSelector('#ok', { timeout: 2000, visible: true })
        await page.waitForTimeout(5000)
        await page.$eval('#ok', el => {
            el.click()
        })
    } catch (e) {
        console.log("no run anyway prompt!!!")
    }

    //getting the key
    client.emit('message', 'getting authentication key...')
    const keyPage = await browser.newPage()
    await keyPage.goto('https://accounts.google.com/o/oauth2/auth?client_id=947318989803-6bn6qk8qdgf4n4g3pfee6491hc0brc4i.apps.googleusercontent.com&redirect_uri=urn%3aietf%3awg%3aoauth%3a2.0%3aoob&scope=email%20https%3a%2f%2fwww.googleapis.com%2fauth%2fdocs.test%20https%3a%2f%2fwww.googleapis.com%2fauth%2fdrive%20https%3a%2f%2fwww.googleapis.com%2fauth%2fdrive.photos.readonly%20https%3a%2f%2fwww.googleapis.com%2fauth%2fpeopleapi.readonly%20https%3a%2f%2fwww.googleapis.com%2fauth%2fdrive.activity.readonly%20https%3a%2f%2fwww.googleapis.com%2fauth%2fexperimentsandconfigs%20https%3a%2f%2fwww.googleapis.com%2fauth%2fphotos.native&response_type=code', { waitUntil: 'load', timeout: 0 })
    await keyPage.waitForSelector('.tgnCOd', { visible: true })
    await keyPage.click('.tgnCOd')
    try {
        const res = await keyPage.waitForXPath(`//*[@class="qhFLie"]//button`, { visible: true })
        const signInButton = await keyPage.$x(`//*[@class="qhFLie"]//button`)
        await signInButton.pop().click()
    } catch (e) {
        await _2stepLogin(keyPage, client)
        const res = await keyPage.waitForXPath(`//*[@class="qhFLie"]//button`, { visible: true })
        const signInButton = await keyPage.$x(`//*[@class="qhFLie"]//button`)
        await signInButton.pop().click()
    }
    await keyPage.waitForSelector('textarea', { visible: true })
    const key = await keyPage.$eval('textarea', el => el.innerHTML);
    await keyPage.close()
    //end
    // await page.waitForTimeout(25000)

    //entering the key
    await page.evaluate(() => {
        const runBtns = document.querySelectorAll('.cell-execution-container colab-run-button')
        runBtns[1].click()
    })
    try {
        await page.waitForSelector('input.raw_input', { visible: true })
        await page.click('input.raw_input')
        await page.waitForTimeout(500)
        await page.evaluate((data) => {
            document.querySelector('input.raw_input').value = data
        }, key)
        await page.focus('input.raw_input')
        await page.type('input.raw_input', '')
        await page.waitForTimeout(500)
        page.keyboard.press('Enter');
        await page.waitForTimeout(5000)
    } catch (e) {
        console.log("i guess alerady mounted", e)
    }
    client.emit('stateChange', 'connected to your google drive')
    //end

    const magnet = await waitForMagnetUri(client)
    // console.log("uri", magnet)
    //entring magnet uri
    client.emit('message', 'loading the torrent...')
    await page.evaluate(() => {
        const runBtns = document.querySelectorAll('.cell-execution-container colab-run-button')
        runBtns[2].click()
    })
    await page.waitForSelector('input.raw_input', { visible: true })
    await page.click('input.raw_input')
    await page.waitForTimeout(500)
    await page.evaluate((data) => {
        document.querySelector('input.raw_input').value = data
    }, magnet)
    await page.focus('input.raw_input')
    await page.type('input.raw_input', '')
    await page.waitForTimeout(500)
    page.keyboard.press('Enter');
    //end

    //finally download
    await page.waitForTimeout(5000)
    await page.evaluate(() => {
        const runBtns = document.querySelectorAll('.cell-execution-container colab-run-button')
        runBtns[3].click()
    })

    await page.waitForTimeout(2000)
    client.emit('message', 'downloading the torrent, swipe up to see details !')
    await sendDownloadDetails(client, page)
    //done
    return "done"
}

module.exports = { collabController }