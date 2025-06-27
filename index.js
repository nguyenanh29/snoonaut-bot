require('dotenv').config();
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('-----------------------------------------------');
    console.log('  Snoonaut Auto Bot - Airdrop Insiders  ');
    console.log('-----------------------------------------------');
    console.log(`${colors.reset}\n`);
  },
};

const randomUA = () => {
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0',
  ];
  return uas[Math.floor(Math.random() * uas.length)];
};

const generateProofUrl = () => {
  const usernames = ['altcoinbear1', 'cryptofan', 'snootlover', 'airdropking', 'blockchainbro'];
  const randomStatusId = Math.floor(1000000000000000000 + Math.random() * 900000000000000000);
  const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];
  return `https://x.com/${randomUsername}/status/${randomStatusId}`;
};

const getProxyAgent = () => {
  if (fs.existsSync('proxies.txt')) {
    const proxies = fs.readFileSync('proxies.txt', 'utf-8').split('\n').filter(Boolean);
    if (proxies.length > 0) {
      const proxy = proxies[Math.floor(Math.random() * proxies.length)];
      const proxyUrl = proxy.includes('http') || proxy.includes('socks') ? proxy : `http://${proxy}`;
      return new HttpsProxyAgent(proxyUrl);
    }
  }
  return null; 
};

const loadCookies = () => {
  const cookies = [];
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith('COOKIE_')) {
      cookies.push(process.env[key]);
    }
  });
  return cookies;
};

const createAxiosInstance = (cookie) => axios.create({
  baseURL: 'https://earn.snoonaut.xyz/api',
  headers: {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.8',
    'cache-control': 'max-age=120',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'sec-gpc': '1',
    'cookie': cookie,
    'Referer': 'https://earn.snoonaut.xyz/home',
  },
});

const fetchUserInfo = async (axiosInstance) => {
  logger.loading('Fetching user info...');
  try {
    const response = await axiosInstance.get('/user/stats', {
      httpsAgent: getProxyAgent(),
      headers: { 'User-Agent': randomUA() },
    });
    logger.success('User info fetched successfully');
    logger.info(`Username: ${response.data.user.username}, Snoot Balance: ${response.data.user.snootBalance}`);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch user info');
    return null;
  }
};

const fetchTasks = async (axiosInstance, type) => {
  logger.loading(`Fetching ${type} tasks...`);
  try {
    const response = await axiosInstance.get(`/tasks?type=${type}`, {
      httpsAgent: getProxyAgent(),
      headers: { 'User-Agent': randomUA() },
    });
    logger.success(`${type} tasks fetched successfully`);
    return response.data.tasks;
  } catch (error) {
    logger.error(`Failed to fetch ${type} tasks`);
    return [];
  }
};

const completeTask = async (axiosInstance, task) => {
  logger.loading(`Completing task ${task.title} (${task.id})...`);
  try {
    const payload = {
      taskId: task.id,
      action: 'complete',
    };

    if (['Spread the Snoot!', 'Like, Retweet and Comment'].includes(task.title)) {
      payload.proofUrl = generateProofUrl();
    }

    const response = await axiosInstance.post('/tasks/complete', payload, {
      httpsAgent: getProxyAgent(),
      headers: { 
        'User-Agent': randomUA(),
        'content-type': 'application/json',
      },
    });
    if (response.data.success) {
      logger.success(`Task ${task.title} completed, Reward: ${response.data.reward}`);
    }
  } catch (error) {
    logger.error(`Failed to complete task ${task.title} (${task.id})`);
  }
};

const processAccount = async (cookie) => {
  logger.step(`Processing account with cookie: ${cookie.slice(0, 50)}...`);
  const axiosInstance = createAxiosInstance(cookie);

  const userInfo = await fetchUserInfo(axiosInstance);
  if (!userInfo) return;

  const engagementTasks = await fetchTasks(axiosInstance, 'engagement');
  const referralTasks = await fetchTasks(axiosInstance, 'referral');

  const allTasks = [...engagementTasks, ...referralTasks];
  const pendingTasks = allTasks.filter(task => task.status === 'pending');

  for (const task of pendingTasks) {
    await completeTask(axiosInstance, task);
  }

  logger.success('All tasks processed for this account');
};

const main = async () => {
  logger.banner();
  const cookies = loadCookies();
  if (cookies.length === 0) {
    logger.error('No cookies found in .env');
    return;
  }

  for (const cookie of cookies) {
    await processAccount(cookie);
  }

  logger.success('All accounts processed');
};

main().catch(console.error);
