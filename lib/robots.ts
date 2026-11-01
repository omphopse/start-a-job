import { siteEnvironment, type SiteEnvironment } from './environment';
export function robotsText(
  url: string,
  environment: SiteEnvironment = siteEnvironment(),
  allowTraining = process.env.ALLOW_AI_TRAINING_BOTS !== 'false',
) {
  if (environment === 'staging') return 'User-agent: *\nDisallow: /\n';
  const search = [
    'OAI-SearchBot',
    'ChatGPT-User',
    'Claude-SearchBot',
    'Claude-User',
    'PerplexityBot',
    'Googlebot',
    'Bingbot',
  ];
  const training = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Applebot-Extended'];
  const restrictions = 'Disallow: /admin\nDisallow: /api/internal\nDisallow: /jobs?*&*&*\n';
  return `User-agent: *\nAllow: /\n${restrictions}\n${search.map((bot) => `User-agent: ${bot}\nAllow: /\n${restrictions}`).join('\n')}\n${training.map((bot) => `User-agent: ${bot}\n${allowTraining ? 'Allow' : 'Disallow'}: /\n${restrictions}`).join('\n')}\nSitemap: ${url}/sitemap.xml\n`;
}
