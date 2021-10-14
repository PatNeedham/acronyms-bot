const axios = require('axios')
const qs = require('qs')

require('dotenv').config()

const apiUrl = 'https://slack.com/api'

const postMessage = async (user, channel, text) => {
  const args = {
    token: process.env.OAUTH_TOKEN,
    channel: channel,
    text: `<@${user}> this is the text you entered: ${text}`
  }
  const result = await axios.post(`${apiUrl}/chat.postMessage`, qs.stringify(args))
  return result
}

exports.handler = async (event) => {
  console.log('the event:')
  console.log(JSON.stringify(event, null, 2))
  const { type, challenge } = event
  if (type === 'url_verification') {
    return {
      statusCode: 200,
      body: challenge
    }
  }
  const { text, user, channel, bot_profile: botProfile, bot_id: botId } = event.event
  const isBot = !!botId && !!botProfile
  if (!text || isBot) {
    return { statusCode: 200 }
  }
  try {
    await postMessage(user, channel, text)
  } catch (e) {
    console.log('error posting message:')
    console.log(JSON.stringify(e, null, 2))
  }
  return { statusCode: 200 }
}
