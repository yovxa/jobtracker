const API_URL = "https://joblio-dhu6.onrender.com";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  const targetUrl = new URL(API_URL);
  targetUrl.pathname = url.pathname;
  targetUrl.search = url.search;

  const request = new Request(targetUrl.toString(), context.request);

  return fetch(request);
}