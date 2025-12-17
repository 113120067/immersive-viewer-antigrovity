require('dotenv').config();
const { Octokit } = require('@octokit/rest');

const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

console.log('--- GitHub Config Check ---');
console.log('GITHUB_OWNER:', owner);
console.log('GITHUB_REPO:', repo);
console.log('GITHUB_TOKEN Present:', !!token);
console.log('GITHUB_TOKEN Length:', token ? token.length : 0);

if (!token || !owner || !repo) {
    console.error('❌ Missing configuration!');
    process.exit(1);
}

const octokit = new Octokit({ auth: token });

(async () => {
    try {
        console.log('Testing Authentication...');
        const { data } = await octokit.users.getAuthenticated();
        console.log('✅ Authenticated as:', data.login);

        console.log('Checking Repo Access...');
        const repoData = await octokit.repos.get({ owner, repo });
        console.log('✅ Repo exists and accessible:', repoData.data.full_name);

        console.log('Diagnostic Complete. Auth is GOOD.');
    } catch (e) {
        console.error('❌ Diagnostic Failed:', e.message);
        if (e.status === 401) console.error('-> Token is invalid or expired.');
        if (e.status === 404) console.error('-> Repo not found or Token lacks scope.');
    }
})();
