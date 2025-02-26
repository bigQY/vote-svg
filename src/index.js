import apiRouter from './router';
import { getAssetFromKV, NotFoundError, MethodNotAllowedError } from '@cloudflare/kv-asset-handler'
import manifestJSON from '__STATIC_CONTENT_MANIFEST'
const assetManifest = JSON.parse(manifestJSON);

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname.startsWith('/api/')) {
			return apiRouter.handle(request, env, ctx);
		}
		try {
			return await getAssetFromKV(
				{
					request,
					waitUntil(promise) {
						return ctx.waitUntil(promise)
					},
				},
				{
					ASSET_NAMESPACE: env.__STATIC_CONTENT,
					ASSET_MANIFEST: assetManifest,
				},
			)
		} catch (e) {
			if (e instanceof NotFoundError) {
				// 重定向到根目录
				return new Response('', { status: 302, headers: { 'Location': '/' } })
			} else if (e instanceof MethodNotAllowedError) {
				return new Response('The method was not allowed.', { status: 405 })
			} else {
				return new Response('An unexpected error occurred', { status: 500 })
			}
		}

	},
};
