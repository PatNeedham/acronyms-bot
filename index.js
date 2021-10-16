const axios = require('axios')
const qs = require('qs')
const appsync = require('aws-appsync')
const gql = require('graphql-tag')
require('cross-fetch/polyfill')
require('dotenv').config()

const graphqlClient = new appsync.AWSAppSyncClient({
  url: 'https://eebl3ns3njh7plqngjeobimbrm.appsync-api.us-east-1.amazonaws.com/graphql',
  region: process.env.AWS_REGION,
  auth: {
    type: 'AWS_IAM',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    }
  },
  disableOffline: true
})

const getAcronyms = gql`
query getAcronyms($term: String!) {
  listAcronymsData(filter: {acronym: {eq: $term}}) {
    items {
      acronym
      description
      meaning
    }
  }
}
`

const apiUrl = 'https://slack.com/api'

const postMessage = async (channel, text) => {
  const args = {
    token: process.env.OAUTH_TOKEN,
    channel: channel,
    text
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
    const result = await graphqlClient.query({ query: getAcronyms, variables: { term: text } })
    const matches = result?.data?.listAcronymsData?.items
    if (matches.length > 1) {
      await postMessage(channel, `<@${user}> there were multiple matches found: ${matches.map(m => m.meaning).concat(', and ')}`)
    }
    if (matches.length === 1) {
      await postMessage(channel, `<@${user}> ${text} stands for: ${matches[0].meaning}`)
    }
    if (matches.length === 0) {
      await postMessage(channel, `<@${user}> no matching acronyms found for ${text}. Request one be added here`)
    }
    console.log('result from AppSync query:')
    console.log(JSON.stringify(result, null, 2))
    console.log('matching items:')
    console.log(JSON.stringify(result?.data?.listAcronymsData?.items))
    await postMessage(user, channel, text)
  } catch (e) {
    console.log('error posting message:')
    console.log(JSON.stringify(e, null, 2))
  }
  return { statusCode: 200 }
}
