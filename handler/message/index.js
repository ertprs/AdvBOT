require('dotenv').config()
const { decryptMedia } = require('@open-wa/wa-automate')
const fs = require('fs-extra')
const fs2 = require('fs')
const fileUrl = require('file-url')
const axios = require('axios')
const moment = require('moment-timezone')
moment.tz.setDefault('Brasil/São Paulo').locale('br')
const { exec } = require('child_process')
const ocrSpace = require('ocr-space-api-wrapper')
const { uploadImages } = require('../../utils/fetcher')
const { downloader, cekResi, removebg, urlShortener, meme, translate, getLocationData, images, rugaapi } = require('../../lib')
const { msgFilter, color, processTime, is, isUrl, isUrlGrupo } = require('../../utils')
const { removeBackgroundFromImageBase64 } = require('remove.bg')
const { menuBR } = require('./text') // Menu do BOT
const welcome = JSON.parse(fs.readFileSync('C:/BOTS/AdvBOT/settings/welcome.json'))
const ownerNumber = '5517991766836@c.us';
const groupLimit = 15;

module.exports = msgHandler = async (client, message) => {
    try {
        const { type, id, from, t, sender, isGroupMsg, chat, caption, isMedia, mimetype, quotedMsg, mentionedJidList,chatId } = message
        let { body } = message
        const { name, formattedTitle } = chat
        let { pushname, verifiedName, formattedName } = sender
        pushname = pushname || verifiedName || formattedName
        const botNumber = await client.getHostNumber() + '@c.us'
        const groupId = isGroupMsg ? chat.groupMetadata.id : ''
        const groupAdmins = isGroupMsg ? await client.getGroupAdmins(groupId) : ''
        const isGroupAdmins = groupAdmins.includes(sender.id) || false
        const isBotGroupAdmins = groupAdmins.includes(botNumber) || false
        const isOwnerBot = ownerNumber == sender.id



        // Bot Prefix
        const prefix = '#'
        body = (type === 'chat' && body.startsWith(prefix)) ? body : (((type === 'image' || type === 'video') && caption) && caption.startsWith(prefix)) ? caption : ''
        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase()
        const arg = body.substring(body.indexOf(' ') + 1)
        const args = body.trim().split(/ +/).slice(1)
        const isCmd = body.startsWith(prefix)
        const isQuotedImage = quotedMsg && quotedMsg.type === 'image'
        const isQuotedVideo = quotedMsg && quotedMsg.type === 'video'
        const url = args.length !== 0 ? args[0] : ''
        const uaOverride = process.env.UserAgent

        // [BETA] AntiSPAM
        if (isCmd && msgFilter.isFiltered(from) && !isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'de', color(pushname)) }
        if (isCmd && msgFilter.isFiltered(from) && isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'de', color(pushname), 'no grupo', color(name || formattedTitle)) }
        if (!isCmd && !isGroupMsg) { return console.log('[MENSAGEM]', color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), 'Mensagem Comum de ', color(pushname)) }
        if (!isCmd && isGroupMsg) { return console.log('[MENSAGEM]', color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), 'Mensagem Comum de', color(pushname), ', no grupo:', color(name || formattedTitle)) }
        if (isCmd && !isGroupMsg) { console.log(color('[COMANDO]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`O Comando "${command} [${args.length}]"`), 'foi Executado por ', color(pushname)) }
        if (isCmd && isGroupMsg) { console.log(color('[COMANDO]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`O Comando "${command} [${args.length}]"`), 'foi Executado por ', color(pushname), ', no grupo:', color(name || formattedTitle)) }
        msgFilter.addFilter(from)

        client.sendSeen(chatId)

        switch (command) {
            // Menu
            case 'ping':
                await client.sendText(from, `AdvancedBOT by Igor Sardinha\n\n 📶 *PING:* _${processTime(t, moment()).toFixed(1)} ms_`)
                break
            case 'help':
            case 'menu':
            case 'ajuda':
                await client.sendText(from, menuBR.textMenu(pushname))
                break
            case 'comandos':
                    await client.sendText(from, menuBR.aliases(pushname))
                    break
            case 'menuadmin':
                if (!isGroupMsg) return client.reply(from, '[❗] *Atenção!* \nEsse comando só funciona em Grupos.', id)
                if (!isGroupAdmins) return client.reply(from, '[‼️] *Atenção!* \nEsse comando só pode ser executado pelo(s) Administrador(es) do Grupo.', id)
                await client.sendText(from, menuBR.textAdmin())
                break

            //Stickers
            case 'sticker':
            case 'figurinha':
            case 'fig':
            case 'stk':
            case 'adesivo':
            case 'stiker':
                if (isMedia && type === 'image') {
                    const mediaData = await decryptMedia(message, uaOverride)
                    const imageBase64 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                    await client.sendImageAsSticker(from, imageBase64)
                } else if (quotedMsg && quotedMsg.type == 'image') {
                    const mediaData = await decryptMedia(quotedMsg, uaOverride)
                    const imageBase64 = `data:${quotedMsg.mimetype};base64,${mediaData.toString('base64')}`
                    await client.sendImageAsSticker(from, imageBase64)
                } else {
                    await client.reply(from, '[❗] Envie a imagem com a legenda *#sticker* ou responda uma imagem com o texto *#sticker*. Para figurinhas animadas utilize *#sgif*.', id)
                }
                break
            //
            case 'stickergif':
            case 'stikergif':
            case 'sgif':
            case 'gifstiker':
            case 'gifsticker':
            case 'figanimada':
            case 'figurinhaanimada':
                if (isMedia || isQuotedVideo) {
                    if (mimetype === 'video/mp4' && message.duration < 10 || mimetype === 'image/gif' && message.duration < 10) {
                        var mediaData = await decryptMedia(message, uaOverride)
                        client.reply(from, '[AGUARDE] Estou carregando seu Video/GIF!', id)
                        var filename = `./media/stickergif.${mimetype.split('/')[1]}`
                        await fs.writeFileSync(filename, mediaData)
                        await exec(`gify ${filename} ./media/stickergf.gif --fps=30 --scale=240:240`, async function (error, stdout, stderr) {
                            var gif = await fs.readFileSync('./media/stickergf.gif', { encoding: "base64" })
                            await client.sendImageAsSticker(from, `data:image/gif;base64,${gif.toString('base64')}`)
                            .catch(() => {
                                client.reply(from, 'Desculpe, o arquivo é muito grande!', id)
                            })
                        })
                      } else {
                        client.reply(from, `[❗] Envie um video/GIF de no maximo 10 segundos com a legenda: *${prefix}stickergif*!`, id)
                       }
                    } else {
                        client.reply(from, `[❗] Envie um video/GIF com a legenda *${prefix}stickergif*`, id)
                }
                break
            //
            case 'stikertoimg':
            case 'stickertoimg':
            case 'stimg':
            case 'stk-img':
                    if (quotedMsg && quotedMsg.type == 'sticker') {
                        const mediaData = await decryptMedia(quotedMsg)
                        client.reply(from, `⌛ Carregando... Isso pode demorar alguns segundos...`, id)
                        const imageBase64 = `data:${quotedMsg.mimetype};base64,${mediaData.toString('base64')}`
                        await client.sendFile(from, imageBase64, 'imgsticker.jpg', 'Imagem convertida a partir do Sticker!', id)
                        .then(() => {
                            console.log(`Tempo de Processamento: ${processTime(t, moment())}s`)
                        })
                } else if (!quotedMsg) return client.reply(from, `Ops.. Algo deu errado!`, id)
                break
            //
            case 'stickernobg':
            case 'stikernobg':
            case 'figurinhapng':
            case 'stickerpng':
            case 'spng':
                if (isMedia && type === 'image') {
                    try {
                        client.reply(from, '⌛ Carregando... Isso pode demorar alguns segundos...', id)
                        var mediaData = await decryptMedia(message, uaOverride)
                        var imageBase64 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                        var base64img = imageBase64
                        var outFile = './media/img/noBg.png'
                        var result = await removeBackgroundFromImageBase64({ base64img, apiKey: '2YPkdaEy18XRq3TpSsQdVv47', size: 'auto', type: 'auto', outFile })
                        await fs.writeFile(outFile, result.base64img)
                        await client.sendImageAsSticker(from, `data:${mimetype};base64,${result.base64img}`)
                    } catch (err) {
                        console.log(err)
                        client.reply(from, '[⚠️] Ocorreu uma falha ao processar esta Imagem!', id)
                    }
                } else {
                    client.reply(from, '[❗] Envie a imagem com a legenda *#stickernobg* ou responda uma imagem com o texto *#stickernobg*..', id)
                }
                break

                //Downloads de Media
                case 'ig':
                case 'instagram':
                case 'insta':
                    if (args.length !== 1) return client.reply(from, '\n❌ Hey, você utilizou esse comando de forma errada. \nTente Utilizar: *#insta link_do_post* \n', id)
                    if (!is.Url(url) && !url.includes('instagram.com')) return client.reply(from, '[❗] Parece que este Link não é do Instagram!', id)
                    await client.reply(from, ` ⌛ Carregando... Isso pode demorar alguns segundos...`, id)
                    downloader.insta(url).then(async (data) => {
                        if (data.type == 'GraphSidecar') {
                            if (data.image.length != 0) {
                                data.image.map((x) => client.sendFileFromUrl(from, x, 'photo.jpg', '', null, null, true))
                                    .then((serialized) => console.log(`Carregando Conteúdo Externo: ${serialized}. Tempo Decorrido: ${processTime(t, moment())}`))
                                    .catch((err) => console.error(err))
                            }
                            if (data.video.length != 0) {
                                data.video.map((x) => client.sendFileFromUrl(from, x.videoUrl, 'video.jpg', '', null, null, true))
                                    .then((serialized) => console.log(`Carregando Conteúdo Externo: ${serialized}. Tempo Decorrido: ${processTime(t, moment())}`))
                                    .catch((err) => console.error(err))
                            }
                        } else if (data.type == 'GraphImage') {
                            client.sendFileFromUrl(from, data.image, 'photo.jpg', '', null, null, true)
                                .then((serialized) => console.log(`Carregando Conteúdo Externo: ${serialized}. Tempo Decorrido: ${processTime(t, moment())}`))
                                .catch((err) => console.error(err))
                        } else if (data.type == 'GraphVideo') {
                            client.sendFileFromUrl(from, data.video.videoUrl, 'video.mp4', '', null, null, true)
                                .then((serialized) => console.log(`Carregando Conteúdo Externo: ${serialized}. Tempo Decorrido: ${processTime(t, moment())}`))
                                .catch((err) => console.error(err))
                        }
                    })
                        .catch((err) => {
                            console.log(err)
                            if (err === 'Not a video') { return client.reply(from, '❌ Ocorreu um erro, parece que o Link é Inválido!', id) }
                            client.reply(from, '❌ Ocorreu um erro. A conta do Instagram é Privada !', id)
                        })
                    break
                //
                case 'twt':
                case 'twitter':
                    if (args.length !== 1) return client.reply(from, '\n❌ Hey, você utilizou esse comando de forma errada. \nTente Utilizar: *#twt link_do_post* \n', id)
                    if (!is.Url(url) & !url.includes('twitter.com') || url.includes('t.co')) return client.reply(from, '[❗] Parece que este Link não é do Twitter!', id)
                    await client.reply(from, `⌛ Carregando... Isso pode demorar alguns segundos...`, id)
                    downloader.tweet(url).then(async (data) => {
                        if (data.type === 'video') {
                            const content = data.variants.filter(x => x.content_type !== 'application/x-mpegURL').sort((a, b) => b.bitrate - a.bitrate)
                            const result = await urlShortener(content[0].url)
                            console.log('Link Encurtado: ' + result)
                            await client.sendFileFromUrl(from, content[0].url, 'video.mp4', `Download: ${result} \n\nTempo de Carregamento: _${processTime(t, moment())}s_`, null, null, true)
                                .then((serialized) => console.log(`Carregando Conteúdo Externo: ${serialized}. Tempo Decorrido: ${processTime(t, moment())}`))
                                .catch((err) => console.error(err))
                        } else if (data.type === 'photo') {
                            for (let i = 0; i < data.variants.length; i++) {
                                await client.sendFileFromUrl(from, data.variants[i], data.variants[i].split('/media/')[1], '', null, null, true)
                                    .then((serialized) => console.log(`Carregando Conteúdo Externo: ${serialized}. Tempo Decorrido: ${processTime(t, moment())}`))
                                    .catch((err) => console.error(err))
                            }
                        }
                    })
                        .catch(() => client.sendText(from, '❌ Ocorreu um erro, parece que o Link é Inválido!'))
                    break
                    //
                    case 'fb':
                    case 'face':
                    case 'facebook':
                            if (args.length == 0) return client.reply(from, `Utilize:: ${prefix}fb [link_fb]`, id)
                            await client.reply(from, `⌛ Carregando... Isso pode demorar alguns segundos...`, id)
                            rugaapi.fb(args[0])
                            .then(async (res) => {
                                const { link, linkhd, linksd } = res
                                if (res.status == 'error') return client.sendFileFromUrl(from, link, '', '❌ Ocorreu um erro, parece que o Link é Inválido!', id)
                                await client.sendFileFromUrl(from, linkhd, '', 'Aqui está o video em HD.', id)
                                .catch(async () => {
                                    await client.sendFileFromUrl(from, linksd, '', 'Aqui está o video em SD.', id)
                                    .catch(() => {
                                        client.reply(from, '❌ Ocorreu um erro, parece que o Link é Inválido!', id)
                                    })
                                })
                            })
                            break
            //Outros...
            case 'brainly':
                if (!isGroupMsg) return client.reply(from, 'Só pode ser usado em um grupo!', id)
                if (args.length >= 2){
                    const BrainlySearch = require('../../lib/brainly')
                    let tanya = body.slice(9)
                    let jum = Number(tanya.split('.')[1]) || 2
                    if (jum > 10) return client.reply(from, 'Max 10!', id)
                    if (Number(tanya[tanya.length-1])){
                        tanya
                    }
                    client.reply(from, `*Questão:* ${tanya.split('.')[0]}\n*Numero de Respostas:* ${Number(jum)}`, id)
                    await BrainlySearch(tanya.split('.')[0],Number(jum), function(res){
                        res.forEach(x=>{
                            if (x.jawaban.fotoJawaban.length == 0) {
                                client.reply(from, `*Questão:* ${x.pertanyaan}\n*Resposta:* ${x.jawaban.judulJawaban}\n`, id)
                            } else {
                                client.reply(from, `*Questão:* ${x.pertanyaan}\n*Resposta:* ${x.jawaban.judulJawaban}\n*Link da Imagem em Anexo:* ${x.jawaban.fotoJawaban.join('\n')}`, id)
                            }
                        })
                    })
                } else {
                    client.reply(from, 'Utilize :\n#brainly pergunta [.qnt_respostas]\n\nEx : \n#brainly pergunta .2', id)
                }
                break
            //
            case 'covid':
                if (args.length == 0) return client.reply(from, `Utilize: ${prefix}covid nome_pais \nObs: Nome do País deve ser em Inglês`, id)
                const country = body.slice(7)
                const response2 = await axios.get('https://coronavirus-19-api.herokuapp.com/countries/' + country + '/')
                const { cases, todayCases, deaths, todayDeaths, active, recovered } = response2.data
                await client.sendText(from, '🌎️Informações COVID-19 - *' + country + '* 🌍️\n\n✨️Total de Casos: ' + `${cases}` + '\n📆️Casos Hoje: ' + `${todayCases}` + '\n☣️Total de Mortes: ' + `${deaths}` + '\n☢️Mortes Hoje: ' + `${todayDeaths}` + '\n⛩️Casos Ativos: ' + `${active}` + '\n🩺Casos Recuperados: ' + `${recovered}` + '.')
                    .catch(() => {
                        client.reply(from, '❌ Ocorreu um erro, pais não localizado!', id)
                    })
                break
            //
            case 'cotacao':
                    const response3 = await axios.get('https://economia.awesomeapi.com.br/all/USD-BRL,USDT-BRL,EUR-BRL,BTC-BRL')
                    const { USD, EUR, BTC, USDT } = response3.data
                    await client.sendText(from, '*Cotação de Moedas - Atualiza a cada 30seg*' + '\n\nDolar Comercial: ' + '\n💵 _Compra: ' + `R$${USD.bid}_` + '\n💸 _Venda: ' + `R$${USD.ask}_` + '\n📈 _Variação: ' + `${USD.pctChange}%_` + '\n\nDolar Turismo: ' + '\n💵 _Compra: ' + `R$${USDT.bid}_` + '\n💸 _Venda: ' + `R$${USDT.ask}_` + '\n📈 _Variação: ' + `${USDT.pctChange}%_` + '\n\nEURO: ' + '\n💶 _Compra: ' + `R$${EUR.bid}_` + '\n💸 _Venda: ' + `R$${EUR.ask}_` + '\n📈 _Variação: ' + `${EUR.pctChange}%_` + '\n\nBitCoin: ' + '\n💳 _Compra: ' + `R$${BTC.bid}_` + '\n💸 _Venda: ' + `R$${BTC.ask}_` + '\n📈 _Variação: ' + `${BTC.pctChange}%_`+ '.')
                        .catch(() => {
                            client.reply(from, '❌ Ocorreu um erro', id)
                        })
                    break
            //
            case 'horoscopo':
                if (args.length == 0) return client.reply(from, `Utilize: ${prefix}horoscopo data_nascimento\nEx: #horoscopo 29-01-2000`, id)
                const data_nascimento = args[0]
                const response5 = await axios.get(`http://babi.hefesto.io/${data_nascimento}/dia`)
                const { signo, texto, autor, urlOrigem } = response5.data
                await client.sendText(from, '⛎♈♉♊♋♌♍♎♏♐♑♒\n\n *Signo:* ' + `${signo}` + '\n\n📆️ *Horoscopo:* ' + `\n${texto}` +  '\n*Autor(a):* ' + `${autor}` + '\n\n*Fonte:* ' + `${urlOrigem}`+'\n⛎♈♉♊♋♌♍♎♏♐♑♒')
                    .catch(() => {
                        client.reply(from, '❌ Ocorreu um erro!', id)
                    })
                break
            //
            case 'cep':
                        if (args.length == 0) return client.reply(from, `Utilize: ${prefix}cep cep \nObs: Não coloque o simbolo "-"`, id)
                        const CEPBody = body.slice(5)
                        const response4 = await axios.get('https://cep.awesomeapi.com.br/json/' + CEPBody + '/')
                        const { cep, address, district, state, city } = response4.data
                        await client.sendText(from, '*BUSCA de CEP: ' + cep + '*\n\n'+ address + ', ' +district + '\n'+ city + ' - ' + state + '\n\n')
                            .catch(() => {
                                client.reply(from, '❌ Ocorreu um erro', id)
                            })
                        break
            //
            case 'imagens':
                if (args.length == 0) return client.reply(from, `Pesquise Imagens no Pinterest: \n *${prefix}imagens [pesquisa]*\nEx: ${prefix}imagens carros`, id)
                const cariwall = body.slice(9)
                const hasilwall = await images.fdci(cariwall)
                client.sendFileFromUrl(from, hasilwall, '', '', id)
                    .catch(() => {
                        client.reply(from, '❌ Ocorreu um erro, nenhuma imagem localizada!', id)
                    })
                break
            //
            case 'meme':
                    if ((isMedia || isQuotedImage) && args.length >= 2) {
                        const top = arg.split('|')[0]
                        const bottom = arg.split('|')[1]
                        const encryptMedia = isQuotedImage ? quotedMsg : message
                        const mediaData = await decryptMedia(encryptMedia, uaOverride)
                        const getUrl = await uploadImages(mediaData, false)
                        const ImageBase64 = await meme.custom(getUrl, top, bottom)
                        client.sendImage(from, ImageBase64, 'image.png', 'Seu meme está pronto', null, true, false, false)
                            .then(() => {
                            })
                            .catch(() => {
                                client.reply(from, '❌ Ocorreu um erro!')
                            })
                    } else {
                        await client.reply(from, `Envie uma Imagem com a legenda: #meme texto-superior | texto-inferior. \n_OBS: COLOQUE ESPAÇO ENTRE A BARRA E O TEXTO!_`, id)
                    }
                    break
            //
            case 'criador':
                await client.sendContact(from, '5517991766836@c.us')
                    .then(() => client.sendText(from, 'Visite também meu site: igorsardinha.com'))
                break
            //
            case 'letra':
                    if (args.length == 0) return client.reply(from, `Comando Incorreto, utilize: ${prefix}letra nome da musica`, id)
                    rugaapi.lirik(body.slice(7))
                    .then(async (res) => {
                        await client.reply(from, ` 🎶 Letra da Música: ${body.slice(7)}\n\n${res}`, id)
                    })
                    break
            //
            case 'png':
            case 'nobg':
            case 'removebg':
            case 'recorte':
                            if (isMedia && type === 'image') {
                                try {
                                    client.reply(from, '⌛ Carregando... Isso pode demorar alguns segundos...', id)
                                    var mediaData = await decryptMedia(message, uaOverride)
                                    var imageBase64 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                                    var base64img = imageBase64
                                    var outFile = './media/img/noBg.png' //
                                    var result = await removeBackgroundFromImageBase64({ base64img, apiKey: 'RqXFW3FFbFcXkgLVuyD7mija', size: 'auto', type: 'auto', outFile })
                                    await fs.writeFile(outFile, result.base64img)
                                    await client.sendImage(from, `data:${mimetype};base64,${result.base64img}`)
                                } catch (err) {
                                    console.log(err)
                                    client.reply(from, '[⚠️] Ocorreu uma falha ao processar esta Imagem!', id)
                                }
                            } else {
                                client.reply(from, '[❗] Envie a imagem com a legenda *#png* ou responda uma imagem com o texto *#png*.', id)
                            }
                            break
            //
            case 'encurtar':
                    if (args.length == 0) return client.reply(from, `Utilize: ${prefix}encurtar <url>`, id)
                    const shortlink = await urlShortener(args[0])
                    await client.reply(from, shortlink)
                    .catch(() => {
                        client.reply(from, 'Ocorreu um erro!', id)
                    })
                    break
                    case 'say':
                        if (args.length == 0) return client.reply(from, `Utilize:\n${prefix}say [mensagem]`)
                        if (!isGroupMsg) return client.reply(from, 'Comando somente para ser usado em Grupos!', id)
                        let sayText = `${body.slice(5)}`
                        await client.sendText(from, sayText)
            break
            //
            case 'txtimg':
            case 'texto':
            case 'img':
                if (args.length == 0) return client.reply(from, `Faça o Bot Escrever o Texto Enviado como Imagem!\nUtilize: ${prefix}txtimg texto\n\nExemplo: ${prefix}txtimg Sou o melhor BOT!`, id)
                const nulisq = body.slice(7)
                const nulisp = await rugaapi.tulis(nulisq)
                await client.sendImage(from, `${nulisp}`, '', 'Aqui está seu Texto!', id)
                .catch(() => {
                    client.reply(from, 'Ocorreu um Erro!', id)
                })
                break
            //
            case 'wiki':
                    if (args.length == 0) return client.reply(from, `Pesquise na WikiPédia\nUtilize: ${prefix}wiki pesquisa`, id)
                    const wikiBusca = body.slice(5)
                    const responseWiki = `https://pt.wikipedia.org/api/rest_v1/page/pdf/${wikiBusca}/a4`
                    await client.sendFileFromUrl(from, responseWiki, wikiBusca)
                        .catch(() => {
                            client.reply(from, '❌ Ocorreu um erro', id)
                        })
                    break
            //
            case 'tts':
                    if (args.length === 1) return client.reply(from, 'Utilize: *#falar idioma texto* Idiomas Aceitos: EN ("Inglês"), PT ("Português Brasileiro")')
                    const ttsEn = require('node-gtts')('en')
                    const ttsPt = require('node-gtts')('pt')
                    const dataText = body.slice(8)
                    if (dataText === '') return client.reply(from, 'Nenhum texto detectado?', id)
                    if (dataText.length > 500) return client.reply(from, 'O texto é muito longo!', id)
                    var dataBhs = body.slice(5, 7)
                    if (dataBhs == 'pt') {
                        ttsPt.save('./media/tts/resPt.mp3', dataText, function () {
                            client.sendPtt(from, './media/tts/resPt.mp3', id)
                        })
                    } else if (dataBhs == 'en') {
                        ttsEn.save('./media/tts/resEn.mp3', dataText, function () {
                            client.sendPtt(from, './media/tts/resEn.mp3', id)
                        })
                    } else {
                        client.reply(from, 'Utilize: PT ou EN', id)
                    }
                    break
            //Grupos
            case 'add':
                if (!isGroupMsg) return client.reply(from, 'Esse comando foi feito para funcionar apenas em Grupos!', id)
                if (!isGroupAdmins) return client.reply(from, 'Esse comando só pode ser usado por Admins do Grupo.', id)
                if (!isBotGroupAdmins) return client.reply(from, 'Você precisa tornar o BOT um Admin do Grupo', id)
                if (args.length !== 1) return client.reply(from, `Utilize *#add numero*`, id)
                try {
                    await client.addParticipant(from, `${args[0]}@c.us`)
                        .then(() => client.reply(from, 'Olá, seja bem vindo.', id))
                } catch {
                    client.reply(from, 'Não foi possível adicionar esse usuário.', id)
                }
                break
            //
            case 'kick':
                if (!isGroupMsg) return client.reply(from, 'Esse comando foi feito para funcionar apenas em Grupos!', id)
                if (!isGroupAdmins) return client.reply(from, 'Esse comando só pode ser usado por Admins do Grupo.', id)
                if (!isBotGroupAdmins) return client.reply(from, 'Você precisa tornar o BOT um Admin do Grupo', id)
                if (mentionedJidList.length === 0) return client.reply(from, 'Utilize *kick @id*', id)
                if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Você não pode usar esse comando no BOT!', id)
                await client.sendTextWithMentions(from, `O membro ${mentionedJidList.map(x => `@${x.replace('@c.us', '')} foi removido.`).join('')}`)
                for (let i = 0; i < mentionedJidList.length; i++) {
                    if (groupAdmins.includes(mentionedJidList[i])) return await client.sendText(from, 'Você não pode remover um Admin.')
                    await client.removeParticipant(groupId, mentionedJidList[i])
                }
                break
            //
            case 'promote':
                if (!isGroupMsg) return client.reply(from, 'Esse comando foi feito para funcionar apenas em Grupos!', id)
                if (!isGroupAdmins) return client.reply(from, 'Esse comando só pode ser usado por Admins do Grupo.', id)
                if (!isBotGroupAdmins) return client.reply(from, 'Você precisa tornar o BOT um Admin do Grupo', id)
                if (mentionedJidList.length != 1) return client.reply(from, 'Maaf, format pesan salah silahkan periksa menu. [Wrong Format, Only 1 user]', id)
                if (groupAdmins.includes(mentionedJidList[0])) return await client.reply(from, 'Maaf, user tersebut sudah menjadi admin. [Bot is Admin]', id)
                if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Maaf, format pesan salah silahkan periksa menu. [Wrong Format]', id)
                await client.promoteParticipant(groupId, mentionedJidList[0])
                await client.sendTextWithMentions(from, `O Usuário: @${mentionedJidList[0].replace('@c.us', '')} se tornou Admin.`)
                break
            //
            case 'demote':
                if (!isGroupMsg) return client.reply(from, 'Esse comando foi feito para funcionar apenas em Grupos!', id)
                if (!isGroupAdmins) return client.reply(from, 'Esse comando só pode ser usado por Admins do Grupo.', id)
                if (!isBotGroupAdmins) return client.reply(from, 'Você precisa tornar o BOT um Admin do Grupo', id)
                if (mentionedJidList.length !== 1) return client.reply(from, 'Você só pode citar um usuário.', id)
                if (!groupAdmins.includes(mentionedJidList[0])) return await client.reply(from, 'O Usuário citado não é um Admin', id)
                if (mentionedJidList[0] === botNumber) return await client.reply(from, 'O BOT não pode ser Demotado.', id)
                await client.demoteParticipant(groupId, mentionedJidList[0])
                await client.sendTextWithMentions(from, `O Seguinte Usuário foi Demotado: @${mentionedJidList[0].replace('@c.us', '')}.`)
                break
            //
            case 'tagall':
                if (args.length == 0) return client.reply(from, `Utilize:\n${prefix}tagall [mensagem]`)
                if (!isGroupMsg) return client.reply(from, 'Comando somente para ser usado em Grupos!', id)
                if (!isGroupAdmins || !isOwnerBot) return client.reply(from, 'Você precisar ser Admin ou Dono do BOT!', id)
                let hehex = `${body.slice(8)} \n\n`
                const groupMem = await client.getGroupMembers(groupId)
                    for (let i = 0; i < groupMem.length; i++) {
                            hehex += ` @${groupMem[i].id.replace(/@c.us/g, '')},`
                        }
                await client.sendTextWithMentions(from, hehex)
            break
            //
            case 'welcome':
                if (!isGroupMsg) return client.reply(from, 'Esse comando foi feito para funcionar apenas em Grupos!', id)
                if (!isGroupAdmins) return client.reply(from, 'Esse comando só pode ser usado por Admins do Grupo.', id)
                if (!isBotGroupAdmins) return client.reply(from, 'Você precisa tornar o BOT um Admin do Grupo', id)
                if (args.length !== 1) return client.reply(from, `Faça o Bot enviar um "Bem-Vindo" no Chat!\n\nUtilize:\n${prefix}welcome on/off`, id)
                if (args[0] == 'on') {
                    welcome.push(chatId)
                    fs.writeFileSync('C:/BOTS/AdvBOT/settings/welcome.json', JSON.stringify(welcome))
                    client.reply(from, 'As mensagens de Bem-vindo foram ativadas!', id)
                } else if (args[0] == 'off') {
                    let xporn = welcome.indexOf(chatId)
                    welcome.splice(xporn, 1)
                    fs.writeFileSync('C:/BOTS/AdvBOT/settings/welcome.json', JSON.stringify(welcome))
                    client.reply(from, 'As mensagens de Bem-vindo foram desativadas!', id)
                } else {
                    client.reply(from, `Faça o Bot enviar um "Bem-Vindo" no Chat!\n\nUtilize:\n${prefix}welcome on/off`, id)
                }
                break
            //
            case 'admins':
            case 'adm':
                    if (!isGroupMsg) return client.reply(from, 'Comando somente para ser usado em Grupos!', id)
                    let mimin = '*Admins:* \n'
                    for (let admon of groupAdmins) {
                        mimin += `@${admon.replace(/@c.us/g, '')}\n` 
                    }
                    await client.sendTextWithMentions(from, mimin)
                    break
            //   
            case 'link':
            case 'linkgrupo':
                            if (isGroupMsg) {
                                if (!isBotGroupAdmins) return client.reply(from, 'Você precisa tornar o BOT um Admin do Grupo', id)
                                const inviteLink = await client.getGroupInviteLink(groupId);
                                client.sendLinkWithAutoPreview(from, inviteLink, `\nLink do Grupo: *${name}*`)
                            } else {
                                client.reply(from, 'Este comando só pode ser usado em grupos!', id)
                            }
                        break
            //DONO DO BOT
            case 'bc':
                if (!isOwnerBot) return client.reply(from, 'Disponível somente para o criador do BOT!', id)
                if (args.length == 0) return client.reply(from, `Utilize:\n${prefix}bc [mensagem]`)
                let msg = body.slice(4)
                const chatz = await client.getAllChatIds()
                for (let idk of chatz) {
                    var cvk = await client.getChatById(idk)
                    if (!cvk.isReadOnly) client.sendText(idk, `〘 *BROADCAST* 〙\n\n${msg}`)
                    if (cvk.isReadOnly) client.sendText(idk, `〘 *BROADCAST* 〙\n\n${msg}`)
                }
                client.reply(from, 'Broadcast Enviado para todos os Chats Disponíveis!', id)
                break
            //
            case 'ban':
                    if (!isGroupMsg) return client.reply(from, 'Esse comando foi feito para funcionar apenas em Grupos!', id)
                    if (!isOwnerBot) return client.reply(from, 'Esse comando só pode ser usado pelo dono do  Bot.', id)
                    if (!isBotGroupAdmins) return client.reply(from, 'Você precisa tornar o BOT um Admin do Grupo', id)
                    if (mentionedJidList.length === 0) return client.reply(from, 'Utilize *ban @id*', id)
                    if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Você não pode usar esse comando no BOT!', id)
                    await client.sendTextWithMentions(from, `O membro ${mentionedJidList.map(x => `@${x.replace('@c.us', '')} foi removido por mau uso do BOT. Bloqueado o uso`).join('')}`)
                    for (let i = 0; i < mentionedJidList.length; i++) {
                        if (groupAdmins.includes(mentionedJidList[i])) return await client.sendText(from, 'Você não pode remover um Admin.')
                        await client.removeParticipant(groupId, mentionedJidList[i])
                        await  client.contactBlock(mentionedJidList[i])
                    }
                    break
            //
            case 'exit':
                    if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
                    if (!isOwnerBot) return client.reply(from, 'Desculpe, este comando só pode ser usado pelo dono do Bot!', id)
                    client.sendText(from, 'Adeus pessoal...').then(() => client.leaveGroup(groupId))
                    break
            case 'leaveall':
                    if (!isOwnerBot) return client.reply(from, 'Disponível somente para o criador do BOT!', id)
                    const allChatz = await client.getAllChatIds()
                    const allGroupz = await client.getAllGroups()
                    for (let gclist of allGroupz) {
                        await client.sendText(gclist.contact.id, `Precisei Sair desse Grupo. Ainda funciono no Privado : ${allChatz.length}`)
                        await client.leaveGroup(gclist.contact.id)
                        await client.deleteChat(gclist.contact.id)
                    }
                    client.reply(from, 'Pronto, saí de todos os grupos!!', id)
                    break
            case 'clearall':
                    if (!isOwnerBot) return client.reply(from, 'Comando exclusivo do dono do Bot!', id)
                    const allChatx = await client.getAllChats()
                    for (let dchat of allChatx) {
                        await client.deleteChat(dchat.id)
                    }
                    client.reply(from, 'Todos os chats foram limpos!', id)
                    break
            case 'join':
                        if (args.length == 0) return client.reply(from, `Utilize o comando: \n *${prefix}join [link]*`, id)
                        let linkgrup = body.slice(6)
                        let islink = linkgrup.match(/(https:\/\/chat.whatsapp.com)/gi)
                        let chekgrup = await client.inviteInfo(linkgrup)
                        if (!islink) return client.reply(from, 'Este convite não parece ser do WhatApp', id)
                        if (isOwnerBot) {
                            await client.joinGroupViaLink(linkgrup)
                                  .then(async () => {
                                      await client.sendText(from, 'Entrou no grupo com sucesso via link!')
                                      await client.sendText(chekgrup.id, `Olá, sou o *AdvancedBOT*, conheça meus comandos usando: *${prefix}menu*`)
                                  })
                        } else {
                            let cgrup = await client.getAllGroups()
                            if (cgrup.length > groupLimit) return client.reply(from, `Desculpe, mas no momento não estou entrando em grupos pois atingi o limite de grupos que posso estar.\nLimite: ${groupLimit}`, id)
                            if (cgrup.size < 150) return client.reply(from, `Limite de Membros no grupo é de ${memberLimit} pessoas`, id)
                            await client.joinGroupViaLink(linkgrup)
                                  .then(async () =>{
                                      await client.reply(from, 'Entrou no grupo com sucesso via link!', id)
                                  })
                                  .catch(() => {
                                    client.reply(from, 'Acorreu um erro ao Adicionar o Bot no Grupo!', id)
                                  })
                        }
                        break
            case 'stats':
            case 'status':
                const loadedMsg = await client.getAmountOfLoadedMessages()
                const chatIds = await client.getAllChatIds()
                const groups = await client.getAllGroups()
                const bateria = await client.getBatteryLevel()
                client.sendText(from, `Status de Uso do BOT:\n- *${loadedMsg}* Mensagens Carregadas\n- *${groups.length}* Grupos\n- *${chatIds.length - groups.length}* Chats Privados\n- *${chatIds.length}* Conversas\n Bateria: *${bateria}%*`)
                break
            default:
                console.log(color('[ERROR]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), 'Comando não registrado de ', color(pushname))
                break
        }
    } catch (err) {
        console.error(color(err, 'red'))
    }
}
