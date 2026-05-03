export default async (request, context) => {
  const upgrade = request.headers.get("upgrade") || "";
  
  // معالجة اتصالات V2Ray (WebSocket)
  if (upgrade.toLowerCase() === "websocket") {
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(request);
    
    const targetUrl = new URL(request.url);
    targetUrl.hostname = "wathfor.alwaysdata.net";
    targetUrl.port = "443";
    targetUrl.protocol = "wss:";
    
    const targetSocket = new WebSocket(targetUrl.toString());

    let messageQueue = [];
    
    targetSocket.onopen = () => {
      while (messageQueue.length > 0) {
        targetSocket.send(messageQueue.shift());
      }
    };

    clientSocket.onmessage = (e) => {
      if (targetSocket.readyState === 1) {
        targetSocket.send(e.data);
      } else {
        messageQueue.push(e.data);
      }
    };
    
    targetSocket.onmessage = (e) => {
      if (clientSocket.readyState === 1) {
        clientSocket.send(e.data);
      }
    };

    clientSocket.onclose = () => targetSocket.close();
    targetSocket.onclose = () => clientSocket.close();
    
    return response;
  }

  // معالجة الطلبات العادية (HTTP)
  const url = new URL(request.url);
  url.hostname = "wathfor.alwaysdata.net";
  url.protocol = "https:";
  
  const headers = new Headers(request.headers);
  headers.set("Host", "wathfor.alwaysdata.net");
  
  const newReq = new Request(url.toString(), {
    method: request.method,
    headers: headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
    redirect: "manual",
  });
  
  try {
    return await fetch(newReq);
  } catch (err) {
    return new Response("Proxy Error", { status: 502 });
  }
};
