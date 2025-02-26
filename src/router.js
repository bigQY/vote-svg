import { Router } from 'itty-router';
import { checkVerifyCode } from './utils';

// now let's create a router (note the lack of "new")
const router = Router();

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
	let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="${140 + 40 * result.options.length +20}">
	<rect width="500" height="${140 + 40 * result.options.length + 20}" style="fill:rgb(255,255,255);stroke-width:3;stroke:rgb(0,0,0)" />
	<!-- 投票结果 -->
  <text x="250" y="50" font-size="20" text-anchor="middle">投票结果</text>
	`
	if (result.topic[0]['Title'].length > 23) {
		svg +=
		`
		<text x="250" y="80" font-size="10" text-anchor="middle">${result.topic[0]['Title']}</text>
		`
	} else {
		svg +=
		`
		<text x="250" y="80" font-size="20" text-anchor="middle">${result.topic[0]['Title']}</text>
		`
	}
	for (const option of result.options) {
		svg +=
		`<text x="100" y="${startY}" font-size="18">${option['OptionText']}: ${option['Votes']} 票</text>
		<rect x="100" y="${startY+10}" width="${300*option['Votes']/totalVotes}" height="12" style="fill:rgb(255,0,0)" />
		`;
		startY += stepY;
	}
	svg +=
  `</svg>`;
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
		</head>
		<body>
		<center>
			<h1>投票验证码</h1>
			<form action="/api/vote/${params.id}/voteUrl?optionId=${query.optionId} method="get">
				<input type="hidden" name="optionId" value="${query.optionId}">
				<div class="cf-turnstile" data-sitekey="0x4xxxxxxx"></div>
				<input type="submit" value="继续投票">
			</form>
		</center>
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
		</head>
		<body>
		<center>
			<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>
			<h1>验证码错误请重试</h1>
			<form action="/api/vote/${params.id}/voteUrl?optionId=${query.optionId} method="get">
				<input type="hidden" name="optionId" value="${query.optionId}">
				<div class="cf-turnstile" data-sitekey="0x4xxxxxxxx"></div>
				<input type="submit" value="继续投票">
			</form>
		</center>
		</body>
		</html>`, { headers: { 'Content-Type': 'text/html' } })
	}

	// 检查是否已经投过票
	const check = await env.DB.prepare(
		"SELECT * FROM IpVotes WHERE IpAddress = ? AND TopicID = ?"
	)
	.bind(ip,params.id)
	.all();
	// 如果已经投过票，且距离上次投票时间小于1小时，则返回错误
	// ip未出现过
	if (check['results'].length === 0) {
		// 插入ip
		await env.DB.prepare(
			"INSERT INTO IpVotes (IpAddress, TopicID, LastVoteTime) VALUES (?, ?, ?)"
		)
		.bind(ip,params.id,new Date().getTime())
		.run();
	} else if (check['results'][0] && check['results'][0]['LastVoteTime'] &&
	 check['results'][0]['LastVoteTime'] + 360000000 > new Date().getTime()) {
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
	} else {
		// 已经投过票，但是距离上次投票时间大于1小时，更新数据库
		await env.DB.prepare(
			"UPDATE IpVotes SET LastVoteTime = ? WHERE IpAddress = ? AND TopicID = ?"
		)
		.bind(new Date().getTime(),ip,params.id)
		.run();
	}
	// 投票
	const options = await env.DB.prepare(
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
		<h1>投票成功,3秒内自动关闭本页面</h1>
		<a href="https://vote-svg.qytest.workers.dev/">发起投票</a>
		<script>
			setTimeout(function(){
				window.close();
			},3000);
		</script>
	</center>
	</body>
	</html>`, { headers: { 'Content-Type': 'text/html' } });
});

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
