const translate = require('@vitalets/google-translate-api');

const _2stepLogin = (page, client) => new Promise(
    async (resolve, reject) => {
        try {
            await page.waitForSelector('.xkfVF', { timeout: 10000 })
            client.emit('message', 'Two step auth found, Thats why I told you to create a new temp account on google. Anyways, please wait...')
            const text = await page.$eval('.xkfVF', el => el.innerText);
            console.log(text)
            try{
                const translated = await translate(text, { to: 'en' }).catch(err => console.log(err));
                console.log(translated?.text);
                client.emit('2stepAuth', translated?.text+"\nAlernatively, please create a new google account and use here, you will not encounter this prompt in that case");
            }catch(e){
                client.emit('2stepAuth', text+"\nAlernatively, please create a new google account and use here, you will not encounter this prompt in that case");
            }
            client.on('2stepAuth', () => resolve(true));
        } catch (err) {
            console.log('i guess logged in')
            client.emit('message', 'Logged in, Trying to connect your drive...')
            resolve(true)
        }
    })

module.exports = {_2stepLogin}