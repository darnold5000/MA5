/**
 * Known crawler / bot user-agent patterns.
 * Conservative list — prefer false negatives over dropping real users.
 */
const BOT_UA_PATTERNS: RegExp[] = [
  /bot\b/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /mediapartners/i,
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterest/i,
  /discordbot/i,
  /whatsapp/i,
  /telegram/i,
  /preview/i,
  /headless/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /lighthouse/i,
  /pagespeed/i,
  /gtmetrix/i,
  /pingdom/i,
  /uptimerobot/i,
  /ahrefs/i,
  /semrush/i,
  /mj12bot/i,
  /dotbot/i,
  /baiduspider/i,
  /yandex/i,
  /duckduckbot/i,
  /bingpreview/i,
  /google-inspectiontool/i,
  /adsbot-google/i,
  /apis-google/i,
  /storebot-google/i,
  /bytespider/i,
  /amazonbot/i,
  /applebot/i,
  /petalbot/i,
  /screaming frog/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /go-http-client/i,
  /httpclient/i,
  /libwww/i,
  /scrapy/i,
];

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent || !userAgent.trim()) return false;
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}
