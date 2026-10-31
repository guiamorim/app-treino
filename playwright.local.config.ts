import base from './playwright.config'
export default { ...base, projects: [{ name: 'chromium', use: { browserName: 'chromium', launchOptions: { executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' } } }] }
