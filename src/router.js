import { checkVerifyCode } from './utils';

import { AutoRouter } from 'itty-router'

const router = AutoRouter() 

// 创建vote
router.post('/api/vote/add', async (request,env,ctx) => {
	const content = await request.json();
	const results  = await env.DB.prepare(
		"INSERT INTO Topics (Title, Description, OptionsCount) VALUES (?, ?, ?)"
	)
	.bind(content.Title, content.Description, content.Options.length)
	.run();
	const topicId = results['meta']['last_row_id'];
	for (const option of content.Options) {
		await env.DB.prepare(
			"INSERT INTO Options (TopicId, OptionText, Votes) VALUES (?, ?, ?)"
		)
		.bind(topicId, option.OptionText, 0)
		.run();
	}
	// 从数据库获取投票
	const topic = await env.DB.prepare(
		"SELECT * FROM Topics WHERE TopicID = ?"
	)
	.bind(topicId)
	.all();
	const options = await env.DB.prepare(
		"SELECT * FROM Options WHERE TopicId = ?"
	)
	.bind(topicId)
	.all();
	const result = {
		topic: topic['results'],
		options: options['results']
	};
	return new Response(JSON.stringify(result));
});

// 获取vote
router.get('/api/vote/:id', async ({ params },env,ctx) => {
	const topic = await env.DB.prepare(
		"SELECT * FROM Topics WHERE TopicID = ?"
	)
	.bind(params.id)
	.all();
	const options = await env.DB.prepare(
		"SELECT * FROM Options WHERE TopicId = ?"
	)
	.bind(params.id)
	.all();
	const result = {
		topic: topic['results'],
		options: options['results']
	};
	return new Response(JSON.stringify(result));
});

// 投票
router.post('/api/vote/:id', async (request,env,ctx) => {
	const content = await request.json();
	const results = await env.DB.prepare(
		"UPDATE Options SET Votes = Votes + 1 WHERE OptionId = ?"
	)
	.bind(content.OptionId)
	.run();
	return new Response(JSON.stringify(results));
});

// 获取svg格式的投票结果
router.get('/api/vote/:id/result.svg', async ({ params },env,ctx) => {
	const topic = await env.DB.prepare(
		"SELECT * FROM Topics WHERE TopicID = ?"
	)
	.bind(params.id)
	.all();
	const options = await env.DB.prepare(
		"SELECT * FROM Options WHERE TopicId = ?"
	)
	.bind(params.id)
	.all();
	const result = {
		topic: topic['results'],
		options: options['results']
	};
	// 生成svg
	let startY=140;
	const stepY=40;
	let totalVotes=0;

	for (const option of result.options) {
		totalVotes += option['Votes'];
	}
    // XML 转义函数
    const escapeXml = (unsafe) => {
        return unsafe.replace(/[&<>"']/g, (c) => {
            switch (c) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&apos;';
                default: return c;
            }
        });
    };

    // 生成现代风格SVG
    const headerHeight = 120;
    const itemHeight = 60;
    const padding = 40;
    const totalHeight = headerHeight + (itemHeight * result.options.length) + padding;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${totalHeight}" viewBox="0 0 600 ${totalHeight}">
	<defs>
        <!-- 新增渐变定义 -->
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#3D90FF"/>
            <stop offset="100%" stop-color="#00d2f1"/>
        </linearGradient>
        
        <!-- 优化阴影效果 -->
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.08)"/>
        </filter>
    </defs>

    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&amp;display=swap');
        .header { font: 600 28px 'Inter', sans-serif; fill: #2F2F2F; }
        .title { font: 400 18px/1.4 'Inter', sans-serif; fill: #4A5568; }
        .label { font: 600 16px 'Inter', sans-serif; fill: #2D3748; }
        .percentage { font: 400 14px 'Inter', sans-serif; fill: #718096; }
        .chart-bg { fill: #E2E8F0; rx: 8; }
        .chart-bar { 
            fill: url(#gradient);
            filter: url(#shadow);
            rx: 6;
        }
    </style>
    
    <!-- 阴影滤镜 -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.1)"/>
    </filter>
    
    <!-- 背景卡片 -->
    <rect width="560" height="${totalHeight - 20}" x="20" y="10" rx="16" fill="#FFFFFF"/>
    
    <!-- 头部 -->
    <g transform="translate(40 40)">
        <text class="header" x="50%" y="0" text-anchor="end">投票结果</text>
        <text class="title" x="0" y="40" width="520">${escapeXml(result.topic[0]['Title'])}</text>
    </g>
    
    <!-- 数据列 -->
    <g transform="translate(40 ${headerHeight})">`;

    let yPos = 0;
    for (const option of result.options) {
        const percentage = totalVotes ? ((option.Votes / totalVotes) * 100).toFixed(1) : 0;
        const barWidth = 500 * option.Votes / totalVotes || 0;
        
        svg += `
        <g transform="translate(0 ${yPos})">
            <text class="label" y="20">${escapeXml(option.OptionText)}</text>
            <text class="percentage" x="500" y="20" text-anchor="end">${option.Votes} 票 (${percentage}%)</text>
            
            <rect class="chart-bg" x="0" y="30" width="500" height="20"/>
            <rect class="chart-bar" x="0" y="30" width="${barWidth}" height="20">
                <animate attributeName="width" 
                         from="0" 
                         to="${barWidth}" 
                         dur="0.6s" 
                         fill="freeze" 
                         calcMode="spline" 
                         keySplines="0.25 0.1 0.25 1"/>
            </rect>
        </g>`;
        
        yPos += itemHeight;
    }

    svg += `</g></svg>`;
	// header禁止缓存
	return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
});

// 投票并返回原网页
router.all('/api/vote/:id/voteUrl', async (request,env,ctx) => {
	const { query,params } =request
	// 防止image
	if(request.headers.get('accept').indexOf('html') == -1){
		let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
		<text x="25" y="25" font-size="20" text-anchor="middle">哎嘿</text>
		</svg>`;
		return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
	}

	const token = query['cf-turnstile-response']
	const optionId = query.optionId
	let ip = request.headers.get('cf-connecting-ip');
	if (!ip){
		ip='1.1.1.1'
	}

	// 如果是get请求，返回html
	if (!token) {
		// 验证码
		return new Response(`<!DOCTYPE html>
		<html lang="zh-CN">
		<head>
			<meta charset="UTF-8">
			<title>验证码</title>
			<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
			<script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4.6.1/dist/fp.min.js"></script>
		</head>
		<body>
		<center>
			<h1>投票验证码</h1>
			<form action="/api/vote/${params.id}/voteUrl?optionId=${query.optionId} method="get">
				<input type="hidden" name="optionId" value="${query.optionId}">
				<div class="cf-turnstile" data-sitekey="0x4xxxxxxx"></div>
				<input id="fingerprint" type="hidden" name="fingerprint">
				<input type="submit" value="继续投票">
			</form>
		</center>
		<script>
			const fpPromise = FingerprintJS.load()
			fpPromise
				.then(fp => fp.get())
				.then(result => {
					document.getElementById('fingerprint').value = result.visitorId
				})
		</script>
		</body>
		</html>`, { headers: { 'Content-Type': 'text/html' } });
	}

	const verifyResult = await checkVerifyCode(token,ip);
	if (!verifyResult.success) {
		return new Response(`<!DOCTYPE html>
		<html lang="zh-CN">
		<head>
			<meta charset="UTF-8">
			<title>验证码</title>
			<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>
			<script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4.6.1/dist/fp.min.js"></script>
		</head>
		<body>
		<center>
			<h1>验证码错误请重试</h1>
			<form action="/api/vote/${params.id}/voteUrl?optionId=${query.optionId} method="get">
				<input type="hidden" name="optionId" value="${query.optionId}">
				<div class="cf-turnstile" data-sitekey="0x4xxxxxxx"></div>
				<input id="fingerprint" type="hidden" name="fingerprint">
				<input type="submit" value="继续投票">
			</form>
		</center>
		<script>
			const fpPromise = FingerprintJS.load()
			fpPromise
				.then(fp => fp.get())
				.then(result => {
					document.getElementById('fingerprint').value = result.visitorId
				})
		</script>
		</body>
		</html>`, { headers: { 'Content-Type': 'text/html' } })
	}

	// 检查是否已经投过票
	const fingerprint = query.fingerprint; // 获取前端传递的指纹参数
	// 在检查投票记录时同时验证指纹
	const check = await env.DB.prepare(
		`SELECT * FROM IpVotes 
		WHERE (IpAddress = ? OR Fingerprint = ?)
		AND TopicID = ? 
		AND LastVoteTime > ?`
	)
	.bind(ip, fingerprint, params.id, Date.now() - 3600 * 1000)
	.all();
	// 如果没有投过票，则插入ip，更新数据库
	if (check['results'].length === 0) {
		// 插入ip
        await env.DB.prepare(
            "INSERT INTO IpVotes (IpAddress, TopicID, LastVoteTime, Fingerprint) VALUES (?, ?, ?, ?)"
        )
        .bind(ip, params.id, Date.now(), fingerprint)
        .run();
		// 更新数据库
		await env.DB.prepare(
			"UPDATE Options SET Votes = Votes + 1 WHERE TopicId = ? AND OptionId = ?"
		)
		.bind(params.id,query.optionId)
		.all();
		// 返回html,提示投票成功，并且三秒后关闭当前页面
	return new Response(`<!DOCTYPE html>
		<html lang="zh-CN">
		<head>
			<meta charset="UTF-8">
			<title>投票成功</title>
		</head>
		<body>
		<center>
			<h1>投票成功,5秒内自动关闭本页面</h1>
			<a href="https://vote-svg.qytest.workers.dev/">发起投票</a>
			<script>
				setTimeout(function(){
					window.close();
				},5000);
			</script>
		</center>
		</body>
		</html>`, { headers: { 'Content-Type': 'text/html' } });
	} else {
		// 如果已经投过票，且距离上次投票时间小于1小时，则返回错误
		return new Response(`<!DOCTYPE html>
		<html lang="zh-CN">
		<head>
			<meta charset="UTF-8">
			<title>投票失败</title>
		</head>
		<body>
		<center>
			<h1>投票失败,是不是已经参与过投票了呢</h1>
			<a href="https://vote-svg.qytest.workers.dev/">发起投票</a>
			<script>
				setTimeout(function(){
					window.close();
				},3000);
			</script>
		</center>
		</body>
		</html>`, { headers: { 'Content-Type': 'text/html' } });
	}
});

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
